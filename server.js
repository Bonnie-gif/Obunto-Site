const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- CONEXÃO BANCO ---
const MONGO_URI = process.env.MONGO_URI;
const connectDB = async () => {
    if (!MONGO_URI) return console.log("⚠️ MONGO_URI OFF");
    try { await mongoose.connect(MONGO_URI); console.log("✅ DB ONLINE"); } 
    catch (err) { console.error("❌ DB ERROR:", err); setTimeout(connectDB, 5000); }
};
connectDB();

// --- MODELOS ---
const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    frozen: { type: Boolean, default: false }
});
const User = mongoose.model('User', UserSchema);

const ActivityLogSchema = new mongoose.Schema({
    userId: String, username: String, action: String, details: String, timestamp: { type: Date, default: Date.now }
});
const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);

// --- ESTADO ---
const activeSessions = new Map();
const USER_CACHE = {};
const TSC_GROUPS = {
    11649027: "ADMINISTRATION", 12026513: "MEDICAL_DEPT", 11577231: "INTERNAL_SECURITY",
    14159717: "INTELLIGENCE", 12026669: "SCIENCE_DIV", 12045419: "ENGINEERING", 12022092: "LOGISTICS"
};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (req, res) => res.send('OK'));

// LOGIN
app.post('/api/login', async (req, res) => {
    const { userId, password } = req.body;
    if (userId === "000" && password === "TSC-OMEGA") {
        return res.json({ success: true, userData: { id: "000", username: "OBUNTO_CORE", rank: "MASTER_ADMIN", clearance: "OMEGA", avatar: "obunto/normal.png", isAdmin: true } });
    }
    try {
        const user = await User.findOne({ userId });
        if (!user) return res.status(404).json({ success: false, message: "NO_USER" });
        if (user.frozen) return res.status(403).json({ success: false, message: "ACCOUNT_FROZEN" });
        if (!(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ success: false, message: "WRONG_PASS" });

        // Recupera dados
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
                // Fallback se a API do Roblox falhar
                profileData = { id: userId, username: "Unknown", dept: "N/A", rank: "N/A", avatar: "", affiliations: [], isAdmin: false };
            }
            USER_CACHE[userId] = { timestamp: Date.now(), data: profileData };
        }

        await new ActivityLog({ userId, username: profileData.username, action: 'LOGIN' }).save();
        res.json({ success: true, userData: profileData });
    } catch (e) { console.error(e); res.status(500).json({ success: false }); }
});

// REGISTRO
app.post('/api/register', async (req, res) => {
    const { userId, password } = req.body;
    try {
        if (await User.findOne({ userId })) return res.status(400).json({ success: false, message: "ID_TAKEN" });
        await new User({ userId, passwordHash: await bcrypt.hash(password, 10) }).save();
        io.to('admins').emit('new_registration', { userId });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/check-user', async (req, res) => {
    if (req.body.userId === "000") return res.json({ registered: true });
    try { res.json({ registered: !!(await User.findOne({ userId: req.body.userId })) }); } 
    catch (e) { res.status(500).json({}); }
});

// --- ROTAS DE EMERGÊNCIA (FORCE DELETE) ---

// 1. Ver quem é esse usuário no banco de verdade
app.get('/debug/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const user = await User.findOne({ userId: id });
        const cache = USER_CACHE[id] ? "SIM" : "NÃO";
        
        if (user) {
            res.send(`
                <h1>ENCONTRADO: ${id}</h1>
                <p><b>ID no Banco:</b> ${user._id}</p>
                <p><b>Frozen:</b> ${user.frozen}</p>
                <p><b>Está no Cache (Memória):</b> ${cache}</p>
                <br>
                <a href="/nuke/${id}"><button style="background:red; color:white; padding:20px;">FORÇAR DELETAR AGORA</button></a>
            `);
        } else {
            res.send(`<h1>NÃO ENCONTRADO: ${id}</h1><p>Esse ID não existe no Banco de Dados.</p>`);
        }
    } catch (e) { res.send("Erro: " + e.message); }
});

// 2. O botão nuclear (Apaga do Banco E da Memória)
app.get('/nuke/:id', async (req, res) => {
    try {
        const id = req.params.id;
        
        // Apaga do MongoDB
        const result = await User.deleteMany({ userId: id });
        
        // Apaga da Memória RAM (Cache)
        delete USER_CACHE[id];
        
        // Derruba a conexão se estiver online
        const target = Array.from(activeSessions.values()).find(s => s.id === id);
        if(target) {
            const socket = io.sockets.sockets.get(target.socketId);
            if(socket) socket.disconnect(true);
            activeSessions.delete(target.socketId);
        }

        res.send(`
            <h1>EXTERMINADO: ${id}</h1>
            <p>Registros apagados do banco: ${result.deletedCount}</p>
            <p>Memória limpa.</p>
            <p>Usuário desconectado.</p>
            <br>
            <a href="/">VOLTAR PARA HOME</a>
        `);
    } catch (e) { res.send("Erro ao deletar: " + e.message); }
});

// 3. Limpar TUDO (Reset de Fábrica - CUIDADO)
app.get('/reset-all-users-danger', async (req, res) => {
    try {
        await User.deleteMany({}); // Apaga TODOS os usuários
        for (let k in USER_CACHE) delete USER_CACHE[k];
        activeSessions.clear();
        
        res.send("<h1>SISTEMA FORMATADO. TODOS OS USUÁRIOS FORAM APAGADOS.</h1>");
    } catch(e) { res.send(e.message); }
});

// --- SOCKET.IO ---
io.on('connection', (socket) => {
    let session = null;

    socket.on('admin_login', () => {
        socket.join('admins');
        sendAllUsersToAdmin();
    });

    socket.on('user_login', (data) => {
        session = { ...data, socketId: socket.id };
        activeSessions.set(socket.id, session);
        sendAllUsersToAdmin();
    });

    socket.on('admin_refresh_list', sendAllUsersToAdmin);

    async function sendAllUsersToAdmin() {
        try {
            const allDbUsers = await User.find({}, 'userId frozen createdAt');
            
            // Mapeia usuários do DB + Memória
            const fullList = allDbUsers.map(dbUser => {
                const onlineSession = Array.from(activeSessions.values()).find(s => s.id === dbUser.userId);
                const cacheData = USER_CACHE[dbUser.userId]?.data;
                return {
                    id: dbUser.userId,
                    username: onlineSession?.username || cacheData?.username || "Unknown (Offline)",
                    frozen: dbUser.frozen,
                    online: !!onlineSession,
                    socketId: onlineSession?.socketId
                };
            });
            
            io.to('admins').emit('users_list', fullList);
        } catch(e) { console.error("Error fetching users:", e); }
    }

    socket.on('admin_broadcast', (data) => {
        if (data.target === 'all') {
            io.emit('receive_mascot_msg', data);
        } else {
            const target = Array.from(activeSessions.values()).find(s => s.id === data.target);
            if (target) {
                io.to(target.socketId).emit('receive_mascot_msg', data);
            }
        }
    });

    // --- AÇÕES DO ADMIN (COM LOGS) ---

    socket.on('admin_kick', (id) => {
        console.log(`🔨 ADMIN KICK: ${id}`);
        const target = Array.from(activeSessions.values()).find(s => s.id === id);
        if (target) {
            io.to(target.socketId).emit('force_disconnect');
            activeSessions.delete(target.socketId);
            sendAllUsersToAdmin();
        }
    });

    socket.on('admin_freeze', async (id) => {
        console.log(`🧊 ADMIN FREEZE: ${id}`);
        try {
            await User.findOneAndUpdate({ userId: id }, { frozen: true });
            const target = Array.from(activeSessions.values()).find(s => s.id === id);
            if (target) io.to(target.socketId).emit('account_frozen');
            sendAllUsersToAdmin();
        } catch (e) { console.error("Freeze Error:", e); }
    });

    socket.on('admin_delete', async (id) => {
        console.log(`🗑️ ADMIN DELETE ATTEMPT: [${id}]`);
        
        try {
            // 1. Apaga do Banco de Dados
            const deletedUser = await User.findOneAndDelete({ userId: id });
            
            if (deletedUser) {
                console.log(`✅ DB DELETE SUCCESS: ${id}`);
            } else {
                console.log(`⚠️ DB DELETE WARN: User ${id} not found in DB (maybe only in memory?)`);
            }

            // 2. Apaga da Memória (Kick)
            const targetSocket = Array.from(activeSessions.values()).find(s => s.id === id);
            if (targetSocket) {
                console.log(`🔌 KICKING SOCKET: ${targetSocket.socketId}`);
                io.to(targetSocket.socketId).emit('account_deleted');
                activeSessions.delete(targetSocket.socketId);
            }

            // 3. Limpa Cache
            delete USER_CACHE[id];

            // 4. Atualiza a lista do Admin
            sendAllUsersToAdmin();

        } catch (e) {
            console.error("❌ DELETE CRITICAL ERROR:", e);
        }
    });

    socket.on('disconnect', () => {
        if (session) {
            activeSessions.delete(socket.id);
            sendAllUsersToAdmin();
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`SYSTEM ONLINE :${PORT}`));