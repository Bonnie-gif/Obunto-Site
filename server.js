const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const TSC_MAP = {
    11649027: "ADMINISTRATION",
    11577231: "INTERNAL_SECURITY",
    12026513: "MEDICAL_DEPT",
    12022092: "LOGISTICS",
    12026669: "SCIENCE_DIVISION",
    12045419: "ENGINEERING",
    14159717: "INTELLIGENCE_AGENCY",
    11577231: "TEST_SUBJECT_ENCLAVE" 
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
                dept: "MAINFRAME", rank: "MASTER_ADMIN", clearance: "OMEGA",
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

        // Filtra apenas grupos que pertencem à TSC
        const tscGroups = groups.filter(g => TSC_MAP[g.group.id]);
        
        // Encontra o grupo com o maior Rank numérico (Hierarquia real do Roblox)
        let primary = tscGroups.sort((a, b) => b.role.rank - a.role.rank)[0] || groups[0];

        // Extrai o nível de autorização do nome do cargo (Ex: "L-3" -> "3")
        const levelMatch = primary.role.name.match(/\d+/);
        const clearance = levelMatch ? levelMatch[0] : "0";

        res.json({
            success: true,
            userData: {
                id: userId,
                username: userRes.data.name,
                created: new Date(userRes.data.created).toLocaleDateString('pt-BR'),
                dept: TSC_MAP[primary.group.id] || "CIVILIAN",
                rank: primary.role.name,
                clearance: `CLEARANCE ${clearance}`,
                avatar: `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=420&height=420&format=png`,
                affiliations: tscGroups.map(g => ({
                    name: g.group.name,
                    role: g.role.name,
                    div: TSC_MAP[g.group.id]
                }))
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, message: "DATABASE_OFFLINE" });
    }
});

io.on('connection', (socket) => {
    socket.on('mascot_broadcast', (data) => io.emit('receive_mascot_msg', data));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {});