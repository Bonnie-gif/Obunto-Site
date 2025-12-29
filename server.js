const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- 1. CONEXÃO MONGODB (COM TRATAMENTO DE ERRO) ---
const MONGO_URI = process.env.MONGO_URI;
let isDbConnected = false;

const connectDB = async () => {
    if (!MONGO_URI) return console.log("⚠️ AVISO: MONGO_URI não definida. Rodando em Modo Memória.");
    try { 
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 }); 
        isDbConnected = true;
        console.log("✅ DB ONLINE: Conectado ao MongoDB Atlas"); 
    } catch (err) { 
        console.error("❌ DB OFFLINE: " + err.message); 
        console.log("⚠️ SISTEMA RODANDO EM MODO DE EMERGÊNCIA (SEM BANCO)");
        isDbConnected = false;
        // Tenta reconectar em 10s sem travar o servidor
        setTimeout(connectDB, 10000); 
    }
};
connectDB();

// --- SCHEMAS ---
const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
    frozen: { type: Boolean, default: false }
});
let User;
try { User = mongoose.model('User', UserSchema); } catch(e) { User = mongoose.model('User'); }

// --- ESTADO GLOBAL ---
const activeSessions = new Map();
const USER_CACHE = {}; 

const TSC_GROUPS = {
    11649027: "ADMINISTRATION", 12026513: "MEDICAL_DEPT", 11577231: "INTERNAL_SECURITY",
    14159717: "INTELLIGENCE", 12026669: "SCIENCE_DIV", 12045419: "ENGINEERING", 12022092: "LOGISTICS"
};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rota de saúde para o UptimeRobot
app.get('/health', (req, res) => res.send('SYSTEM_OPERATIONAL'));

// --- LOGIN QUE NUNCA FALHA ---
app.post('/api/login', async (req, res) => {
    const { userId } = req.body;
    console.log(`[LOGIN ATTEMPT] ID: ${userId}`);

    // 1. ADMIN MASTER
    if (userId === "000") {
        return res.json({ 
            success: true, 
            userData: { id: "000", username: "OBUNTO_CORE", rank: "MASTER_ADMIN", clearance: "OMEGA", avatar: "obunto/normal.png", isAdmin: true } 
        });
    }

    try {
        // 2. TENTA BANCO DE DADOS (SE ESTIVER ONLINE)
        if (isDbConnected) {
            try {
                let user = await User.findOne({ userId });
                if (!user) {
                    user = new User({ userId });
                    await user.save();
                    io.to('admins').emit('new_registration', { userId });
                    console.log(`[DB] Novo usuário criado: ${userId}`);
                } else if (user.frozen) {
                    return res.status(403).json({ success: false, message: "ACCOUNT_FROZEN" });
                }
            } catch (dbErr) {
                console.error("[DB ERROR] Falha ao consultar banco, ignorando...", dbErr.message);
                // Não retorna erro, continua o login em modo memória
            }
        }

        // 3. TENTA PEGAR DADOS DO ROBLOX
        let profileData = USER_CACHE[userId]?.data;
        
        if (!profileData || (Date.now() - USER_CACHE[userId].timestamp > 600000)) {
            try {
                const userRes = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
                const groupsRes = await axios.get(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
                const thumbRes = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`);
                
                const tscGroups = groupsRes.data.data.filter(g => TSC_GROUPS[g.group.id]);
                const primary = tscGroups.length ? tscGroups.sort((a, b) => b.role.rank - a.role.rank)[0] : { group: {id:0}, role: {name: "CIVILIAN"} };
                
                profileData = {
                    id: userId,
                    username: userRes.data.name,
                    dept: TSC_GROUPS[primary.group.id] || "CIVILIAN",
                    rank: primary.role.name,
                    avatar: thumbRes.data.data[0].imageUrl,
                    affiliations: tscGroups.map(g => ({ name: g.group.name, role: g.role.name })),
                    isAdmin: false
                };
            } catch (apiErr) {
                console.log(`[API FAIL] Roblox API falhou para ${userId}. Usando perfil genérico.`);
                // FALLBACK: Se o Roblox falhar, cria perfil genérico para não travar
                profileData = { 
                    id: userId, 
                    username: `ID_${userId}`, 
                    dept: "UNKNOWN", 
                    rank: "VISITOR", 
                    avatar: "assets/icon-large-person-13x11.png", // Asset genérico da sua lista
                    affiliations: [], 
                    isAdmin: false 
                };
            }
            USER_CACHE[userId] = { timestamp: Date.now(), data: profileData };
        }

        res.json({ success: true, userData: profileData });

    } catch (e) {
        // 4. A REDE DE SEGURANÇA FINAL
        console.error("[CRITICAL ERROR]", e);
        // Se tudo falhar, deixa entrar mesmo assim
        return res.json({ 
            success: true, 
            userData: { id: userId, username: "Survivor", rank: "ERROR_MODE", avatar: "", isAdmin: false } 
        });
    }
});

// --- SOCKETS (COMUNICAÇÃO EM TEMPO REAL) ---
io.on('connection', (socket) => {
    let session = null;

    socket.on('admin_login', () => { socket.join('admins'); refreshAdminList(); });
    socket.on('user_login', (data) => {
        session = { ...data, socketId: socket.id };
        activeSessions.set(socket.id, session);
        refreshAdminList();
    });
    socket.on('admin_refresh_list', refreshAdminList);

    // FUNÇÃO ROBUSTA DE LISTAGEM
    async function refreshAdminList() {
        try {
            let allUsers = [];
            // Tenta pegar do banco
            if (isDbConnected) {
                try { allUsers = await User.find({}, 'userId frozen'); } catch(e) { console.log("Erro ao listar DB"); }
            }
            
            // Mescla com quem está online na memória
            const onlineIds = Array.from(activeSessions.values()).map(s => s.id);
            
            // Cria lista unificada
            const map = new Map();
            
            // Adiciona do Banco
            allUsers.forEach(u => map.set(u.userId, { id: u.userId, frozen: u.frozen, online: false, username: "Offline User" }));
            
            // Adiciona/Atualiza com Online
            activeSessions.forEach(s => {
                const existing = map.get(s.id) || { id: s.id, frozen: false };
                map.set(s.id, { ...existing, username: s.username, online: true, socketId: s.socketId });
            });

            // Tenta pegar nomes do cache para os offline
            map.forEach(u => {
                if (!u.online && USER_CACHE[u.id]) u.username = USER_CACHE[u.id].data.username;
            });

            io.to('admins').emit('users_list', Array.from(map.values()));
        } catch(e) { console.error(e); }
    }

    // AÇÕES DE ADMIN
    socket.on('admin_broadcast', (data) => {
        if (data.target === 'all') io.emit('receive_mascot_msg', data);
        else {
            const t = Array.from(activeSessions.values()).find(s => s.id === data.target);
            if (t) io.to(t.socketId).emit('receive_mascot_msg', data);
        }
    });

    socket.on('admin_kick', (id) => {
        const t = Array.from(activeSessions.values()).find(s => s.id === id);
        if (t) { io.to(t.socketId).emit('force_disconnect'); activeSessions.delete(t.socketId); refreshAdminList(); }
    });

    socket.on('admin_freeze', async (id) => {
        if(isDbConnected) await User.findOneAndUpdate({ userId: id }, { frozen: true });
        const t = Array.from(activeSessions.values()).find(s => s.id === id);
        if (t) io.to(t.socketId).emit('account_frozen');
        refreshAdminList();
    });

    socket.on('admin_delete', async (id) => {
        if(isDbConnected) await User.findOneAndDelete({ userId: id });
        delete USER_CACHE[id];
        const t = Array.from(activeSessions.values()).find(s => s.id === id);
        if (t) { io.to(t.socketId).emit('account_deleted'); activeSessions.delete(t.socketId); }
        refreshAdminList();
    });

    socket.on('disconnect', () => {
        if (session) { activeSessions.delete(socket.id); refreshAdminList(); }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 SERVIDOR BLINDADO ONLINE NA PORTA ${PORT}`));