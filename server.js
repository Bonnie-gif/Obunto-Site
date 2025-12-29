const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const TSC_DIVISIONS = {
    11649027: "PERSONNEL",
    12026513: "MEDICAL",
    11577231: "SUBJECTS",
    14159717: "INTELLIGENCE",
    12026669: "SCIENCE",
    12045419: "ENGINEERING"
};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/login', async (req, res) => {
    const { userId, usernameInput } = req.body;

    if (userId === "000" && usernameInput.toUpperCase() === "OBUNTO") {
        return res.json({
            success: true,
            userData: {
                id: "000", username: "OBUNTO", display: "SYSTEM_CORE",
                department: "MAINFRAME", rank: "MASTER_ADMIN", clearance: "OMEGA",
                avatar: "obunto/normal.png", groups: []
            }
        });
    }

    try {
        const userRes = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
        if (!userRes.data || userRes.data.name.toLowerCase() !== usernameInput.toLowerCase()) {
            return res.status(401).json({ success: false, message: "IDENTITY_MISMATCH" });
        }

        const groupsRes = await axios.get(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
        const groups = groupsRes.data.data;
        
        let primary = groups.find(g => g.group.id === 11649027) || groups[0];
        let clearance = "0";
        const levelMatch = primary.role.name.match(/\d+/);
        if (levelMatch) clearance = levelMatch[0];

        const userGroups = groups.filter(g => TSC_DIVISIONS[g.group.id]).map(g => ({
            name: g.group.name,
            role: g.role.name,
            division: TSC_DIVISIONS[g.group.id]
        }));

        res.json({
            success: true,
            userData: {
                id: userId,
                username: userRes.data.name,
                dept: TSC_DIVISIONS[primary.group.id] || "CIVILIAN",
                rank: primary.role.name,
                clearance: `LEVEL ${clearance}`,
                avatar: `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=420&height=420&format=png`,
                groups: userGroups
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, message: "OFFLINE" });
    }
});

io.on('connection', (socket) => {
    socket.on('mascot_broadcast', (data) => io.emit('receive_mascot_msg', data));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {});