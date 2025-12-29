const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- CONEXÃO BANCO (Failsafe) ---
const MONGO_URI = process.env.MONGO_URI;
let isDbConnected = false;

const connectDB = async () => {
    if (!MONGO_URI) return console.log("⚠️ MODO MEMÓRIA (SEM BANCO)");
    try { 
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 }); 
        isDbConnected = true;
        console.log("✅ BANCO ONLINE"); 
    } catch (err) { 
        console.log("⚠️ BANCO OFFLINE (SISTEMA SEGUE FUNCIONANDO)");
        setTimeout(connectDB, 10000); 
    }
};
connectDB();

// --- MODELOS ---
const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
    frozen: { type: Boolean, default: false }
});
let User;
try { User = mongoose.model('User', UserSchema); } catch(e) { User = mongoose.model('User'); }

// --- MAPA DE DEPARTAMENTOS TSC ---
const TSC_GROUPS = {
    11649027: "ADMINISTRATION", 
    12026513: "MEDICAL_DEPT", 
    11577231: "INTERNAL_SECURITY",
    14159717: "INTELLIGENCE", 
    12026669: "SCIENCE_DIV", 
    12045419: "ENGINEERING", 
    12022092: "LOGISTICS"
};

const activeSessions = new Map();
const USER_CACHE = {}; 

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- LOGIN COM DETECÇÃO DE RANK ---
app.post('/api/login', async (req, res) => {
    const { userId } = req.body;

    // 1. ADMIN (000)
    if (userId === "000") {
        return res.json({ 
            success: true, 
            userData: { 
                id: "000", 
                username: "OBUNTO_CORE", 
                dept: "MAINFRAME", 
                rank: "MASTER_ADMIN", 
                avatar: "obunto/normal.png", 
                isAdmin: true 
            } 
        });
    }

    try {
        // 2. BANCO DE DADOS
        if (isDbConnected) {
            try {
                let user = await User.findOne({ userId });
                if (!user) {
                    user = new User({ userId });
                    await user.save();
                    io.to('admins').emit('new_registration', { userId });
                } else if (user.frozen) {
                    return res.status(403).json({ success: false, message: "ID FROZEN BY ADMIN" });
                }
            } catch (e) { console.log("DB Skip"); }
        }

        // 3. DADOS ROBLOX (CACHE INTELIGENTE)
        let profile = USER_CACHE[userId]?.data;
        
        if (!profile || (Date.now() - USER_CACHE[userId].timestamp > 300000)) { // 5 min cache
            try {
                // Busca Info Básica
                const userRes = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
                // Busca Grupos/Ranks
                const groupsRes = await axios.get(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
                // Busca Avatar
                const thumbRes = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`);
                
                // LÓGICA DE RANK: Filtra grupos TSC e pega o de maior rank
                const tscGroups = groupsRes.data.data.filter(g => TSC_GROUPS[g.group.id]);
                
                // Ordena por rank (número) decrescente
                const primary = tscGroups.length > 0 
                    ? tscGroups.sort((a, b) => b.role.rank - a.role.rank)[0] 
                    : null;

                const deptName = primary ? TSC_GROUPS[primary.group.id] : "CIVILIAN";
                const rankName = primary ? primary.role.name.toUpperCase() : "UNAUTHORIZED";
                
                profile = {
                    id: userId,
                    username: userRes.data.name,
                    dept: deptName,
                    rank: rankName,
                    avatar: thumbRes.data.data[0].imageUrl,
                    isAdmin: false
                };
            } catch (apiErr) {
                console.log(`Erro API Roblox: ${apiErr.message}`);
                // Fallback Seguro
                profile = {
                    id: userId,
                    username: `ID_${userId}`,
                    dept: "UNKNOWN",
                    rank: "CONNECTION_ERROR",
                    avatar: "assets/icon-large-owner_info-28x14.png",
                    isAdmin: false
                };
            }
            USER_CACHE[userId] = { timestamp: Date.now(), data: profile };
        }

        res.json({ success: true, userData: profile });

    } catch (e) {
        console.error("Critical:", e);
        res.json({ success: false, message: "SYSTEM FAILURE" });
    }
});

// --- SOCKETS (Mantidos iguais para admin) ---
io.on('connection', (socket) => {
    let session = null;

    socket.on('admin_login', () => { socket.join('admins'); sendList(); });
    socket.on('user_login', (data) => {
        session = { ...data, socketId: socket.id };
        activeSessions.set(socket.id, session);
        sendList();
    });
    socket.on('admin_refresh', sendList);

    async function sendList() {
        try {
            let allUsers = [];
            if(isDbConnected) try { allUsers = await User.find({}); } catch(e){}
            const list = allUsers.map(u => {
                const online = Array.from(activeSessions.values()).find(s => s.id === u.userId);
                const cached = USER_CACHE[u.userId]?.data;
                return {
                    id: u.userId,
                    username: online?.username || cached?.username || "Unknown",
                    dept: online?.dept || cached?.dept || "---", // Mostra depto no admin
                    frozen: u.frozen,
                    online: !!online,
                    socketId: online?.socketId
                };
            });
            io.to('admins').emit('users_list', list);
        } catch(e) {}
    }

    socket.on('admin_kick', (id) => {
        const t = Array.from(activeSessions.values()).find(s => s.id === id);
        if(t) { io.to(t.socketId).emit('force_disconnect'); activeSessions.delete(t.socketId); sendList(); }
    });
    socket.on('admin_freeze', async (id) => {
        if(isDbConnected) await User.findOneAndUpdate({ userId: id }, { frozen: true });
        const t = Array.from(activeSessions.values()).find(s => s.id === id);
        if(t) io.to(t.socketId).emit('account_frozen');
        sendList();
    });
    socket.on('admin_delete', async (id) => {
        if(isDbConnected) await User.findOneAndDelete({ userId: id });
        delete USER_CACHE[id];
        const t = Array.from(activeSessions.values()).find(s => s.id === id);
        if(t) { io.to(t.socketId).emit('account_deleted'); activeSessions.delete(t.socketId); }
        sendList();
    });
    socket.on('admin_broadcast', (data) => {
        if(data.target === 'all') io.emit('receive_mascot', data);
        else {
            const t = Array.from(activeSessions.values()).find(s => s.id === data.target);
            if(t) io.to(t.socketId).emit('receive_mascot', data);
        }
    });
    socket.on('disconnect', () => { if(session) { activeSessions.delete(socket.id); sendList(); } });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`SYSTEM ONLINE :${PORT}`));