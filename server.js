const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// MAPEAMENTO DE DEPARTAMENTOS TSC
const TSC_DEPARTMENTS = {
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

    if (userId === "000" && usernameInput.toUpperCase() === "OBUNTO") {
        return res.json({
            success: true,
            userData: {
                id: "000", username: "OBUNTO", display: "SYSTEM_CORE",
                department: "MAINFRAME", rank: "MASTER_ADMIN", clearance: "OMEGA",
                avatar: "obunto/normal.png"
            }
        });
    }

    try {
        const userRes = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
        if (!userRes.data || userRes.data.name.toLowerCase() !== usernameInput.toLowerCase()) {
            return res.status(401).json({ success: false, message: "IDENTITY_MISMATCH" });
        }

        const groupsRes = await axios.get(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
        
        let highestRankValue = -1;
        let bestGroup = null;

        // LÓGICA: Encontra o grupo da TSC com o maior RANK numérico (0-255)
        if (groupsRes.data && groupsRes.data.data) {
            groupsRes.data.data.forEach(g => {
                if (TSC_DEPARTMENTS[g.group.id]) {
                    if (g.role.rank > highestRankValue) {
                        highestRankValue = g.role.rank;
                        bestGroup = g;
                    }
                }
            });
        }

        const userData = {
            id: userId,
            username: userRes.data.name,
            dept: bestGroup ? TSC_DEPARTMENTS[bestGroup.group.id] : "CIVILIAN",
            rank: bestGroup ? bestGroup.role.name : "UNASSIGNED",
            // O Level agora é baseado no Rank real do grupo (ex: L-3 ou Rank 10)
            clearance: bestGroup ? `LEVEL ${Math.floor(bestGroup.role.rank / 10)}` : "LEVEL 0"
        };

        res.json({ 
            success: true, 
            userData: {
                ...userData,
                avatar: `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=420&height=420&format=png`
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