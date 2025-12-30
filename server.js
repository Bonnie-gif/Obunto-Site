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
app.use(express.static(path.join(__dirname, 'public')));

const MONGO_URI = process.env.MONGO_URI;
let isDbConnected = false;

const connectDB = async () => {
    if (!MONGO_URI) return;
    try { 
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 }); 
        isDbConnected = true;
    } catch (err) { 
        setTimeout(connectDB, 10000); 
    }
};
connectDB();

const UserSchema = new mongoose.Schema({
    userId: { type: String, unique: true },
    frozen: { type: Boolean, default: false }
});
let User; try { User = mongoose.model('User', UserSchema); } catch(e) { User = mongoose.model('User'); }

const TSC_GROUPS = {
    11649027: "ADMINISTRATION", 
    12026513: "MEDICAL_DEPT", 
    11577231: "INTERNAL_SECURITY",
    14159717: "INTELLIGENCE", 
    12026669: "SCIENCE_DIV", 
    12045419: "ENGINEERING", 
    12022092: "LOGISTICS"
};

const USER_CACHE = {}; 

async function getRobloxData(userId) {
    try {
        const [userRes, groupsRes, thumbRes] = await Promise.all([
            axios.get(`https://users.roblox.com/v1/users/${userId}`),
            axios.get(`https://groups.roblox.com/v2/users/${userId}/groups/roles`),
            axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`)
        ]);

        const tscGroupsFound = groupsRes.data.data.filter(g => TSC_GROUPS[g.group.id]);
        const primary = tscGroupsFound.length > 0 ? tscGroupsFound.sort((a, b) => b.role.rank - a.role.rank)[0] : null;

        return {
            id: userId,
            username: userRes.data.name,
            dept: primary ? TSC_GROUPS[primary.group.id] : "CIVILIAN",
            rank: primary ? primary.role.name.toUpperCase() : "UNAUTHORIZED",
            avatar: thumbRes.data.data[0].imageUrl
        };
    } catch (e) {
        return { id: userId, username: "Unknown", dept: "N/A", rank: "ERROR", avatar: "" };
    }
}

app.post('/api/login', async (req, res) => {
    const { userId } = req.body;
    if (userId === "000") {
        return res.json({ success: true, userData: { id: "000", username: "OBUNTO_CORE", dept: "MAINFRAME", rank: "MASTER_ADMIN", avatar: "obunto/normal.png", isAdmin: true } });
    }
    try {
        if (isDbConnected) {
            let user = await User.findOne({ userId });
            if (!user) { user = new User({ userId }); await user.save(); }
            else if (user.frozen) return res.status(403).json({ success: false, message: "ID FROZEN" });
        }
        const profile = await getRobloxData(userId);
        USER_CACHE[userId] = { data: profile, timestamp: Date.now() };
        res.json({ success: true, userData: profile });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/search/:id', async (req, res) => {
    const profile = await getRobloxData(req.params.id);
    res.json(profile);
});

io.on('connection', (socket) => {
    socket.on('admin_login', () => socket.join('admins'));
    socket.on('user_login', (data) => socket.broadcast.to('admins').emit('user_online', data));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`PORT ${PORT}`));