const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const TSC_DIVISIONS = {
    11649027: "ADMINISTRATION",
    12026513: "MEDICAL_DEPT",
    11577231: "INTERNAL_SECURITY",
    14159717: "INTELLIGENCE",
    12026669: "SCIENCE_DIV",
    12045419: "ENGINEERING",
    12022092: "LOGISTICS"
};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/login', async (req, res) => {
    const { userId, usernameInput } = req.body;

    if (userId === "000" && usernameInput.toUpperCase() === "OBUNTO") {
        return res.json({
            success: true,
            userData: { id: "000", username: "OBUNTO", dept: "CORE", rank: "MASTER_ADMIN", clearance: "OMEGA", avatar: "obunto/normal.png", affiliations: [] }
        });
    }

    try {
        const userRes = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
        if (!userRes.data || userRes.data.name.toLowerCase() !== usernameInput.toLowerCase()) {
            return res.status(401).json({ success: false, message: "IDENTITY_MISMATCH" });
        }

        const groupsRes = await axios.get(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
        const allGroups = groupsRes.data.data;

        // Filtra apenas grupos TSC e encontra o com maior rank numérico (0-255)
        const tscGroups = allGroups.filter(g => TSC_DIVISIONS[g.group.id]);
        if (tscGroups.length === 0) return res.status(403).json({ success: false, message: "NOT_TSC_STAFF" });

        const primary = tscGroups.sort((a, b) => b.role.rank - a.role.rank)[0];
        const levelMatch = primary.role.name.match(/\d+/);

        res.json({
            success: true,
            userData: {
                id: userId,
                username: userRes.data.name,
                dept: TSC_DIVISIONS[primary.group.id],
                rank: primary.role.name,
                clearance: `LEVEL ${levelMatch ? levelMatch[0] : '0'}`,
                avatar: `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=420&height=420&format=png`,
                affiliations: tscGroups.map(g => ({ name: g.group.name, role: g.role.name, div: TSC_DIVISIONS[g.group.id] }))
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, message: "MAINFRAME_OFFLINE" });
    }
});

io.on('connection', (socket) => {
    socket.on('mascot_broadcast', (data) => io.emit('receive_mascot_msg', data));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {});