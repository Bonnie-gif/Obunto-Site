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
        await mongoose.connect(MONGO_URI); 
        isDbConnected = true;
    } catch (err) { 
        setTimeout(connectDB, 10000); 
    }
};
connectDB();

const UserSchema = new mongoose.Schema({
    userId: { type: String, unique: true },
    frozen: { type: Boolean, default: false },
    notes: { type: String, default: "" },
    lastAccess: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const TSC_GROUPS = {
    11577231: "THUNDER SCIENTIFIC CORPORATION",
    11608337: "SECURITY DEPARTMENT",
    11649027: "ADMINISTRATION",
    12045972: "ETHICS COMMITTEE",
    12026513: "MEDICAL DEPARTMENT",
    12026669: "SCIENTIFIC DEPARTMENT",
    12045419: "ENGINEERING",
    12022092: "LOGISTICS",
    14159717: "INTELLIGENCE"
};

const connectedUsers = new Map();

async function getRobloxData(userId) {
    try {
        const profileRes = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
        const username = profileRes.data.name;
        const displayName = profileRes.data.displayName;
        const description = profileRes.data.description || "";
        const created = profileRes.data.created;

        const avatarRes = await axios.get(
            `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`
        );
        const avatar = avatarRes.data.data[0]?.imageUrl || "";

        const groupsRes = await axios.get(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
        const allGroups = groupsRes.data.data || [];

        const tscGroups = allGroups.filter(g => TSC_GROUPS[g.group.id]);

        if (tscGroups.length === 0) {
            throw new Error("No TSC affiliation detected");
        }

        const mainGroup = tscGroups.find(g => g.group.id === 11577231);
        let level = "LEVEL 0";
        
        if (mainGroup) {
            const levelMatch = mainGroup.role.name.match(/\d+/);
            level = levelMatch ? `LEVEL ${levelMatch[0]}` : "LEVEL 0";
        } else {
            tscGroups.sort((a, b) => b.role.rank - a.role.rank);
            if (tscGroups[0]) {
                const levelMatch = tscGroups[0].role.name.match(/\d+/);
                level = levelMatch ? `LEVEL ${levelMatch[0]}` : "LEVEL 0";
            }
        }

        return {
            id: userId,
            username,
            displayName,
            description,
            created,
            avatar,
            rank: level,
            affiliations: tscGroups.map(g => ({ 
                groupId: g.group.id,
                groupName: TSC_GROUPS[g.group.id] || g.group.name,
                role: g.role.name,
                rank: g.role.rank
            })),
            allGroups: allGroups.map(g => ({
                id: g.group.id,
                name: g.group.name,
                role: g.role.name,
                rank: g.role.rank
            })),
            isObunto: userId === "8989"
        };
    } catch (err) {
        throw err;
    }
}

app.post('/api/login', async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, message: "USER ID REQUIRED" });
    }

    if (userId === "8989") {
        return res.json({ 
            success: true, 
            userData: { 
                id: "8989", 
                username: "OBUNTO", 
                displayName: "Obunto System Core",
                rank: "OMEGA",
                avatar: "/obunto/normal.png", 
                affiliations: [{
                    groupName: "TSC MAINFRAME",
                    role: "SYSTEM ADMINISTRATOR",
                    rank: 999
                }],
                allGroups: [],
                isObunto: true
            } 
        });
    }

    try {
        if (isDbConnected) {
            let user = await User.findOne({ userId });
            if (!user) {
                user = new User({ userId });
                await user.save();
            } else if (user.frozen) {
                return res.status(403).json({ success: false, message: "ACCESS DENIED - USER ID FROZEN" });
            }
            user.lastAccess = new Date();
            await user.save();
        }

        const profile = await getRobloxData(userId);
        res.json({ success: true, userData: profile });

    } catch (e) {
        res.status(500).json({ success: false, message: e.message || "SERVER ERROR" });
    }
});

app.post('/api/save-note', async (req, res) => {
    const { userId, note } = req.body;
    
    if (!userId) return res.status(400).json({ success: false });
    
    try {
        if (isDbConnected) {
            await User.updateOne({ userId }, { notes: note }, { upsert: true });
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/get-note/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        if (isDbConnected) {
            const user = await User.findOne({ userId });
            res.json({ success: true, note: user?.notes || "" });
        } else {
            res.json({ success: true, note: "" });
        }
    } catch (e) {
        res.status(500).json({ success: false, note: "" });
    }
});

io.on('connection', (socket) => {
    socket.on('register_user', (userId) => {
        connectedUsers.set(userId, socket.id);
    });
    
    socket.on('mascot_broadcast', (data) => {
        io.emit('display_mascot_message', {
            message: data.message,
            mood: data.mood || 'normal'
        });
    });
    
    socket.on('disconnect', () => {
        for (const [userId, socketId] of connectedUsers.entries()) {
            if (socketId === socket.id) {
                connectedUsers.delete(userId);
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});