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

let dataStore = { notes: {}, helpTickets: [], knownUsers: {}, userFiles: {}, messages: [] };
let systemStatus = 'ONLINE'; 
let currentAlarm = 'green';
let connectedSockets = {}; 
let adminSocketId = null;

if (fs.existsSync(DATA_FILE)) {
    try {
        dataStore = JSON.parse(fs.readFileSync(DATA_FILE));
        if(!dataStore.knownUsers) dataStore.knownUsers = {};
        if(!dataStore.userFiles) dataStore.userFiles = {};
        if(!dataStore.messages) dataStore.messages = [];
    } catch (e) {}
}

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(dataStore, null, 2));
}

function broadcastPersonnelUpdate() {
    if (adminSocketId) {
        const personnelList = Object.values(dataStore.knownUsers).map(u => ({
            id: u.id,
            name: u.name,
            rank: u.rank,
            status: connectedSockets[u.id] ? (connectedSockets[u.id].afk ? 'AFK' : 'ONLINE') : 'OFFLINE',
            activity: connectedSockets[u.id] ? connectedSockets[u.id].activity : 'DISCONNECTED',
            socketId: connectedSockets[u.id] ? connectedSockets[u.id].socketId : null
        }));
        io.to(adminSocketId).emit('personnel_list_update', personnelList);
    }
}

function deleteRecursive(userId, itemId) {
    if (!dataStore.userFiles[userId]) return;
    const children = dataStore.userFiles[userId].filter(f => f.parentId === itemId);
    children.forEach(child => deleteRecursive(userId, child.id));
    dataStore.userFiles[userId] = dataStore.userFiles[userId].filter(f => f.id !== itemId);
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

        if (tscGroups.length === 0) {
             return res.status(403).json({ success: false, message: "ACCESS DENIED: NOT IN GROUP" });
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
            isObunto: false
        };

        dataStore.knownUsers[userId] = {
            id: userId,
            name: userData.username,
            rank: level,
            lastSeen: Date.now()
        };
        saveData();

        res.json({ success: true, userData });

    } catch (e) {
        console.log("API Error or Blocked:", e.message);
        
        // FALLBACK MODE: Allows login even if Roblox API blocks the server
        const fallbackData = {
            id: userId.toString(),
            username: `OPERATOR-${userId.substring(0,4)}`,
            displayName: "AUTHORIZED PERSONNEL",
            avatar: "/assets/icon-large-owner_info-28x14.png", 
            rank: "LEVEL ?",
            affiliations: [{ groupName: "OFFLINE MODE", role: "CONNECTION BYPASS", rank: 1 }],
            isObunto: false
        };

        dataStore.knownUsers[userId] = {
            id: userId,
            name: fallbackData.username,
            rank: fallbackData.rank,
            lastSeen: Date.now()
        };
        saveData();

        res.json({ success: true, userData: fallbackData });
    }
});

io.on('connection', (socket) => {
    socket.emit('status_update', systemStatus);
    socket.emit('alarm_update', currentAlarm);

    let currentUserId = null;

    socket.on('register_user', (userId) => {
        currentUserId = userId;
        socket.join(userId); 
        
        if (userId === "8989") {
            adminSocketId = socket.id;
            socket.emit('load_pending_tickets', dataStore.helpTickets.filter(t => t.status === 'open'));
            broadcastPersonnelUpdate();
        } else {
            connectedSockets[userId] = { socketId: socket.id, activity: 'IDLE', afk: false };
            broadcastPersonnelUpdate();
        }
        
        if (dataStore.notes[userId]) socket.emit('load_notes', dataStore.notes[userId]);
        
        const activeTicket = dataStore.helpTickets.find(t => t.userId === userId && t.status === 'active');
        if (activeTicket) socket.emit('chat_force_open');
    });

    socket.on('update_activity', (data) => {
        if (!currentUserId || currentUserId === "8989") return;
        if (connectedSockets[currentUserId]) {
            connectedSockets[currentUserId].activity = data.view;
            connectedSockets[currentUserId].afk = data.afk;
            broadcastPersonnelUpdate();
            
            if (adminSocketId) {
                io.to(adminSocketId).emit('spy_data_update', {
                    targetId: currentUserId,
                    state: data.fullState
                });
            }
        }
    });

    socket.on('live_input', (data) => {
        if (!currentUserId || currentUserId === "8989") return;
        if (adminSocketId) {
            io.to(adminSocketId).emit('spy_input_update', {
                targetId: currentUserId,
                field: data.fieldId,
                value: data.value
            });
        }
    });

    socket.on('disconnect', () => {
        if (currentUserId) {
            if (currentUserId === "8989") {
                adminSocketId = null;
            } else {
                delete connectedSockets[currentUserId];
                broadcastPersonnelUpdate();
            }
        }
    });

    socket.on('fs_get_files', () => {
        if(!currentUserId) return;
        if(!dataStore.userFiles[currentUserId]) dataStore.userFiles[currentUserId] = [];
        socket.emit('fs_load', dataStore.userFiles[currentUserId]);
    });

    socket.on('fs_create_item', (item) => {
        if(!currentUserId) return;
        if(!dataStore.userFiles[currentUserId]) dataStore.userFiles[currentUserId] = [];
        dataStore.userFiles[currentUserId].push(item);
        saveData();
        socket.emit('fs_load', dataStore.userFiles[currentUserId]);
    });

    socket.on('fs_delete_item', (itemId) => {
        if(!currentUserId) return;
        deleteRecursive(currentUserId, itemId);
        saveData();
        socket.emit('fs_load', dataStore.userFiles[currentUserId]);
    });

    socket.on('fs_update_content', (data) => {
        if(!currentUserId) return;
        const file = dataStore.userFiles[currentUserId].find(f => f.id === data.id);
        if(file) {
            file.content = data.content;
            saveData();
        }
    });

    socket.on('comm_get_messages', () => {
        if(!currentUserId) return;
        const myMessages = dataStore.messages.filter(m => m.to === currentUserId || m.to === 'ALL');
        socket.emit('comm_load', myMessages);
    });

    socket.on('comm_send', (data) => {
        if(!currentUserId) return;
        const msg = {
            id: Date.now(),
            from: currentUserId,
            fromName: dataStore.knownUsers[currentUserId]?.name || 'UNKNOWN',
            to: data.to,
            subject: data.subject,
            body: data.body,
            timestamp: new Date()
        };
        dataStore.messages.push(msg);
        saveData();
        if(data.to === 'ALL') {
            io.emit('comm_new', msg);
        } else {
            io.to(data.to).emit('comm_new', msg);
        }
        socket.emit('comm_sent_success');
    });

    socket.on('admin_assign_task', (data) => {
        const { targetId, taskType } = data;
        io.to(targetId).emit('protocol_task_assigned', { type: taskType, id: Date.now() });
    });

    socket.on('task_complete', (data) => {
        if(adminSocketId) {
            io.to(adminSocketId).emit('protocol_task_result', {
                userId: currentUserId,
                success: data.success,
                type: data.type
            });
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
        currentAlarm = alarmType;
        io.emit('alarm_update', currentAlarm);
        io.emit('play_alarm_sound', alarmType);
    });

    socket.on('toggle_system_status', (status) => {
        systemStatus = status;
        io.emit('status_update', systemStatus);
    });

    socket.on('request_help', (msg) => {
        if (!currentUserId) return;
        const ticket = { id: Date.now(), userId: currentUserId, msg: msg, status: 'open', timestamp: new Date() };
        dataStore.helpTickets.push(ticket);
        saveData();
        if (adminSocketId) io.to(adminSocketId).emit('new_help_request', ticket);
        socket.emit('help_request_received');
    });

    socket.on('admin_accept_ticket', (ticketId) => {
        const ticket = dataStore.helpTickets.find(t => t.id === ticketId);
        if (ticket) {
            ticket.status = 'active';
            saveData();
            io.to(ticket.userId).emit('chat_force_open');
            if (adminSocketId) io.to(adminSocketId).emit('admin_chat_opened', ticket);
        }
    });

    socket.on('chat_message', (data) => {
        const { targetId, message, sender } = data;
        const recipient = sender === 'ADMIN' ? targetId : adminSocketId;
        if (recipient) io.to(recipient).emit('chat_receive', { message, sender });
    });
    
    socket.on('admin_spy_start', (targetId) => {
        if(adminSocketId && connectedSockets[targetId]) {
            io.to(connectedSockets[targetId].socketId).emit('force_state_report');
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {});