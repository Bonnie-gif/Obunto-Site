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

// --- CONFIGURAÇÃO DO BANCO DE DADOS ---
const MONGO_URI = process.env.MONGO_URI;

const connectDB = async () => {
    if (!MONGO_URI) return console.log("⚠️ MONGO_URI não configurada!");
    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ ACCESS GRANTED: Database Online");
    } catch (err) {
        console.error("❌ DB ERROR:", err.message);
        setTimeout(connectDB, 5000);
    }
};
connectDB();

// --- SCHEMAS ---
const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const ActivityLogSchema = new mongoose.Schema({
    userId: String,
    username: String,
    action: String,
    details: String,
    timestamp: { type: Date, default: Date.now }
});
const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);

// Sessões ativas
const activeSessions = new Map();
const USER_CACHE = {};
const CACHE_TIME = 1000 * 60 * 15;

const TSC_GROUPS = {
    11649027: "ADMINISTRATION", 12026513: "MEDICAL_DEPT", 11577231: "INTERNAL_SECURITY",
    14159717: "INTELLIGENCE", 12026669: "SCIENCE_DIV", 12045419: "ENGINEERING", 12022092: "LOGISTICS"
};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rota para o Painel Admin (Proteja com senha se necessário no futuro)
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-panel.html'));
});

app.get('/health', (req, res) => res.send('SYSTEM_ACTIVE'));

app.post('/api/check-user', async (req, res) => {
    const { userId } = req.body;
    try {
        const user = await User.findOne({ userId });
        res.json({ registered: !!user });
    } catch (e) {
        res.status(500).json({ error: "DB_FAIL" });
    }
});

app.post('/api/register', async (req, res) => {
    const { userId, password } = req.body;
    try {
        const exists = await User.findOne({ userId });
        if (exists) return res.status(400).json({ success: false, message: "ID_TAKEN" });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        
        await new User({ userId, passwordHash: hash }).save();
        await new ActivityLog({ userId, action: 'REGISTER', details: 'New account created' }).save();
        
        io.emit('new_registration', { userId: userId, username: "Unknown", timestamp: Date.now() });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

app.post('/api/login', async (req, res) => {
    const { userId, password } = req.body;

    if (userId === "000" && password === "TSC-OMEGA") {
        return res.json({ 
            success: true, 
            userData: { id: "000", username: "OBUNTO", department: "CORE", rank: "MASTER_ADMIN", 
                       clearance: "OMEGA", avatar: "obunto/normal.png", affiliations: [] } 
        });
    }

    try {
        const user = await User.findOne({ userId });
        if (!user) return res.status(404).json({ success: false, message: "NO_USER" });

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) return res.status(401).json({ success: false, message: "WRONG_PASS" });

        const now = Date.now();
        if (USER_CACHE[userId] && (now - USER_CACHE[userId].timestamp < CACHE_TIME)) {
            await new ActivityLog({ userId, username: USER_CACHE[userId].data.username, action: 'LOGIN' }).save();
            return res.json({ success: true, userData: USER_CACHE[userId].data });
        }

        const userRes = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
        const groupsRes = await axios.get(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
        const thumbRes = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`);

        const tscGroups = groupsRes.data.data.filter(g => TSC_GROUPS[g.group.id]);
        if (tscGroups.length === 0) return res.status(403).json({ success: false, message: "CIVILIAN_DETECTED" });

        const primary = tscGroups.sort((a, b) => b.role.rank - a.role.rank)[0];
        const levelMatch = primary.role.name.match(/\d+/);

        const profileData = {
            id: userId,
            username: userRes.data.name,
            department: TSC_GROUPS[primary.group.id],
            rank: primary.role.name,
            clearance: `${levelMatch ? levelMatch[0] : '0'}`,
            avatar: thumbRes.data.data[0].imageUrl,
            affiliations: tscGroups.map(g => ({ name: g.group.name, role: g.role.name, div: TSC_GROUPS[g.group.id] }))
        };

        USER_CACHE[userId] = { timestamp: now, data: profileData };
        await new ActivityLog({ userId, username: profileData.username, action: 'LOGIN' }).save();

        res.json({ success: true, userData: profileData });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: "SYSTEM_FAIL" });
    }
});

io.on('connection', (socket) => {
    let sessionUser = null;

    // Conexão do Admin
    socket.on('admin_connected', () => {
        socket.join('admins');
        updateAdminDashboard();
    });

    socket.on('user_connected', (userData) => {
        sessionUser = userData;
        activeSessions.set(socket.id, {
            ...userData,
            socketId: socket.id,
            connectedAt: Date.now(),
            lastAction: 'Connected',
            currentWindow: 'DESKTOP'
        });

        new ActivityLog({ userId: userData.id, username: userData.username, action: 'CONNECT' }).save();
        updateAdminDashboard();
        io.to('admins').emit('user_connected', activeSessions.get(socket.id));
    });

    socket.on('user_activity', (data) => {
        if (activeSessions.has(socket.id)) {
            const session = activeSessions.get(socket.id);
            session.lastAction = data.action;
            session.currentWindow = data.window || session.currentWindow;
            activeSessions.set(socket.id, session);
            
            // Envia atividade em tempo real para o admin
            io.to('admins').emit('user_activity', { userId: session.id, ...data });
        }
    });

    // Admin Events
    socket.on('admin_request_users', () => updateAdminDashboard());
    
    socket.on('admin_broadcast', (data) => {
        if (data.target === 'all') {
            io.emit('receive_mascot_msg', data);
        } else {
            const targetSession = Array.from(activeSessions.values()).find(s => s.id === data.target);
            if (targetSession) io.to(targetSession.socketId).emit('receive_mascot_msg', data);
        }
    });

    socket.on('admin_kick', (data) => {
        const targetSession = Array.from(activeSessions.values()).find(s => s.id === data.userId);
        if (targetSession) {
            io.to(targetSession.socketId).emit('force_disconnect', { reason: 'TERMINATED BY ADMIN' });
            activeSessions.delete(targetSession.socketId);
            updateAdminDashboard();
        }
    });

    socket.on('admin_freeze', (data) => {
        const targetSession = Array.from(activeSessions.values()).find(s => s.id === data.userId);
        if (targetSession) io.to(targetSession.socketId).emit('account_frozen');
    });

    socket.on('admin_delete', async (data) => {
        await User.findOneAndDelete({ userId: data.userId });
        const targetSession = Array.from(activeSessions.values()).find(s => s.id === data.userId);
        if (targetSession) io.to(targetSession.socketId).emit('account_deleted');
    });

    socket.on('disconnect', () => {
        if (sessionUser) {
            io.to('admins').emit('user_disconnected', sessionUser.id);
        }
        activeSessions.delete(socket.id);
        updateAdminDashboard();
    });
});

function updateAdminDashboard() {
    const users = Array.from(activeSessions.values());
    io.to('admins').emit('users_list', users);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ SYSTEM ONLINE :${PORT}`));