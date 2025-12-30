const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const TSC_GROUP_IDS = [
    11577231,
    11608337,
    11649027,
    12045972,
    12026513,
    12026669,
    12045419,
    12022092,
    14159717
];

const connectedUsers = new Map();

app.post('/api/login', async (req, res) => {
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ success: false, message: "ID REQUIRED" });

    if (userId === "8989") {
        return res.json({ 
            success: true, 
            userData: { 
                id: "8989", 
                username: "OBUNTO", 
                displayName: "System Artificial Intelligence",
                rank: "MAINFRAME",
                avatar: "/obunto/normal.png", 
                affiliations: [{
                    groupName: "TSC MAINFRAME",
                    role: "SYSTEM ADMINISTRATOR",
                    rank: 999
                }],
                isObunto: true
            } 
        });
    }

    try {
        const profileRes = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
        const userGroupsRes = await axios.get(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
        const avatarRes = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`);

        const allGroups = userGroupsRes.data.data || [];
        const tscGroups = allGroups.filter(g => TSC_GROUP_IDS.includes(g.group.id));

        if (tscGroups.length === 0) {
             return res.status(403).json({ success: false, message: "ACCESS DENIED: NON-PERSONNEL" });
        }

        const mainGroup = tscGroups.find(g => g.group.id === 11577231);
        let level = "LEVEL 0";
        if (mainGroup) {
            const match = mainGroup.role.name.match(/\d+/);
            level = match ? `LEVEL ${match[0]}` : "LEVEL 0";
        }

        res.json({ 
            success: true, 
            userData: {
                id: userId.toString(),
                username: profileRes.data.name,
                displayName: profileRes.data.displayName,
                created: profileRes.data.created,
                avatar: avatarRes.data.data[0]?.imageUrl,
                rank: level,
                affiliations: tscGroups.map(g => ({
                    groupName: g.group.name.toUpperCase(),
                    role: g.role.name.toUpperCase(),
                    rank: g.role.rank
                })).sort((a, b) => b.rank - a.rank),
                isObunto: false
            } 
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: "CONNECTION ERROR" });
    }
});

io.on('connection', (socket) => {
    let currentUserId = null;

    socket.on('register_user', (userId) => {
        currentUserId = userId;
        connectedUsers.set(String(userId), socket.id);
        console.log(`User ${userId} connected via ${socket.id}`);
    });

    socket.on('mascot_broadcast', (data) => {
        if (data.targetId && data.targetId.trim() !== "") {
            const targetSocket = connectedUsers.get(String(data.targetId));
            if (targetSocket) {
                io.to(targetSocket).emit('display_mascot_message', {
                    message: `[PRIVATE] ${data.message}`,
                    mood: data.mood || 'normal'
                });
            }
        } else {
            io.emit('display_mascot_message', {
                message: data.message,
                mood: data.mood || 'normal'
            });
        }
    });

    socket.on('disconnect', () => {
        if (currentUserId) connectedUsers.delete(currentUserId);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`TSC NEWTON OS SERVER RUNNING ON PORT ${PORT}`);
});