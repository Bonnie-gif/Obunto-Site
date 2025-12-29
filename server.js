const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// BANCO DE DADOS DE DIVISÕES OFICIAIS TSC
const TSC_OFFICIAL_GROUPS = {
    11649027: "PERSONNEL",
    12026513: "MEDICAL",
    11577231: "INTERNAL_SECURITY",
    14159717: "INTELLIGENCE",
    12026669: "SCIENCE",
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
            userData: {
                id: "000", username: "OBUNTO", created: "SYSTEM_START",
                dept: "CORE", rank: "MAINFRAME", clearance: "OMEGA",
                avatar: "obunto/normal.png", groups: []
            }
        });
    }

    try {
        const userRes = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
        if (!userRes.data || userRes.data.name.toLowerCase() !== usernameInput.toLowerCase()) {
            return res.status(401).json({ success: false, message: "ID_MISMATCH" });
        }

        const groupsRes = await axios.get(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
        const allGroups = groupsRes.data.data;

        // FILTRO: Mantém apenas grupos que estão na lista TSC_OFFICIAL_GROUPS
        const tscGroups = allGroups.filter(g => TSC_OFFICIAL_GROUPS[g.group.id]);
        
        // Se não estiver em nenhum grupo TSC, o acesso é negado
        if (tscGroups.length === 0) {
            return res.status(403).json({ success: false, message: "NOT_TSC_PERSONNEL" });
        }

        // Define o grupo principal (prioridade para o grupo ID 11649027 ou o de maior Rank)
        let primary = tscGroups.find(g => g.group.id === 11649027) || tscGroups.sort((a, b) => b.role.rank - a.role.rank)[0];

        // Extração do Nível (ex: "L-3" vira "3")
        const levelMatch = primary.role.name.match(/\d+/);
        const clearanceLevel = levelMatch ? levelMatch[0] : "0";

        res.json({
            success: true,
            userData: {
                id: userId,
                username: userRes.data.name,
                created: new Date(userRes.data.created).toLocaleDateString('pt-BR'),
                dept: TSC_OFFICIAL_GROUPS[primary.group.id],
                rank: primary.role.name,
                clearance: `CLEARANCE ${clearanceLevel}`,
                avatar: `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=420&height=420&format=png`,
                affiliations: tscGroups.map(g => ({
                    name: g.group.name,
                    role: g.role.name,
                    div: TSC_OFFICIAL_GROUPS[g.group.id]
                }))
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