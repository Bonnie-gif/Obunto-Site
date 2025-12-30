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
        console.error(err);
        setTimeout(connectDB, 10000); 
    }
};
connectDB();

const UserSchema = new mongoose.Schema({
    userId: { type: String, unique: true },
    frozen: { type: Boolean, default: false }
});
let User;
try { User = mongoose.model('User', UserSchema); } catch(e) { User = mongoose.model('User'); }

// IDs oficiais TSC (main + comuns baseados em dados reais)
const TSC_GROUPS = {
    11577231: "THUNDER SCIENTIFIC CORPORATION", // Main group
    11608337: "O5 COUNCIL / HIGH COMMAND",
    11649027: "ADMINISTRATION",
    12045972: "ETHICS COMMITTEE",
    11577231: "INTERNAL SECURITY", // Overlap comum
    // Adicione mais se descobrir sub-groups oficiais
};

async function getRobloxData(userId) {
    const profileRes = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
    const username = profileRes.data.name;

    const avatarRes = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`);
    const avatar = avatarRes.data.data[0].imageUrl;

    const groupsRes = await axios.get(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
    const allGroups = groupsRes.data.data;

    const tscGroups = allGroups.filter(g => TSC_GROUPS[g.group.id]);

    if (tscGroups.length === 0) throw new Error("No TSC affiliation");

    tscGroups.sort((a, b) => b.role.rank - a.role.rank);
    const primary = tscGroups[0];

    const levelMatch = primary.role.name.match(/\d+/);
    const clearance = levelMatch ? `LEVEL ${levelMatch[0]}` : "LEVEL 0";

    return {
        id: userId,
        username,
        avatar,
        dept: TSC_GROUPS[primary.group.id] || primary.group.name,
        rank: primary.role.name,
        clearance,
        affiliations: tscGroups.map(g => ({ dept: TSC_GROUPS[g.group.id] || g.group.name, role: g.role.name }))
    };
}

app.post('/api/login', async (req, res) => {
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ success: false, message: "NO ID" });

    // Backdoor Admin
    if (userId === "000") {
        return res.json({ 
            success: true, 
            userData: { 
                id: "000", 
                username: "OBUNTO_CORE", 
                dept: "MAINFRAME", 
                rank: "MASTER_ADMIN", 
                avatar: "/obunto/normal.png", 
                isAdmin: true 
            } 
        });
    }

    try {
        if (isDbConnected) {
            let u = await User.findOne({ userId });
            if (!u) { u = new User({ userId }); await u.save(); }
            else if (u.frozen) return res.status(403).json({ success: false, message: "ID FROZEN" });
        }

        const profile = await getRobloxData(userId);

        // Special Obunto para ID 1947
        if (userId === "1947") {
            profile.isObunto = true;
        }

        res.json({ success: true, userData: profile });

    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: "NO TSC AFFILIATION OR ERROR" });
    }
});

io.on('connection', (socket) => {
    console.log("User connected");
    // Broadcasts etc. mantidos se tiver
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`NEWTON SERVER ONLINE ON PORT ${PORT}`));