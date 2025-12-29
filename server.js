const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.json());

// 1. SERVIR ARQUIVOS ESTÁTICOS (O SITE)
// Diz ao servidor que a pasta 'public' contém o site
app.use(express.static(path.join(__dirname, 'public')));

// --- CONEXÃO BANCO ---
const MONGO_URI = process.env.MONGO_URI;
let isDbConnected = false;

const connectDB = async () => {
    if (!MONGO_URI) return console.log("⚠️ MODO SEM BANCO (MEMÓRIA)");
    try { 
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 }); 
        isDbConnected = true;
        console.log("✅ BANCO CONECTADO"); 
    } catch (err) { 
        console.log("⚠️ ERRO BANCO - MODO OFFLINE");
        setTimeout(connectDB, 10000); 
    }
};
connectDB();

// --- MODELOS ---
const UserSchema = new mongoose.Schema({
    userId: { type: String, unique: true },
    createdAt: { type: Date, default: Date.now },
    frozen: { type: Boolean, default: false }
});
let User;
try { User = mongoose.model('User', UserSchema); } catch(e) { User = mongoose.model('User'); }

// --- MAPA TSC ---
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

// --- ROTA DE LOGIN ---
app.post('/api/login', async (req, res) => {
    const { userId } = req.body;

    // Admin Master
    if (userId === "000") {
        return res.json({ 
            success: true, 
            userData: { 
                id: "000", 
                username: "SYS_ADMIN", 
                dept: "MAINFRAME", 
                rank: "OMEGA", 
                avatar: "https://tr.rbxcdn.com/30day-avatar-headshot/png", 
                isAdmin: true 
            } 
        });
    }

    try {
        // Verifica Banco
        if (isDbConnected) {
            try {
                let user = await User.findOne({ userId });
                if (!user) {
                    user = new User({ userId });
                    await user.save();
                    io.to('admins').emit('new_registration', { userId });
                } else if (user.frozen) {
                    return res.status(403).json({ success: false, message: "ACCOUNT FROZEN" });
                }
            } catch (e) {}
        }

        // Verifica Cache ou Roblox
        let profile = USER_CACHE[userId]?.data;
        
        if (!profile || (Date.now() - USER_CACHE[userId].timestamp > 300000)) {
            try {
                const [userRes, groupsRes, thumbRes] = await Promise.all([
                    axios.get(`https://users.roblox.com/v1/users/${userId}`),
                    axios.get(`https://groups.roblox.com/v2/users/${userId}/groups/roles`),
                    axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`)
                ]);

                // Lógica de Rank Real
                const tscGroups = groupsRes.data.data.filter(g => TSC_GROUPS[g.group.id]);
                const primary = tscGroups.length > 0 ? tscGroups.sort((a, b) => b.role.rank - a.role.rank)[0] : null;

                profile = {
                    id: userId,
                    username: userRes.data.name,
                    dept: primary ? TSC_GROUPS[primary.group.id] : "CIVILIAN",
                    rank: primary ? primary.role.name.toUpperCase() : "N/A",
                    avatar: thumbRes.data.data[0].imageUrl,
                    isAdmin: false
                };
            } catch (apiErr) {
                // Fallback se a API falhar
                profile = {
                    id: userId,
                    username: `ID_${userId}`,
                    dept: "UNKNOWN",
                    rank: "ERROR",
                    avatar: "",
                    isAdmin: false
                };
            }
            USER_CACHE[userId] = { timestamp: Date.now(), data: profile };
        }

        res.json({ success: true, userData: profile });

    } catch (e) {
        res.status(500).json({ success: false, message: "SYSTEM ERROR" });
    }
});

// --- SOCKETS ---
io.on('connection', (socket) => {
    socket.on('admin_login', () => { socket.join('admins'); sendList(); });
    
    socket.on('user_login', (data) => {
        activeSessions.set(socket.id, data);
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
                    username: online?.username || cached?.username || "Offline",
                    dept: online?.dept || cached?.dept || "---",
                    frozen: u.frozen,
                    online: !!online,
                    socketId: online?.socketId
                };
            });
            io.to('admins').emit('users_list', list);
        } catch(e) {}
    }

    // Ações de Admin
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

    socket.on('disconnect', () => {
        activeSessions.delete(socket.id);
        sendList();
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`WEB SERVER ONLINE :${PORT}`));