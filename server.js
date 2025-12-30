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
        console.log("MongoDB Connected");
    } catch (err) { 
        console.error("DB Error:", err);
        setTimeout(connectDB, 10000); 
    }
};
connectDB();

const UserSchema = new mongoose.Schema({
    userId: { type: String, unique: true },
    frozen: { type: Boolean, default: false }
});
const User = mongoose.model('User', UserSchema);

// Groups TSC reais (expandido com todos do histórico + search)
const TSC_GROUPS = {
    11577231: "THUNDER SCIENTIFIC CORPORATION",
    11608337: "SECURITY DEPARTMENT",
    11649027: "ADMINISTRATION",
    12045972: "ETHICS COMMITTEE",
    12026513: "MEDICAL DEPARTMENT",
    12026669: "SCIENTIFIC DEPARTMENT",
    12045419: "ENGINEERING",
    12022092: "LOGISTICS",
    14159717: "INTELLIGENCE",
    12045972: "ADMINISTRATIVE DEPARTMENT", // Alias if needed
    // Firearms: Assumindo parte de Security, no separate ID found; add if known, e.g., 12345678: "FIREARMS DIVISION"
};

async function getRobloxData(userId) {
    try {
        const profileRes = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
        const username = profileRes.data.name;

        const avatarRes = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`);
        const avatar = avatarRes.data.data[0].imageUrl;

        const groupsRes = await axios.get(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
        const allGroups = groupsRes.data.data;

        const tscGroups = allGroups.filter(g => TSC_GROUPS[g.group.id]);

        if (tscGroups.length === 0) throw new Error("No TSC affiliation");

        // Find main group for level (11577231)
        const mainGroup = tscGroups.find(g => g.group.id === 11577231);
        let level = "LEVEL 0";
        if (mainGroup) {
            const levelMatch = mainGroup.role.name.match(/\d+/);
            level = levelMatch ? `LEVEL ${levelMatch[0]}` : "LEVEL 0";
        } else {
            // Fallback to primary
            tscGroups.sort((a, b) => b.role.rank - a.role.rank);
            const primary = tscGroups[0];
            const levelMatch = primary.role.name.match(/\d+/);
            level = levelMatch ? `LEVEL ${levelMatch[0]}` : "LEVEL 0";
        }

        return {
            id: userId,
            username,
            avatar,
            rank: level,  // RANK = level from main or primary
            affiliations: tscGroups.map(g => ({ dept: TSC_GROUPS[g.group.id] || g.group.name, role: g.role.name })),
            isObunto: userId === "1947"
        };
    } catch (err) {
        throw err;
    }
}

app.post('/api/login', async (req, res) => {
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ success: false, message: "ID REQUIRED" });

    if (userId === "000") {
        return res.json({ 
            success: true, 
            userData: { 
                id: "000", 
                username: "OBUNTO_CORE", 
                dept: "MAINFRAME", 
                rank: "OMEGA",  // RANK as level
                avatar: "/obunto/normal.png", 
                affiliations: [],  // No affiliations for admin
                isAdmin: true 
            } 
        });
    }

    try {
        if (isDbConnected) {
            let u = await User.findOne({ userId });
            if (!u) {
                u = new User({ userId });
                await u.save();
            } else if (u.frozen) {
                return res.status(403).json({ success: false, message: "ID FROZEN" });
            }
        }

        const profile = await getRobloxData(userId);
        res.json({ success: true, userData: profile });

    } catch (e) {
        res.status(500).json({ success: false, message: e.message || "SERVER ERROR" });
    }
});

io.on('connection', (socket) => {
    console.log("User connected: ", socket.id);
    socket.on('disconnect', () => console.log("User disconnected"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Newton OS Server on port ${PORT}`));