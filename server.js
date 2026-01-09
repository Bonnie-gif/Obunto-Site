const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }
});

const DATA_FILE = path.join(__dirname, 'arcs_data.json');
const ADMIN_ID = '118107921024376';

let dataStore = {
    users: {},
    pendingUsers: [],
    broadcasts: [],
    messages: [],
    tickets: [],
    alarms: [],
    radioMessages: {},
    onlineUsers: {}
};

function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(dataStore, null, 2));
    } catch (e) {
        console.error('Error saving data:', e);
    }
}

function loadData() {
    if (fs.existsSync(DATA_FILE)) {
        try {
            dataStore = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            if (!dataStore.radioMessages) dataStore.radioMessages = {};
            if (!dataStore.onlineUsers) dataStore.onlineUsers = {};
        } catch (e) {
            console.error('Error loading data:', e);
        }
    }
}

loadData();

if (!dataStore.users[ADMIN_ID]) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    dataStore.users[ADMIN_ID] = {
        id: ADMIN_ID,
        name: 'Obunto',
        password: hashedPassword,
        approved: true,
        isAdmin: true,
        avatar: 'assets/sprites/normal.png',
        createdAt: new Date().toISOString()
    };
    saveData();
}

const schemas = {
    login: Joi.object({
        userId: Joi.string().min(5).max(20).required(),
        password: Joi.string().min(3).max(50).allow('').optional()
    }),
    createAccount: Joi.object({
        userId: Joi.string().min(5).max(20).required()
    }),
    broadcast: Joi.object({
        message: Joi.string().min(1).max(500).required(),
        sprite: Joi.string().required(),
        adminId: Joi.string().required()
    }),
    chatMessage: Joi.object({
        senderId: Joi.string().required(),
        receiverId: Joi.string().required(),
        message: Joi.string().max(1000).required(),
        attachment: Joi.string().optional()
    }),
    ticket: Joi.object({
        userId: Joi.string().required(),
        subject: Joi.string().min(5).max(100).required(),
        description: Joi.string().min(10).max(1000).required()
    }),
    updateProfile: Joi.object({
        userId: Joi.string().required(),
        updates: Joi.object({
            name: Joi.string().min(3).max(50).optional(),
            avatar: Joi.string().optional()
        }).required()
    })
};

function validateInput(data, schema) {
    const { error, value } = schema.validate(data);
    if (error) {
        throw new Error(error.details[0].message);
    }
    return value;
}

function errorHandler(err, req, res, next) {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
}

async function verifyUserCredentials(userId, password) {
    const user = dataStore.users[userId];
    if (!user || !user.password) return false;
    return await bcrypt.compare(password, user.password);
}

app.post('/api/login', async (req, res, next) => {
    try {
        const { userId, password } = validateInput(req.body, schemas.login);
        
        const user = dataStore.users[userId];
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        if (!user.approved) {
            return res.status(403).json({ 
                success: false, 
                message: 'Account pending approval' 
            });
        }
        
        if (user.password && password) {
            const validPassword = await verifyUserCredentials(userId, password);
            if (!validPassword) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid password' 
                });
            }
        }
        
        dataStore.onlineUsers[userId] = {
            userId,
            name: user.name,
            loginTime: new Date().toISOString()
        };
        saveData();
        
        io.emit('user_online', { userId, name: user.name });
        
        res.json({
            success: true,
            userData: {
                id: user.id,
                name: user.name,
                isAdmin: user.id === ADMIN_ID,
                avatar: user.avatar || 'assets/sprites/normal.png'
            }
        });
    } catch (error) {
        next(error);
    }
});

app.post('/api/create-account', (req, res, next) => {
    try {
        const { userId } = validateInput(req.body, schemas.createAccount);
        
        if (dataStore.users[userId]) {
            return res.status(400).json({ 
                success: false, 
                message: 'User already exists' 
            });
        }
        
        if (dataStore.pendingUsers.includes(userId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Already pending approval' 
            });
        }
        
        dataStore.pendingUsers.push(userId);
        saveData();
        
        io.emit('pending_update', dataStore.pendingUsers);
        
        res.json({ success: true, message: 'Account request sent' });
    } catch (error) {
        next(error);
    }
});

app.get('/api/users', (req, res) => {
    const { adminId } = req.query;
    
    if (adminId !== ADMIN_ID) {
        return res.status(403).json({ 
            success: false, 
            message: 'Unauthorized' 
        });
    }
    
    const activeUsers = Object.values(dataStore.users)
        .filter(u => u.approved)
        .map(u => ({
            id: u.id,
            name: u.name,
            isAdmin: u.isAdmin,
            avatar: u.avatar,
            isOnline: !!dataStore.onlineUsers[u.id]
        }));
    
    res.json({ success: true, users: activeUsers });
});

app.get('/api/pending', (req, res) => {
    res.json({ pending: dataStore.pendingUsers });
});

app.post('/api/approve', (req, res, next) => {
    try {
        const { userId, adminId } = req.body;
        
        if (adminId !== ADMIN_ID) {
            return res.status(403).json({ 
                success: false, 
                message: 'Not authorized' 
            });
        }
        
        const index = dataStore.pendingUsers.indexOf(userId);
        if (index === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not in pending list' 
            });
        }
        
        dataStore.pendingUsers.splice(index, 1);
        const tempPassword = 'temp' + Math.random().toString(36).slice(2);
        const hashedPassword = bcrypt.hashSync(tempPassword, 10);
        
        dataStore.users[userId] = {
            id: userId,
            name: `Operator_${userId.slice(-4)}`,
            password: hashedPassword,
            approved: true,
            isAdmin: false,
            avatar: 'assets/sprites/normal.png',
            createdAt: new Date().toISOString()
        };
        saveData();
        
        io.emit('pending_update', dataStore.pendingUsers);
        io.emit('user_approved', { userId, tempPassword });
        
        res.json({ success: true, tempPassword });
    } catch (error) {
        next(error);
    }
});

app.post('/api/deny', (req, res, next) => {
    try {
        const { userId, adminId } = req.body;
        
        if (adminId !== ADMIN_ID) {
            return res.status(403).json({ 
                success: false, 
                message: 'Not authorized' 
            });
        }
        
        const index = dataStore.pendingUsers.indexOf(userId);
        if (index !== -1) {
            dataStore.pendingUsers.splice(index, 1);
            saveData();
            
            io.emit('pending_update', dataStore.pendingUsers);
        }
        
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

app.post('/api/broadcast', (req, res, next) => {
    try {
        const validData = validateInput(req.body, schemas.broadcast);
        
        if (validData.adminId !== ADMIN_ID) {
            return res.status(403).json({ 
                success: false, 
                message: 'Not authorized' 
            });
        }
        
        const broadcast = {
            message: validData.message,
            sprite: validData.sprite,
            timestamp: Date.now()
        };
        
        dataStore.broadcasts.push(broadcast);
        if (dataStore.broadcasts.length > 50) {
            dataStore.broadcasts.shift();
        }
        saveData();
        
        io.emit('broadcast', broadcast);
        
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

app.get('/api/broadcasts', (req, res) => {
    res.json({ broadcasts: dataStore.broadcasts.slice(-10) });
});

app.post('/api/ticket', (req, res, next) => {
    try {
        const validData = validateInput(req.body, schemas.ticket);
        
        const ticket = {
            id: 'T' + Date.now(),
            userId: validData.userId,
            subject: validData.subject,
            description: validData.description,
            status: 'open',
            createdAt: new Date().toISOString(),
            responses: []
        };
        
        dataStore.tickets.push(ticket);
        saveData();
        
        io.emit('ticket_created', ticket);
        
        res.json({ success: true, ticket });
    } catch (error) {
        next(error);
    }
});

app.get('/api/tickets', (req, res) => {
    const { userId } = req.query;
    
    let tickets = dataStore.tickets;
    if (userId && userId !== ADMIN_ID) {
        tickets = tickets.filter(t => t.userId === userId);
    }
    
    res.json({ success: true, tickets });
});

app.post('/api/ticket/respond', (req, res) => {
    const { ticketId, response, adminId } = req.body;
    
    if (adminId !== ADMIN_ID) {
        return res.status(403).json({ 
            success: false, 
            message: 'Not authorized' 
        });
    }
    
    const ticket = dataStore.tickets.find(t => t.id === ticketId);
    if (!ticket) {
        return res.status(404).json({ 
            success: false, 
            message: 'Ticket not found' 
        });
    }
    
    ticket.responses.push({
        text: response,
        timestamp: new Date().toISOString(),
        from: 'admin'
    });
    ticket.status = 'responded';
    saveData();
    
    io.emit('ticket_updated', ticket);
    
    res.json({ success: true });
});

app.post('/api/ticket/close', (req, res) => {
    const { ticketId, adminId } = req.body;
    
    if (adminId !== ADMIN_ID) {
        return res.status(403).json({ 
            success: false, 
            message: 'Not authorized' 
        });
    }
    
    const ticket = dataStore.tickets.find(t => t.id === ticketId);
    if (!ticket) {
        return res.status(404).json({ 
            success: false, 
            message: 'Ticket not found' 
        });
    }
    
    ticket.status = 'closed';
    saveData();
    
    io.emit('ticket_updated', ticket);
    
    res.json({ success: true });
});

app.post('/api/alarm', (req, res) => {
    const { type, details, adminId } = req.body;
    
    if (adminId !== ADMIN_ID) {
        return res.status(403).json({ 
            success: false, 
            message: 'Not authorized' 
        });
    }
    
    const alarm = {
        id: 'A' + Date.now(),
        type,
        details,
        timestamp: new Date().toISOString(),
        active: true
    };
    
    dataStore.alarms.push(alarm);
    saveData();
    
    io.emit('alarm_triggered', alarm);
    
    res.json({ success: true, alarm });
});

app.get('/api/alarms', (req, res) => {
    const activeAlarms = dataStore.alarms.filter(a => a.active);
    res.json({ success: true, alarms: activeAlarms });
});

app.post('/api/alarm/dismiss', (req, res) => {
    const { alarmId, adminId } = req.body;
    
    if (adminId !== ADMIN_ID) {
        return res.status(403).json({ 
            success: false, 
            message: 'Not authorized' 
        });
    }
    
    const alarm = dataStore.alarms.find(a => a.id === alarmId);
    if (alarm) {
        alarm.active = false;
        saveData();
        io.emit('alarm_dismissed', alarmId);
    }
    
    res.json({ success: true });
});

app.post('/api/update-profile', (req, res, next) => {
    try {
        const validData = validateInput(req.body, schemas.updateProfile);
        const { userId, updates } = validData;
        
        const user = dataStore.users[userId];
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        if (updates.name) user.name = updates.name;
        if (updates.avatar) user.avatar = updates.avatar;
        
        saveData();
        
        io.emit('profile_updated', { userId, updates });
        
        res.json({ success: true, user });
    } catch (error) {
        next(error);
    }
});

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ 
            success: false, 
            message: 'No file uploaded' 
        });
    }
    
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, url: fileUrl });
});

app.post('/api/logout', (req, res) => {
    const { userId } = req.body;
    
    if (dataStore.onlineUsers[userId]) {
        delete dataStore.onlineUsers[userId];
        saveData();
        io.emit('user_offline', userId);
    }
    
    res.json({ success: true });
});

app.get('/api/system-status', (req, res) => {
    const stats = {
        totalUsers: Object.keys(dataStore.users).length,
        onlineUsers: Object.keys(dataStore.onlineUsers).length,
        pendingApprovals: dataStore.pendingUsers.length,
        activeTickets: dataStore.tickets.filter(t => t.status === 'open').length,
        activeAlarms: dataStore.alarms.filter(a => a.active).length,
        totalBroadcasts: dataStore.broadcasts.length
    };
    
    res.json({ success: true, stats });
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('register', (userId) => {
        socket.userId = userId;
        socket.join(userId);
        
        if (userId === ADMIN_ID) {
            socket.join('admins');
        }
    });
    
    socket.on('chat_message', (data) => {
        try {
            const validData = validateInput(data, schemas.chatMessage);
            
            const message = {
                id: 'M' + Date.now(),
                senderId: validData.senderId,
                receiverId: validData.receiverId,
                message: validData.message,
                attachment: validData.attachment,
                timestamp: new Date().toISOString()
            };
            
            dataStore.messages.push(message);
            if (dataStore.messages.length > 1000) {
                dataStore.messages.shift();
            }
            saveData();
            
            io.to(validData.receiverId).emit('chat_message', message);
            io.to(validData.senderId).emit('chat_message', message);
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });
    
    socket.on('join_radio', (frequency) => {
        socket.join(`radio_${frequency}`);
        console.log(`User ${socket.userId} joined radio ${frequency}`);
    });
    
    socket.on('radio_message', (data) => {
        const { frequency, message, userId } = data;
        
        if (!dataStore.radioMessages[frequency]) {
            dataStore.radioMessages[frequency] = [];
        }
        
        const radioMsg = {
            userId,
            userName: dataStore.users[userId]?.name || 'Unknown',
            message,
            timestamp: new Date().toISOString()
        };
        
        dataStore.radioMessages[frequency].push(radioMsg);
        if (dataStore.radioMessages[frequency].length > 50) {
            dataStore.radioMessages[frequency].shift();
        }
        saveData();
        
        io.to(`radio_${frequency}`).emit('radio_message', radioMsg);
    });
    
    socket.on('request_chat_history', (data) => {
        const { userId, otherId } = data;
        const history = dataStore.messages.filter(m => 
            (m.senderId === userId && m.receiverId === otherId) ||
            (m.senderId === otherId && m.receiverId === userId)
        );
        socket.emit('chat_history', history);
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`ARCS Server running on port ${PORT}`);
    console.log(`Admin ID: ${ADMIN_ID}`);
    console.log(`Default Admin Password: admin123`);
});