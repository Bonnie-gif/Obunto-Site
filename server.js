const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const DATA_FILE = path.join(__dirname, 'data_store.json');

let dataStore = { notes: {}, helpTickets: [], knownUsers: {}, userFiles: {}, messages: [] };
let systemStatus = 'ONLINE'; 
let currentAlarm = 'green';
let systemEnergy = 100.0;

if (fs.existsSync(DATA_FILE)) {
    try { dataStore = JSON.parse(fs.readFileSync(DATA_FILE)); } catch (e) {}
}

app.get('/api/roblox/:id', async (req, res) => {
    try {
        const response = await axios.get(`https://users.roblox.com/v1/users/${req.params.id}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user data' });
    }
});

app.post('/api/login', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: "ID REQUIRED" });

    if (userId === "8989") {
        return res.json({ 
            success: true, 
            userData: { 
                id: "8989", username: "OBUNTO", displayName: "System AI", rank: "MAINFRAME", 
                avatar: "Sprites/normal.png", 
                affiliations: [{ groupName: "TSC MAINFRAME", role: "ADMIN", rank: 999 }],
                isObunto: true 
            } 
        });
    }

    try {
        const profileRes = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
        const avatarRes = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`);
        
        const userData = {
            id: userId.toString(),
            username: profileRes.data.name,
            displayName: profileRes.data.displayName,
            avatar: avatarRes.data.data[0]?.imageUrl,
            rank: "PERSONNEL",
            affiliations: [],
            isObunto: false
        };
        
        res.json({ success: true, userData });
    } catch (e) {
        res.json({ success: true, userData: {
            id: userId, username: `USER-${userId}`, displayName: "Visitor", avatar: "assets/icon-large-owner_info-28x14.png", rank: "GUEST", isObunto: false
        }});
    }
});

io.on('connection', (socket) => {
    socket.emit('status_update', systemStatus);
    socket.emit('alarm_update', currentAlarm);
    socket.on('register_user', (userId) => { socket.join(userId); });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {});