const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Mapeamento de IDs de Grupos conforme sua imagem de referência
const TSC_GROUPS = {
    MAIN_CORP: 11649027,    // Thunder Scientific Corporation
    MEDICAL: 12026513,      // TSC Medical Department
    SECURITY: 11577231,     // Internal Security Bureau
    SUBJECTS: 11577231      // TSC Test Subject Enclave
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
        let userData = {
            id: userId,
            username: userRes.data.name,
            dept: "CIVILIAN",
            rank: "UNASSIGNED",
            clearance: "0"
        };

        // Lógica de Prioridade: Se estiver no grupo principal, usa esses dados
        const groups = groupsRes.data.data;
        const mainGroup = groups.find(g => g.group.id === TSC_GROUPS.MAIN_CORP);
        const medGroup = groups.find(g => g.group.id === TSC_GROUPS.MEDICAL);
        
        if (mainGroup) {
            userData.dept = "PERSONNEL";
            userData.rank = mainGroup.role.name;
            // Extrai o número do Rank (Ex: de "L-3" extrai "3")
            const levelMatch = mainGroup.role.name.match(/\d+/);
            userData.clearance = levelMatch ? levelMatch[0] : "1";
        } else if (medGroup) {
            userData.dept = "MEDICAL";
            userData.rank = medGroup.role.name;
            userData.clearance = "2";
        }

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