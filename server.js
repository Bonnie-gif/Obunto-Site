const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- CONEXÃO MONGODB ---
const MONGO_URI = process.env.MONGO_URI;
const connectDB = async () => {
    if (!MONGO_URI) return console.log("⚠️ MONGO_URI OFF - MODO MEMÓRIA (Dados serão perdidos ao reiniciar)");
    try { 
        await mongoose.connect(MONGO_URI); 
        console.log("✅ DB ONLINE"); 
    } catch (err) { 
        console.error("❌ DB ERROR:", err.message); 
        setTimeout(connectDB, 5000); 
    }
};
connectDB();

// --- SCHEMAS ---
const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
    frozen: { type: Boolean, default: false }
});
const User = mongoose.model('User', UserSchema);

// --- ESTADO GLOBAL ---
const activeSessions = new Map();
const USER_CACHE = {}; // Cache para economizar API do Roblox
const TSC_GROUPS = {
    11649027: "ADMINISTRATION", 12026513: "MEDICAL_DEPT", 11577231: "INTERNAL_SECURITY",
    14159717: "INTELLIGENCE", 12026669: "SCIENCE_DIV", 12045419: "ENGINEERING", 12022092: "LOGISTICS"
};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.send('SYSTEM_OPERATIONAL'));

// --- LOGIN DIRETO (SEM SENHA) ---
app.post('/api/login', async (req, res) => {
    const { userId } = req.body;

    // 1. ADMIN MASTER (000)
    if (userId === "000") {
        return res.json({ 
            success: true, 
            userData: { id: "000", username: "OBUNTO_CORE", rank: "MASTER_ADMIN", clearance: "OMEGA", avatar: "obunto/normal.png", isAdmin: true } 
        });
    }

    try {
        // 2. Busca ou Cria no Banco
        let user = await User.findOne({ userId });
        
        if (!user) {
            // Cria novo usuário automaticamente
            user = new User({ userId });
            await user.save();
            io.to('admins').emit('new_registration', { userId });
        } else {
            // Checa bloqueio
            if (user.frozen) return res.status(403).json({ success: false, message: "ACCOUNT_FROZEN" });
        }

        // 3. Obtém dados do Perfil (Roblox ou Cache)
        let profileData = USER_CACHE[userId]?.data;
        
        // Se não tem no cache ou cache velho (>10min), busca na API
        if (!profileData || (Date.now() - USER_CACHE[userId].timestamp > 600000)) {
            try {
                // Tenta pegar dados reais
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
            } catch (apiError) {
                // Se der erro na API (ex: ID fake), cria um perfil básico
                console.log(`API Error for ${userId}: using fallback.`);
                profileData = {
                    id: userId,
                    username: `User_${userId}`,
                    dept: "UNREGISTERED",
                    rank: "APPLICANT",
                    avatar: "assets/icon-large-owner_info-28x14.png", // Fallback asset
                    affiliations: [],
                    isAdmin: false
                };
            }
            // Salva no cache
            USER_CACHE[userId] = { timestamp: Date.now(), data: profileData };
        }

        res.json({ success: true, userData: profileData });

    } catch (e) {
        console.error("Login Error:", e);
        res.status(500).json({ success: false, message: "SERVER ERROR" });
    }
});

// --- SISTEMA EM TEMPO REAL (SOCKET.IO) ---
io.on('connection', (socket) => {
    let session = null;

    // Admin entra
    socket.on('admin_login', () => {
        socket.join('admins');
        pushUserListToAdmin();
    });

    // Usuário entra
    socket.on('user_login', (data) => {
        session = { ...data, socketId: socket.id };
        activeSessions.set(socket.id, session);
        pushUserListToAdmin();
    });

    // Atualização forçada da lista
    socket.on('admin_refresh_list', pushUserListToAdmin);

    async function pushUserListToAdmin() {
        try {
            // Pega todos do banco
            const allUsers = await User.find({}, 'userId frozen');
            
            // Cruza dados do banco com dados online
            const list = allUsers.map(u => {
                const onlineData = Array.from(activeSessions.values()).find(s => s.id === u.userId);
                const cacheData = USER_CACHE[u.userId]?.data;
                
                return {
                    id: u.userId,
                    username: onlineData?.username || cacheData?.username || "Offline User",
                    frozen: u.frozen,
                    online: !!onlineData,
                    socketId: onlineData?.socketId
                };
            });
            io.to('admins').emit('users_list', list);
        } catch (e) { console.error(e); }
    }

    // Comandos de Admin
    socket.on('admin_kick', (id) => {
        const target = Array.from(activeSessions.values()).find(s => s.id === id);
        if (target) {
            io.to(target.socketId).emit('force_disconnect');
            activeSessions.delete(target.socketId);
            pushUserListToAdmin();
        }
    });

    socket.on('admin_freeze', async (id) => {
        await User.findOneAndUpdate({ userId: id }, { frozen: true });
        const target = Array.from(activeSessions.values()).find(s => s.id === id);
        if (target) io.to(target.socketId).emit('account_frozen');
        pushUserListToAdmin();
    });

    socket.on('admin_delete', async (id) => {
        await User.findOneAndDelete({ userId: id });
        delete USER_CACHE[id]; // Limpa cache
        const target = Array.from(activeSessions.values()).find(s => s.id === id);
        if (target) {
            io.to(target.socketId).emit('account_deleted');
            activeSessions.delete(target.socketId);
        }
        pushUserListToAdmin();
    });

    // Broadcast (Mascote)
    socket.on('admin_broadcast', (data) => {
        if (data.target === 'all') io.emit('receive_mascot_msg', data);
        else {
            const target = Array.from(activeSessions.values()).find(s => s.id === data.target);
            if (target) io.to(target.socketId).emit('receive_mascot_msg', data);
        }
    });

    // Desconexão
    socket.on('disconnect', () => {
        if (session) {
            activeSessions.delete(socket.id);
            pushUserListToAdmin();
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`SYSTEM ONLINE ON PORT ${PORT}`));