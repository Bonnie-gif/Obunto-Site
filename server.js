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
const TSC_GROUP_IDS = [11577231, 11608337, 11649027, 12045972, 12026513, 12026669, 12045419, 12022092, 14159717];

let dataStore = { notes: {}, helpTickets: [], knownUsers: {}, userFiles: {}, messages: [] };
let systemStatus = 'ONLINE'; 
let currentAlarm = 'green';
let systemEnergy = 100.0;
let connectedSockets = {}; 

if (fs.existsSync(DATA_FILE)) {
    try { dataStore = JSON.parse(fs.readFileSync(DATA_FILE)); } catch (e) {}
}

function saveData() {
    try { fs.writeFileSync(DATA_FILE, JSON.stringify(dataStore, null, 2)); } catch(e) {}
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

    if (userId === "36679824") {
        return res.json({ 
            success: true, 
            userData: { 
                id: "36679824", username: "DR. HOLTZ", displayName: "Head of Research", rank: "LEVEL 5", 
                avatar: "assets/icon-large-owner_info-28x14.png",
                affiliations: [{ groupName: "TSC RESEARCH", role: "DIRECTOR", rank: 999 }],
                isObunto: false, isHoltz: true
            } 
        });
    }

    try {
        const profileRes = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
        const userGroupsRes = await axios.get(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
        const avatarRes = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`);

        const allGroups = userGroupsRes.data.data || [];
        const tscGroups = allGroups.filter(g => TSC_GROUP_IDS.includes(g.group.id));

        if (tscGroups.length === 0) {
             return res.status(403).json({ success: false, message: "ACCESS DENIED" });
        }

        const mainGroup = tscGroups.find(g => g.group.id === 11577231);
        let level = mainGroup ? (mainGroup.role.name.match(/\d+/) ? `LEVEL ${mainGroup.role.name.match(/\d+/)[0]}` : "LEVEL 0") : "LEVEL 0";

        const userData = {
            id: userId.toString(),
            username: profileRes.data.name,
            displayName: profileRes.data.displayName,
            avatar: avatarRes.data.data[0]?.imageUrl,
            rank: level,
            affiliations: tscGroups.map(g => ({ groupName: g.group.name.toUpperCase(), role: g.role.name.toUpperCase(), rank: g.role.rank })).sort((a, b) => b.rank - a.rank),
            isObunto: false,
            isHoltz: false
        };

        dataStore.knownUsers[userId] = {
            id: userId, name: userData.username, rank: level, lastSeen: Date.now()
        };
        saveData();

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
    
    let currentUserId = null;

    socket.on('register_user', (userId) => {
        currentUserId = userId;
        socket.join(userId);
        
        if (userId === "8989" || userId === "36679824") {
            socket.join('admins');
        } else {
            connectedSockets[userId] = { socketId: socket.id, activity: 'IDLE' };
        }
    });

    socket.on('live_input', (data) => {
        if (!currentUserId || currentUserId === "8989" || currentUserId === "36679824") return;
        io.to('admins').emit('spy_input_update', { targetId: currentUserId, value: data.value });
    });

    socket.on('toggle_system_status', (status) => {
        systemStatus = status;
        io.emit('status_update', systemStatus);
    });

    socket.on('admin_broadcast_message', (data) => {
        io.emit('receive_broadcast_message', { message: data.message, mood: data.mood || 'normal' });
    });

    socket.on('admin_trigger_alarm', (alarmType) => {
        currentAlarm = alarmType;
        io.emit('alarm_update', currentAlarm);
    });

    socket.on('chat_message', (data) => {
        const { targetId, message, sender } = data;
        if (sender === 'ADMIN') {
            io.to(targetId).emit('chat_receive', { message, sender: 'ADMIN' });
        } else {
            io.to('admins').emit('chat_receive', { message, sender: currentUserId, fromId: currentUserId });
        }
    });

    socket.on('disconnect', () => {
        if (currentUserId) delete connectedSockets[currentUserId];
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {});