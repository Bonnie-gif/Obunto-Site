const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// IDs dos Grupos e Departamentos TSC
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

    // Login especial do Administrador
    if (userId === "000" && usernameInput.toUpperCase() === "OBUNTO") {
        return res.json({
            success: true,
            userData: {
                id: "000", username: "OBUNTO", display: "SYSTEM_CORE",
                department: "MAINFRAME", rank: "MASTER_ADMIN", clearance: 999,
                avatar: "obunto/normal.png" // Certifique-se que este arquivo existe
            }
        });
    }

    try {
        // 1. Validar Usuário e obter Nome Real
        const userRes = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
        if (!userRes.data || userRes.data.name.toLowerCase() !== usernameInput.toLowerCase()) {
            return res.status(401).json({ success: false, message: "IDENTITY_MISMATCH" });
        }

        // 2. Buscar Grupos do Usuário
        const groupsRes = await axios.get(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
        let userDept = "UNASSIGNED";
        let userRank = "NONE";
        let userClearance = 0;

        // Procura se o usuário está em algum departamento TSC
        if (groupsRes.data && groupsRes.data.data) {
            for (const g of groupsRes.data.data) {
                if (DEPARTMENTS[g.group.id]) {
                    userDept = DEPARTMENTS[g.group.id];
                    userRank = g.role.name;
                    userClearance = g.role.rank; // Valor numérico do rank (0-255)
                    break; 
                }
            }
        }

        res.json({ 
            success: true, 
            userData: {
                id: userId,
                username: userRes.data.name,
                display: userRes.data.displayName,
                department: userDept,
                rank: userRank,
                clearance: userClearance,
                // URL correta da imagem de perfil (Avatar Headshot)
                avatar: `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=420&height=420&format=png`
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, message: "MAINFRAME_OFFLINE" });
    }
});

io.on('connection', (socket) => {
    socket.on('mascot_broadcast', (data) => {
        io.emit('receive_mascot_msg', data);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {});