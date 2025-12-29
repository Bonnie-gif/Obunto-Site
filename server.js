const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const DEPARTMENTS = {
    11577231: "INTERNAL_SECURITY",
    12026669: "SCIENCE_DIVISION",
    12045419: "ENGINEERING",
    12026513: "MEDICAL_DEPT",
    12022092: "LOGISTICS",
    11649027: "ADMINISTRATION",
    14159717: "INTELLIGENCE_AGENCY"
};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/login', async (req, res) => {
    const { userId, usernameInput } = req.body;
    try {
        const userRes = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
        const realName = userRes.data.name;

        if (realName.toLowerCase() !== usernameInput.toLowerCase()) {
            return res.status(401).json({ success: false, message: "SECURITY MISMATCH: NAME" });
        }

        const groupsRes = await axios.get(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
        let dept = "CLASS-D", rank = "Civilian", level = 0;

        groupsRes.data.data.forEach(g => {
            if (DEPARTMENTS[g.group.id]) {
                dept = DEPARTMENTS[g.group.id];
                rank = g.role.name;
                level = g.role.rank;
            }
        });

        res.json({
            success: true,
            userData: {
                id: userId, username: realName, display: userRes.data.displayName,
                department: dept, rank: rank, clearance: level,
                avatar: `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=420&height=420&format=png`
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, message: "API ERROR" });
    }
});

io.on('connection', (socket) => {
    socket.on('mascot_broadcast', (data) => {
        io.emit('receive_mascot_msg', data);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Rodando em http://localhost:${PORT}`));