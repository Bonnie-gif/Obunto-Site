const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- CONEXÃO BANCO ---
const MONGO_URI = process.env.MONGO_URI;
const connectDB = async () => {
    if (!MONGO_URI) return console.log("MONGO_URI OFF");
    try { await mongoose.connect(MONGO_URI); console.log("DB ONLINE"); } 
    catch (err) { setTimeout(connectDB, 5000); }
};
connectDB();

// --- MODELOS (SEM SENHA) ---
const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
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

// --- LOGIN SIMPLIFICADO (SEM SENHA) ---
app.post('/api/login', async (req, res) => {
    const { userId } = req.body;

    // 1. ACESSO MESTRE (000)
    if (userId === "000") {
        return res.json({ 
            success: true, 
            userData: { id: "000", username: "OBUNTO_CORE", rank: "MASTER_ADMIN", clearance: "OMEGA", avatar: "obunto/normal.png", isAdmin: true } 
        });
    }

    try {
        // 2. Verifica/Cria Usuário no Banco
        let user = await User.findOne({ userId });
        
        if (!user) {
            // Se não existe, CRIA AUTOMATICAMENTE
            user = new User({ userId });
            await user.save();
            io.to('admins').emit('new_registration', { userId });
        } else {
            // Se existe, checa se está congelado
            if (user.frozen) return res.status(403).json({ success: false, message: "ACCOUNT_FROZEN" });
        }

        // 3. Pega dados do Roblox (Cache ou API)
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
                // Se der erro na API do Roblox, loga mesmo assim com dados básicos
                profileData = { id: userId, username: `User_${userId}`, dept: "UNKNOWN", rank: "N/A", avatar: "", affiliations: [], isAdmin: false };
            }
            USER_CACHE[userId] = { timestamp: Date.now(), data: profileData };
        }

        await new ActivityLog({ userId, username: profileData.username, action: 'LOGIN' }).save();
        res.json({ success: true, userData: profileData });

    } catch (e) { 
        console.error(e); 
        res.status(500).json({ success: false, message: "SERVER ERROR" }); 
    }
});

// --- SOCKET.IO ---
io.on('connection', (socket) => {
    let session = null;

    socket.on('admin_login', () => { socket.join('admins'); sendAllUsersToAdmin(); });

    socket.on('user_login', (data) => {
        session = { ...data, socketId: socket.id };
        activeSessions.set(socket.id, session);
        sendAllUsersToAdmin();
    });

    socket.on('admin_refresh_list', sendAllUsersToAdmin);

    async function sendAllUsersToAdmin() {
        try {
            const allDbUsers = await User.find({}, 'userId frozen createdAt');
            const fullList = allDbUsers.map(dbUser => {
                const onlineSession = Array.from(activeSessions.values()).find(s => s.id === dbUser.userId);
                const cacheData = USER_CACHE[dbUser.userId]?.data;
                return {
                    id: dbUser.userId,
                    username: onlineSession?.username || cacheData?.username || "Offline User",
                    frozen: dbUser.frozen,
                    online: !!onlineSession,
                    socketId: onlineSession?.socketId
                };
            });
            io.to('admins').emit('users_list', fullList);
        } catch(e) { console.error(e); }
    }

    socket.on('admin_broadcast', (data) => {
        if (data.target === 'all') io.emit('receive_mascot_msg', data);
        else {
            const target = Array.from(activeSessions.values()).find(s => s.id === data.target);
            if (target) io.to(target.socketId).emit('receive_mascot_msg', data);
        }
    });

    socket.on('admin_kick', (id) => {
        const target = Array.from(activeSessions.values()).find(s => s.id === id);
        if (target) { io.to(target.socketId).emit('force_disconnect'); activeSessions.delete(target.socketId); sendAllUsersToAdmin(); }
    });

    socket.on('admin_freeze', async (id) => {
        await User.findOneAndUpdate({ userId: id }, { frozen: true });
        const target = Array.from(activeSessions.values()).find(s => s.id === id);
        if (target) io.to(target.socketId).emit('account_frozen');
        sendAllUsersToAdmin();
    });

    socket.on('admin_delete', async (id) => {
        await User.findOneAndDelete({ userId: id });
        const target = Array.from(activeSessions.values()).find(s => s.id === id);
        if (target) { io.to(target.socketId).emit('account_deleted'); activeSessions.delete(target.socketId); }
        sendAllUsersToAdmin();
    });

    socket.on('disconnect', () => {
        if (session) { activeSessions.delete(socket.id); sendAllUsersToAdmin(); }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`NO-PASS SYSTEM ONLINE :${PORT}`));