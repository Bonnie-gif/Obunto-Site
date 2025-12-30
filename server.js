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
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'data_store.json');
const TSC_GROUP_IDS = [11577231, 11608337, 11649027, 12045972, 12026513, 12026669, 12045419, 12022092, 14159717];
const COOLDOWN_TIME = 4 * 60 * 1000;

let dataStore = { notes: {}, helpTickets: [] };
let systemStatus = 'ONLINE'; 
let userCooldowns = {};

if (fs.existsSync(DATA_FILE)) {
    try {
        dataStore = JSON.parse(fs.readFileSync(DATA_FILE));
    } catch (e) {}
}

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(dataStore, null, 2));
}

app.post('/api/login', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: "ID REQUIRED" });

    if (userId === "8989") {
        return res.json({ 
            success: true, 
            userData: { 
                id: "8989", 
                username: "OBUNTO", 
                displayName: "System Artificial Intelligence", 
                rank: "MAINFRAME", 
                avatar: "/obunto/normal.png", 
                affiliations: [{ groupName: "TSC MAINFRAME", role: "SYSTEM ADMINISTRATOR", rank: 999 }],
                isObunto: true 
            } 
        });
    }

    try {
        const profileRes = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
        const userGroupsRes = await axios.get(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
        const avatarRes = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`);

        const allGroups = userGroupsRes.data.data || [];
        const tscGroups = allGroups.filter(g => TSC_GROUP_IDS.includes(g.group.id));

        if (tscGroups.length === 0) return res.status(403).json({ success: false, message: "ACCESS DENIED" });

        const mainGroup = tscGroups.find(g => g.group.id === 11577231);
        let level = mainGroup ? (mainGroup.role.name.match(/\d+/) ? `LEVEL ${mainGroup.role.name.match(/\d+/)[0]}` : "LEVEL 0") : "LEVEL 0";

        res.json({ 
            success: true, 
            userData: {
                id: userId.toString(),
                username: profileRes.data.name,
                displayName: profileRes.data.displayName,
                avatar: avatarRes.data.data[0]?.imageUrl,
                rank: level,
                affiliations: tscGroups.map(g => ({ groupName: g.group.name.toUpperCase(), role: g.role.name.toUpperCase(), rank: g.role.rank })).sort((a, b) => b.rank - a.rank),
                isObunto: false
            } 
        });

    } catch (e) {
        res.status(500).json({ success: false, message: "CONNECTION ERROR" });
    }
});

io.on('connection', (socket) => {
    socket.emit('status_update', systemStatus);

    let currentUserId = null;

    socket.on('register_user', (userId) => {
        currentUserId = userId;
        socket.join(userId); 
        
        if (userId === "8989") {
            socket.join('admin'); 
            socket.emit('load_pending_tickets', dataStore.helpTickets.filter(t => t.status === 'open'));
        }
        
        if (dataStore.notes[userId]) {
            socket.emit('load_notes', dataStore.notes[userId]);
        }
        
        const activeTicket = dataStore.helpTickets.find(t => t.userId === userId && t.status === 'active');
        if (activeTicket) {
            socket.emit('chat_force_open');
        }
    });

    socket.on('admin_broadcast_message', (data) => {
        io.emit('receive_broadcast_message', { 
            message: data.message, 
            mood: data.mood || 'normal', 
            targetId: data.targetId 
        });
    });

    socket.on('admin_trigger_alarm', (alarmType) => {
        io.emit('play_alarm_sound', alarmType);
    });

    socket.on('toggle_system_status', (status) => {
        systemStatus = status;
        io.emit('status_update', systemStatus);
    });

    socket.on('save_notes', (text) => {
        if (!currentUserId) return;
        dataStore.notes[currentUserId] = text;
        saveData();
    });

    socket.on('request_help', (msg) => {
        if (!currentUserId) return;
        
        if (userCooldowns[currentUserId] && Date.now() < userCooldowns[currentUserId]) {
            socket.emit('help_request_denied', { reason: 'COOLDOWN' });
            return;
        }

        const existingTicket = dataStore.helpTickets.find(t => t.userId === currentUserId && (t.status === 'open' || t.status === 'active'));
        if (existingTicket) {
            socket.emit('help_request_denied', { reason: 'ACTIVE_TICKET' });
            return;
        }

        const ticket = { id: Date.now(), userId: currentUserId, msg: msg, status: 'open', timestamp: new Date() };
        dataStore.helpTickets.push(ticket);
        saveData();
        
        io.to('admin').emit('new_help_request', ticket);
        socket.emit('help_request_received');
    });

    socket.on('admin_accept_ticket', (ticketId) => {
        const ticket = dataStore.helpTickets.find(t => t.id === ticketId);
        if (ticket) {
            ticket.status = 'active';
            saveData();
            
            io.to(ticket.userId).emit('chat_force_open');
            io.to('admin').emit('admin_chat_opened', ticket);
        }
    });

    socket.on('admin_wait_signal', (targetId) => {
        io.to(targetId).emit('chat_wait_mode');
    });

    socket.on('admin_close_ticket', (userId) => {
        const ticket = dataStore.helpTickets.find(t => t.userId === userId && t.status === 'active');
        if (ticket) {
            ticket.status = 'closed';
            saveData();
            
            userCooldowns[userId] = Date.now() + COOLDOWN_TIME;
            io.to(userId).emit('chat_ended_cooldown');
        }
    });

    socket.on('chat_message', (data) => {
        const { targetId, message, sender } = data;
        
        if (sender === 'ADMIN') {
            io.to(targetId).emit('chat_receive', { message, sender });
        } else {
            io.to('admin').emit('chat_receive', { message, sender });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {});