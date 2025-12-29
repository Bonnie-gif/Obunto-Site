const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- CONEXÃO BANCO (OPCIONAL/RESILIENTE) ---
const MONGO_URI = process.env.MONGO_URI;
let isDbConnected = false;

const connectDB = async () => {
    if (!MONGO_URI) return console.log("⚠️ MODO SEM BANCO (MEMÓRIA APENAS)");
    try { 
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 }); 
        isDbConnected = true;
        console.log("✅ BANCO CONECTADO"); 
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

// --- DADOS ---
const activeSessions = new Map();
const USER_CACHE = {}; 

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- LOGIN (SEM SENHA & SEM ERRO) ---
app.post('/api/login', async (req, res) => {
    const { userId } = req.body;

    // 1. ADMIN (000)
    if (userId === "000") {
        return res.json({ 
            success: true, 
            userData: { id: "000", username: "OBUNTO_CORE", rank: "SYS_ADMIN", avatar: "obunto/normal.png", isAdmin: true } 
        });
    }

    try {
        // 2. BANCO DE DADOS (Se disponível)
        if (isDbConnected) {
            try {
                let user = await User.findOne({ userId });
                if (!user) {
                    user = new User({ userId });
                    await user.save();
                    io.to('admins').emit('new_registration', { userId });
                } else if (user.frozen) {
                    return res.status(403).json({ success: false, message: "CONTA CONGELADA" });
                }
            } catch (e) { console.log("Erro DB ignorado no login"); }
        }

        // 3. DADOS DO PERFIL (Com Fallback)
        let profile = USER_CACHE[userId];
        
        if (!profile) {
            try {
                // Tenta Roblox API
                const userRes = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
                const thumbRes = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`);
                
                profile = {
                    id: userId,
                    username: userRes.data.name,
                    rank: "OPERATOR", // Simplificado
                    avatar: thumbRes.data.data[0].imageUrl,
                    isAdmin: false
                };
            } catch (apiErr) {
                // SE A API FALHAR, USA DADOS GENÉRICOS (NÃO TRAVA)
                console.log(`API falhou para ${userId}, usando genérico.`);
                profile = {
                    id: userId,
                    username: `USER_${userId}`,
                    rank: "UNKNOWN",
                    avatar: "assets/icon-large-owner_info-28x14.png", // Ícone padrão
                    isAdmin: false
                };
            }
            USER_CACHE[userId] = profile;
        }

        res.json({ success: true, userData: profile });

    } catch (e) {
        console.error("Critical Login Error:", e);
        // Login de emergência
        res.json({ success: true, userData: { id: userId, username: "Survivor", rank: "ERROR_MODE", avatar: "", isAdmin: false } });
    }
});

// --- SOCKETS ---
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
            
            // Combina DB + Online
            const list = allUsers.map(u => {
                const online = Array.from(activeSessions.values()).find(s => s.id === u.userId);
                const cached = USER_CACHE[u.userId];
                return {
                    id: u.userId,
                    username: online?.username || cached?.username || "Offline",
                    frozen: u.frozen,
                    online: !!online,
                    socketId: online?.socketId
                };
            });
            io.to('admins').emit('users_list', list);
        } catch(e) { console.error(e); }
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

    socket.on('disconnect', () => {
        if(session) { activeSessions.delete(socket.id); sendList(); }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`ONLINE :${PORT}`));