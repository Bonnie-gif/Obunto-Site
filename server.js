const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/login', async (req, res) => {
    const { userId, usernameInput } = req.body;

    if (userId === "000" && usernameInput.toUpperCase() === "OBUNTO") {
        return res.json({
            success: true,
            userData: {
                id: "000", username: "OBUNTO", display: "SYSTEM_CORE",
                department: "MAINFRAME", rank: "MASTER_ADMIN", clearance: 999,
                avatar: "obunto/normal.png"
            }
        });
    }

    try {
        const userRes = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
        if (userRes.data.name.toLowerCase() !== usernameInput.toLowerCase()) {
            return res.status(401).json({ success: false, message: "SECURITY_MISMATCH" });
        }
        res.json({ 
            success: true, 
            userData: {
                id: userId,
                username: userRes.data.name,
                display: userRes.data.displayName,
                department: "PERSONNEL",
                rank: "EMPLOYEE",
                clearance: 1,
                avatar: `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=420&height=420&format=png`
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, message: "OFFLINE" });
    }
});

io.on('connection', (socket) => {
    socket.on('mascot_broadcast', (data) => {
        io.emit('receive_mascot_msg', data);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {});