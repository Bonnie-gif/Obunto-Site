const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const CryptoJS = require('crypto-js');
const winston = require('winston');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const JWT_SECRET = process.env.JWT_SECRET || 'arcs_secret_key_v322_ultra_secure';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'arcs_encryption_key_v322';
const PEPPER = process.env.PEPPER || 'arcs_pepper_2041';
const SALT_ROUNDS = 12;

const logger = winston.createLogger({
    transports: [
        new winston.transports.File({ filename: 'security.log' }),
        new winston.transports.Console()
    ]
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many login attempts, try again later'
});

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
    onlineUsers: {},
    bannedUsers: {},
    userDevices: {},
    userAnalytics: {}
};

function encryptData(data) {
    return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
}

function decryptData(encrypted) {
    try {
        const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
        return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch (e) {
        return null;
    }
}

function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, encryptData(dataStore));
    } catch (e) {
        logger.error('Error saving data:', e);
    }
}

function loadData() {
    if (fs.existsSync(DATA_FILE)) {
        try {
            const encrypted = fs.readFileSync(DATA_FILE, 'utf8');
            const decrypted = decryptData(encrypted);
            if (decrypted) {
                dataStore = decrypted;
                if (!dataStore.radioMessages) dataStore.radioMessages = {};
                if (!dataStore.onlineUsers) dataStore.onlineUsers = {};
                if (!dataStore.bannedUsers) dataStore.bannedUsers = {};
                if (!dataStore.userDevices) dataStore.userDevices = {};
                if (!dataStore.userAnalytics) dataStore.userAnalytics = {};
            }
        } catch (e) {
            logger.error('Error loading data:', e);
        }
    }
}

loadData();

if (!dataStore.users[ADMIN_ID]) {
    const hashedPassword = bcrypt.hashSync('2041' + PEPPER + ADMIN_ID, SALT_ROUNDS);
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
        password: Joi.string().min(3).max(50).allow('').optional(),
        deviceInfo: Joi.object({
            userAgent: Joi.string().optional(),
            platform: Joi.string().optional()
        }).optional()
    }),
    createAccount: Joi.object({
        userId: Joi.string().min(5).max(20).required(),
        password: Joi.string().min(4).max(50).required()
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
    }),
    banUser: Joi.object({
        userId: Joi.string().required(),
        reason: Joi.string().min(5).max(200).required(),
        duration: Joi.number().optional(),
        adminId: Joi.string().required()
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
    logger.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
}

function generateToken(userId) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
}

function authenticateToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token' });
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, message: 'Invalid token' });
        req.user = user;
        next();
    });
}

async function hashPassword(password, userId) {
    return await bcrypt.hash(password + PEPPER + userId, SALT_ROUNDS);
}

async function verifyPassword(input, storedHash, userId) {
    return await bcrypt.compare(input + PEPPER + userId, storedHash);
}

function checkIfBanned(userId) {
    const ban = dataStore.bannedUsers[userId];
    if (!ban || !ban.active) return null;
    
    if (ban.duration && Date.now() > ban.bannedAt + ban.duration) {
        ban.active = false;
        saveData();
        return null;
    }
    
    return ban;
}

function registerDevice(userId, deviceInfo) {
    if (!dataStore.userDevices[userId]) {
        dataStore.userDevices[userId] = [];
    }
    
    const deviceId = deviceInfo.userAgent + deviceInfo.platform;
    const existing = dataStore.userDevices[userId].find(d => d.id === deviceId);
    
    if (!existing) {
        dataStore.userDevices[userId].push({
            id: deviceId,
            userAgent: deviceInfo.userAgent,
            platform: deviceInfo.platform,
            firstSeen: new Date().toISOString(),
            lastSeen: new Date().toISOString()
        });
    } else {
        existing.lastSeen = new Date().toISOString();
    }
    
    saveData();
}

function trackActivity(userId, action) {
    if (!dataStore.userAnalytics[userId]) {
        dataStore.userAnalytics[userId] = {
            logins: 0,
            messagesSent: 0,
            broadcastsSent: 0,
            ticketsCreated: 0,
            lastActivity: null,
            activities: []
        };
    }
    
    const analytics = dataStore.userAnalytics[userId];
    
    switch(action) {
        case 'login':
            analytics.logins++;
            break;
        case 'message':
            analytics.messagesSent++;
            break;
        case 'broadcast':
            analytics.broadcastsSent++;
            break;
        case 'ticket':
            analytics.ticketsCreated++;
            break;
    }
    
    analytics.lastActivity = new Date().toISOString();
    analytics.activities.push({
        action,
        timestamp: new Date().toISOString()
    });
    
    if (analytics.activities.length > 100) {
        analytics.activities.shift();
    }
    
    saveData();
}

app.post('/api/login', loginLimiter, async (req, res, next) => {
    try {
        const { userId, password, deviceInfo } = validateInput(req.body, schemas.login);
        
        const ban = checkIfBanned(userId);
        if (ban) {
            logger.warn(`Banned user attempted login: ${userId}`);
            return res.status(403).json({ 
                success: false, 
                message: `Account banned: ${ban.reason}` 
            });
        }
        
        const user = dataStore.users[userId];
        
        if (!user) {
            logger.warn(`Failed login attempt for non-existent user: ${userId} from IP: ${req.ip}`);
            return res.status(404).json({ 
                success: false, 
                message: 'User not found. Click "NEW OPERATOR?" to request access.' 
            });
        }
        
        if (!user.approved) {
            return res.status(403).json({ 
                success: false, 
                message: 'Account pending approval' 
            });
        }
        
        if (user.password && password) {
            const validPassword = await verifyPassword(password, user.password, userId);
            if (!validPassword) {
                logger.warn(`Failed password for userId: ${userId} from IP: ${req.ip}`);
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid password' 
                });
            }
        }
        
        if (deviceInfo) {
            registerDevice(userId, deviceInfo);
        }
        
        trackActivity(userId, 'login');
        
        dataStore.onlineUsers[userId] = {
            userId,
            name: user.name,
            loginTime: new Date().toISOString()
        };
        saveData();
        
        const token = generateToken(userId);
        
        io.emit('user_online', { userId, name: user.name });
        
        res.json({
            success: true,
            token,
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

app.post('/api/create-account', loginLimiter, async (req, res, next) => {
    try {
        const { userId, password } = validateInput(req.body, schemas.createAccount);
        
        if (dataStore.users[userId]) {
            return res.status(400).json({ 
                success: false, 
                message: 'User ID already exists' 
            });
        }
        
        if (dataStore.pendingUsers.find(p => p.userId === userId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Already pending approval' 
            });
        }
        
        const hashedPassword = await hashPassword(password, userId);
        
        dataStore.pendingUsers.push({
            userId,
            password: hashedPassword,
            requestedAt: new Date().toISOString()
        });
        saveData();
        
        io.emit('pending_update', dataStore.pendingUsers);
        
        logger.info(`New account request: ${userId}`);
        
        res.json({ 
            success: true, 
            message: 'Account request sent. Please wait for admin approval.' 
        });
    } catch (error) {
        next(error);
    }
});

app.get('/api/pending', (req, res) => {
    const pending = dataStore.pendingUsers.map(p => p.userId);
    res.json({ pending });
});

app.post('/api/approve', authenticateToken, async (req, res, next) => {
    try {
        const { userId, adminId } = req.body;
        
        if (adminId !== ADMIN_ID) {
            return res.status(403).json({ 
                success: false, 
                message: 'Not authorized' 
            });
        }
        
        const pendingUser = dataStore.pendingUsers.find(p => p.userId === userId);
        if (!pendingUser) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not in pending list' 
            });
        }
        
        dataStore.pendingUsers = dataStore.pendingUsers.filter(p => p.userId !== userId);
        
        dataStore.users[userId] = {
            id: userId,
            name: `Operator_${userId.slice(-4)}`,
            password: pendingUser.password,
            approved: true,
            isAdmin: false,
            avatar: 'assets/sprites/normal.png',
            createdAt: new Date().toISOString()
        };
        saveData();
        
        io.emit('pending_update', dataStore.pendingUsers.map(p => p.userId));
        io.emit('user_approved', { userId });
        
        logger.info(`User approved: ${userId}`);
        
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

app.post('/api/deny', authenticateToken, (req, res, next) => {
    try {
        const { userId, adminId } = req.body;
        
        if (adminId !== ADMIN_ID) {
            return res.status(403).json({ 
                success: false, 
                message: 'Not authorized' 
            });
        }
        
        dataStore.pendingUsers = dataStore.pendingUsers.filter(p => p.userId !== userId);
        saveData();
        
        io.emit('pending_update', dataStore.pendingUsers.map(p => p.userId));
        
        logger.info(`User denied: ${userId}`);
        
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

app.post('/api/ban-user', authenticateToken, (req, res, next) => {
    try {
        const validData = validateInput(req.body, schemas.banUser);
        
        if (validData.adminId !== ADMIN_ID) {
            return res.status(403).json({ 
                success: false, 
                message: 'Not authorized' 
            });
        }
        
        if (validData.userId === ADMIN_ID) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot ban admin' 
            });
        }
        
        dataStore.bannedUsers[validData.userId] = {
            reason: validData.reason,
            duration: validData.duration,
            bannedAt: Date.now(),
            bannedBy: ADMIN_ID,
            active: true
        };
        
        if (dataStore.onlineUsers[validData.userId]) {
            delete dataStore.onlineUsers[validData.userId];
        }
        
        saveData();
        
        io.emit('user_banned', { 
            userId: validData.userId, 
            reason: validData.reason 
        });
        
        logger.info(`User banned: ${validData.userId} - Reason: ${validData.reason}`);
        
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

app.post('/api/unban-user', authenticateToken, (req, res) => {
    const { userId, adminId } = req.body;
    
    if (adminId !== ADMIN_ID) {
        return res.status(403).json({ 
            success: false, 
            message: 'Not authorized' 
        });
    }
    
    if (dataStore.bannedUsers[userId]) {
        dataStore.bannedUsers[userId].active = false;
        saveData();
        
        io.emit('user_unbanned', userId);
        logger.info(`User unbanned: ${userId}`);
    }
    
    res.json({ success: true });
});

app.get('/api/banned-users', authenticateToken, (req, res) => {
    const { adminId } = req.query;
    
    if (adminId !== ADMIN_ID) {
        return res.status(403).json({ 
            success: false, 
            message: 'Unauthorized' 
        });
    }
    
    const banned = Object.entries(dataStore.bannedUsers)
        .filter(([_, ban]) => ban.active)
        .map(([userId, ban]) => ({
            userId,
            ...ban
        }));
    
    res.json({ success: true, banned });
});

app.get('/api/user-analytics', authenticateToken, (req, res) => {
    const { userId, adminId } = req.query;
    
    if (adminId !== ADMIN_ID && userId !== req.user.userId) {
        return res.status(403).json({ 
            success: false, 
            message: 'Unauthorized' 
        });
    }
    
    const targetId = userId || req.user.userId;
    const analytics = dataStore.userAnalytics[targetId] || {
        logins: 0,
        messagesSent: 0,
        broadcastsSent: 0,
        ticketsCreated: 0,
        activities: []
    };
    
    res.json({ success: true, analytics });
});

app.get('/api/all-analytics', authenticateToken, (req, res) => {
    const { adminId } = req.query;
    
    if (adminId !== ADMIN_ID) {
        return res.status(403).json({ 
            success: false, 
            message: 'Unauthorized' 
        });
    }
    
    const allAnalytics = Object.entries(dataStore.userAnalytics).map(([userId, data]) => ({
        userId,
        userName: dataStore.users[userId]?.name || 'Unknown',
        ...data
    }));
    
    res.json({ success: true, analytics: allAnalytics });
});

app.get('/api/user-devices', authenticateToken, (req, res) => {
    const { userId, adminId } = req.query;
    
    if (adminId !== ADMIN_ID && userId !== req.user.userId) {
        return res.status(403).json({ 
            success: false, 
            message: 'Unauthorized' 
        });
    }
    
    const targetId = userId || req.user.userId;
    const devices = dataStore.userDevices[targetId] || [];
    
    res.json({ success: true, devices });
});

app.post('/api/radio/clear', authenticateToken, (req, res) => {
    const { frequency, adminId } = req.body;
    
    if (adminId !== ADMIN_ID) {
        return res.status(403).json({ 
            success: false, 
            message: 'Not authorized' 
        });
    }
    
    if (frequency) {
        dataStore.radioMessages[frequency] = [];
    } else {
        dataStore.radioMessages = {};
    }
    
    saveData();
    
    io.emit('radio_cleared', frequency);
    
    res.json({ success: true });
});

app.get('/api/radio/messages', (req, res) => {
    const { frequency } = req.query;
    
    const messages = dataStore.radioMessages[frequency] || [];
    
    res.json({ success: true, messages });
});

app.post('/api/broadcast', authenticateToken, (req, res, next) => {
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
        
        trackActivity(ADMIN_ID, 'broadcast');
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

app.post('/api/ticket', authenticateToken, (req, res, next) => {
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
        trackActivity(validData.userId, 'ticket');
        saveData();
        
        io.emit('ticket_created', ticket);
        
        res.json({ success: true, ticket });
    } catch (error) {
        next(error);
    }
});

app.get('/api/tickets', authenticateToken, (req, res) => {
    const { userId } = req.query;
    
    let tickets = dataStore.tickets;
    if (userId && userId !== ADMIN_ID) {
        tickets = tickets.filter(t => t.userId === userId);
    }
    
    res.json({ success: true, tickets });
});

app.post('/api/ticket/respond', authenticateToken, (req, res) => {
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

app.post('/api/ticket/close', authenticateToken, (req, res) => {
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

app.post('/api/alarm', authenticateToken, (req, res) => {
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

app.post('/api/alarm/dismiss', authenticateToken, (req, res) => {
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

app.post('/api/update-profile', authenticateToken, (req, res, next) => {
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

app.get('/api/users', authenticateToken, (req, res) => {
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
            isOnline: !!dataStore.onlineUsers[u.id],
            isBanned: dataStore.bannedUsers[u.id]?.active || false
        }));
    
    res.json({ success: true, users: activeUsers });
});

app.get('/api/system-status', (req, res) => {
    const stats = {
        totalUsers: Object.keys(dataStore.users).length,
        onlineUsers: Object.keys(dataStore.onlineUsers).length,
        pendingApprovals: dataStore.pendingUsers.length,
        activeTickets: dataStore.tickets.filter(t => t.status === 'open').length,
        activeAlarms: dataStore.alarms.filter(a => a.active).length,
        totalBroadcasts: dataStore.broadcasts.length,
        bannedUsers: Object.values(dataStore.bannedUsers).filter(b => b.active).length
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
            
            trackActivity(validData.senderId, 'message');
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
        if (dataStore.radioMessages[frequency].length > 100) {
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
    console.log(`Default Admin Password: 2041`);
    logger.info('ARCS Server started successfully');
});