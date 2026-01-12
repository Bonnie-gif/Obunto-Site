/**
 * ARCS - Advanced Research & Containment System
 * Server v3.2.2
 * 
 * Backend server with Express, Socket.io, authentication,
 * encrypted data storage, and real-time features.
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const CryptoJS = require('crypto-js');

// ==================== CONFIGURATION ====================
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Environment Variables
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'arcs_jwt_secret_v322_secure';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'arcs_encryption_v322';
const PEPPER = process.env.PEPPER || 'arcs_pepper_2041';
const SALT_ROUNDS = 12;

// Admin Configuration
const ADMIN_ID = '118107921024376';
const ADMIN_PASSWORD = '2041';
const ADMIN_NAME = 'OBUNTO';

// File Paths
const DATA_FILE = path.join(__dirname, 'data', 'arcs_data.enc');
const LOG_FILE = path.join(__dirname, 'data', 'arcs.log');

// ==================== MIDDLEWARE ====================
app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate Limiting
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15,
    message: { success: false, message: 'Too many attempts. Try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100,
    message: { success: false, message: 'Rate limit exceeded.' }
});

// ==================== DATA STORE ====================
let dataStore = {
    users: {},
    pendingUsers: [],
    broadcasts: [],
    messages: [],
    radioMessages: [],
    customTabs: [],
    publishedTabs: [],
    welcome: {
        title: 'WELCOME',
        text: 'WELCOME TO ARCS V3.2.2. SELECT A MODULE FROM THE MENU BAR TO BEGIN OPERATIONS.'
    },
    onlineUsers: {},
    alarmTheme: 'green',
    systemLog: []
};

// ==================== ENCRYPTION ====================
function encryptData(data) {
    try {
        return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
    } catch (e) {
        logError('Encryption error', e);
        return null;
    }
}

function decryptData(encrypted) {
    try {
        const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
        return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch (e) {
        logError('Decryption error', e);
        return null;
    }
}

// ==================== DATA PERSISTENCE ====================
function ensureDataDirectory() {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
}

function saveData() {
    try {
        ensureDataDirectory();
        const encrypted = encryptData(dataStore);
        if (encrypted) {
            fs.writeFileSync(DATA_FILE, encrypted, 'utf8');
        }
    } catch (e) {
        logError('Save data error', e);
    }
}

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const encrypted = fs.readFileSync(DATA_FILE, 'utf8');
            const decrypted = decryptData(encrypted);
            if (decrypted) {
                dataStore = { ...dataStore, ...decrypted };
            }
        }
    } catch (e) {
        logError('Load data error', e);
    }
}

// ==================== LOGGING ====================
function log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type}] ${message}`;
    console.log(logEntry);
    
    // Add to system log
    dataStore.systemLog.push({
        timestamp,
        type,
        message
    });
    
    // Keep only last 500 log entries
    if (dataStore.systemLog.length > 500) {
        dataStore.systemLog = dataStore.systemLog.slice(-500);
    }
    
    // Write to file
    try {
        ensureDataDirectory();
        fs.appendFileSync(LOG_FILE, logEntry + '\n');
    } catch (e) {
        console.error('Log write error:', e);
    }
}

function logError(message, error) {
    log(`${message}: ${error.message}`, 'ERROR');
}

// ==================== PASSWORD HASHING ====================
async function hashPassword(password, salt) {
    return await bcrypt.hash(password + PEPPER + salt, SALT_ROUNDS);
}

async function verifyPassword(input, storedHash, salt) {
    return await bcrypt.compare(input + PEPPER + salt, storedHash);
}

// ==================== JWT ====================
function generateToken(userId, isAdmin = false) {
    return jwt.sign({ userId, isAdmin }, JWT_SECRET, { expiresIn: '24h' });
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (e) {
        return null;
    }
}

// Authentication Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(403).json({ success: false, message: 'Invalid token' });
    }
    
    req.user = decoded;
    next();
}

// Admin Check Middleware
function requireAdmin(req, res, next) {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
}

// ==================== VALIDATION SCHEMAS ====================
const schemas = {
    login: Joi.object({
        userId: Joi.string().min(3).max(30).required(),
        password: Joi.string().max(50).allow('').optional()
    }),
    
    register: Joi.object({
        userId: Joi.string().min(3).max(30).required()
    }),
    
    broadcast: Joi.object({
        text: Joi.string().min(1).max(500).required(),
        sprite: Joi.string().valid(
            'normal', 'happy', 'sad', 'angry', 'confused', 
            'annoyed', 'bug', 'dizzy', 'hollow', 'panic',
            'sleeping', 'smug', 'stare', 'suspicious', 'werror'
        ).default('normal')
    }),
    
    radioMessage: Joi.object({
        text: Joi.string().min(1).max(500).required()
    }),
    
    chatMessage: Joi.object({
        recipientId: Joi.string().required(),
        text: Joi.string().min(1).max(1000).required()
    }),
    
    updateUser: Joi.object({
        name: Joi.string().min(2).max(50).optional(),
        status: Joi.string().valid('active', 'banned').optional()
    }),
    
    customTab: Joi.object({
        name: Joi.string().min(1).max(50).required(),
        content: Joi.string().min(1).max(5000).required()
    }),
    
    welcome: Joi.object({
        title: Joi.string().min(1).max(100).required(),
        text: Joi.string().min(1).max(1000).required()
    })
};

function validate(data, schema) {
    const { error, value } = schema.validate(data);
    if (error) {
        throw new Error(error.details[0].message);
    }
    return value;
}

// ==================== INITIALIZATION ====================
async function initializeAdmin() {
    if (!dataStore.users[ADMIN_ID]) {
        const hashedPassword = await hashPassword(ADMIN_PASSWORD, ADMIN_ID);
        dataStore.users[ADMIN_ID] = {
            id: ADMIN_ID,
            name: ADMIN_NAME,
            password: hashedPassword,
            approved: true,
            status: 'active',
            isAdmin: true,
            createdAt: Date.now()
        };
        saveData();
        log(`Admin account created: ${ADMIN_ID}`);
    }
}

// ==================== API ROUTES ====================

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        status: 'online',
        version: '3.2.2',
        timestamp: new Date().toISOString()
    });
});

// ==================== AUTH ROUTES ====================

// Login
app.post('/api/login', loginLimiter, async (req, res) => {
    try {
        const { userId, password } = validate(req.body, schemas.login);
        const normalizedId = userId.toUpperCase();
        
        const user = dataStore.users[normalizedId];
        
        if (!user) {
            log(`Login failed - User not found: ${normalizedId}`, 'WARN');
            return res.status(404).json({ 
                success: false, 
                message: 'User not found. Use NEW OPERATOR to request access.' 
            });
        }
        
        if (user.status === 'banned') {
            log(`Login blocked - User banned: ${normalizedId}`, 'WARN');
            return res.status(403).json({ 
                success: false, 
                message: 'Account banned. Contact administrator.' 
            });
        }
        
        if (!user.approved) {
            return res.status(403).json({ 
                success: false, 
                message: 'Account pending approval.' 
            });
        }
        
        // Check password for admin
        if (user.isAdmin) {
            if (!password) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Password required for admin.' 
                });
            }
            
            const validPassword = await verifyPassword(password, user.password, normalizedId);
            if (!validPassword) {
                log(`Login failed - Invalid password: ${normalizedId}`, 'WARN');
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid password.' 
                });
            }
        }
        
        // Generate token
        const token = generateToken(normalizedId, user.isAdmin);
        
        // Update online status
        dataStore.onlineUsers[normalizedId] = {
            id: normalizedId,
            name: user.name,
            loginTime: Date.now()
        };
        saveData();
        
        // Emit online event
        io.emit('user:online', { userId: normalizedId, name: user.name });
        
        log(`User logged in: ${normalizedId}`);
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                isAdmin: user.isAdmin,
                status: user.status
            }
        });
        
    } catch (e) {
        logError('Login error', e);
        res.status(400).json({ success: false, message: e.message });
    }
});

// Register (New Operator)
app.post('/api/register', loginLimiter, async (req, res) => {
    try {
        const { userId } = validate(req.body, schemas.register);
        const normalizedId = userId.toUpperCase();
        
        // Check if user exists
        if (dataStore.users[normalizedId]) {
            return res.status(400).json({ 
                success: false, 
                message: 'User ID already exists.' 
            });
        }
        
        // Check if already pending
        if (dataStore.pendingUsers.some(p => p.userId === normalizedId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Already in approval queue.' 
            });
        }
        
        // Add to pending queue
        dataStore.pendingUsers.push({
            userId: normalizedId,
            requestedAt: Date.now()
        });
        saveData();
        
        // Notify admins
        io.to('admins').emit('pending:new', { userId: normalizedId });
        
        log(`New operator request: ${normalizedId}`);
        
        res.json({ 
            success: true, 
            message: 'Request sent. Save your ID and wait for approval.',
            userId: normalizedId
        });
        
    } catch (e) {
        logError('Register error', e);
        res.status(400).json({ success: false, message: e.message });
    }
});

// Logout
app.post('/api/logout', authenticateToken, (req, res) => {
    const { userId } = req.user;
    
    delete dataStore.onlineUsers[userId];
    saveData();
    
    io.emit('user:offline', { userId });
    
    log(`User logged out: ${userId}`);
    
    res.json({ success: true });
});

// ==================== USER MANAGEMENT ====================

// Get Pending Users
app.get('/api/pending', authenticateToken, requireAdmin, (req, res) => {
    res.json({ 
        success: true, 
        pending: dataStore.pendingUsers 
    });
});

// Approve User
app.post('/api/users/approve', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.body;
        const normalizedId = userId.toUpperCase();
        
        const pendingIndex = dataStore.pendingUsers.findIndex(p => p.userId === normalizedId);
        if (pendingIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not in pending queue.' 
            });
        }
        
        // Remove from pending
        dataStore.pendingUsers.splice(pendingIndex, 1);
        
        // Create user account
        dataStore.users[normalizedId] = {
            id: normalizedId,
            name: `Operator_${normalizedId.slice(-4)}`,
            approved: true,
            status: 'active',
            isAdmin: false,
            createdAt: Date.now()
        };
        saveData();
        
        // Notify
        io.emit('user:approved', { userId: normalizedId });
        
        log(`User approved: ${normalizedId} by ${req.user.userId}`);
        
        res.json({ success: true });
        
    } catch (e) {
        logError('Approve error', e);
        res.status(400).json({ success: false, message: e.message });
    }
});

// Deny User
app.post('/api/users/deny', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { userId } = req.body;
        const normalizedId = userId.toUpperCase();
        
        dataStore.pendingUsers = dataStore.pendingUsers.filter(p => p.userId !== normalizedId);
        saveData();
        
        log(`User denied: ${normalizedId} by ${req.user.userId}`);
        
        res.json({ success: true });
        
    } catch (e) {
        logError('Deny error', e);
        res.status(400).json({ success: false, message: e.message });
    }
});

// Get All Users
app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
    const users = Object.values(dataStore.users).map(u => ({
        id: u.id,
        name: u.name,
        status: u.status,
        isAdmin: u.isAdmin,
        createdAt: u.createdAt,
        isOnline: !!dataStore.onlineUsers[u.id]
    }));
    
    res.json({ success: true, users });
});

// Update User
app.put('/api/users/:userId', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { userId } = req.params;
        const updates = validate(req.body, schemas.updateUser);
        
        const user = dataStore.users[userId];
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        
        // Prevent modifying admin
        if (user.isAdmin && req.user.userId !== ADMIN_ID) {
            return res.status(403).json({ success: false, message: 'Cannot modify admin.' });
        }
        
        if (updates.name) user.name = updates.name;
        if (updates.status) user.status = updates.status;
        
        saveData();
        
        log(`User updated: ${userId} by ${req.user.userId}`);
        
        res.json({ success: true, user });
        
    } catch (e) {
        logError('Update user error', e);
        res.status(400).json({ success: false, message: e.message });
    }
});

// Ban User
app.post('/api/users/:userId/ban', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = dataStore.users[userId];
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        
        if (user.isAdmin) {
            return res.status(403).json({ success: false, message: 'Cannot ban admin.' });
        }
        
        user.status = 'banned';
        delete dataStore.onlineUsers[userId];
        saveData();
        
        io.emit('user:banned', { userId });
        
        log(`User banned: ${userId} by ${req.user.userId}`);
        
        res.json({ success: true });
        
    } catch (e) {
        logError('Ban error', e);
        res.status(400).json({ success: false, message: e.message });
    }
});

// Unban User
app.post('/api/users/:userId/unban', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = dataStore.users[userId];
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        
        user.status = 'active';
        saveData();
        
        log(`User unbanned: ${userId} by ${req.user.userId}`);
        
        res.json({ success: true });
        
    } catch (e) {
        logError('Unban error', e);
        res.status(400).json({ success: false, message: e.message });
    }
});

// ==================== BROADCAST ====================

// Send Broadcast
app.post('/api/broadcast', authenticateToken, requireAdmin, (req, res) => {
    try {
        const data = validate(req.body, schemas.broadcast);
        
        const broadcast = {
            id: Date.now().toString(),
            text: data.text,
            sprite: data.sprite,
            senderId: req.user.userId,
            timestamp: Date.now()
        };
        
        dataStore.broadcasts.push(broadcast);
        
        // Keep only last 100 broadcasts
        if (dataStore.broadcasts.length > 100) {
            dataStore.broadcasts = dataStore.broadcasts.slice(-100);
        }
        
        saveData();
        
        // Emit to all clients
        io.emit('broadcast:new', broadcast);
        
        log(`Broadcast sent by ${req.user.userId}`);
        
        res.json({ success: true, broadcast });
        
    } catch (e) {
        logError('Broadcast error', e);
        res.status(400).json({ success: false, message: e.message });
    }
});

// Get Broadcasts
app.get('/api/broadcasts', (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    res.json({ 
        success: true, 
        broadcasts: dataStore.broadcasts.slice(-limit) 
    });
});

// ==================== RADIO ====================

// Send Radio Message
app.post('/api/radio', authenticateToken, (req, res) => {
    try {
        const data = validate(req.body, schemas.radioMessage);
        const user = dataStore.users[req.user.userId];
        
        const message = {
            id: Date.now().toString(),
            userId: req.user.userId,
            user: user ? user.name : 'Unknown',
            text: data.text,
            timestamp: Date.now()
        };
        
        dataStore.radioMessages.push(message);
        
        // Keep only last 200 messages
        if (dataStore.radioMessages.length > 200) {
            dataStore.radioMessages = dataStore.radioMessages.slice(-200);
        }
        
        saveData();
        
        io.emit('radio:message', message);
        
        res.json({ success: true, message });
        
    } catch (e) {
        logError('Radio error', e);
        res.status(400).json({ success: false, message: e.message });
    }
});

// Get Radio Messages
app.get('/api/radio', (req, res) => {
    res.json({ success: true, messages: dataStore.radioMessages });
});

// Delete Radio Message
app.delete('/api/radio/:messageId', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { messageId } = req.params;
        
        dataStore.radioMessages = dataStore.radioMessages.filter(m => m.id !== messageId);
        saveData();
        
        io.emit('radio:deleted', { messageId });
        
        res.json({ success: true });
        
    } catch (e) {
        logError('Delete radio error', e);
        res.status(400).json({ success: false, message: e.message });
    }
});

// Clear Radio Messages
app.delete('/api/radio', authenticateToken, requireAdmin, (req, res) => {
    dataStore.radioMessages = [];
    saveData();
    
    io.emit('radio:cleared');
    
    log(`Radio cleared by ${req.user.userId}`);
    
    res.json({ success: true });
});

// ==================== CHAT ====================

// Get Chat Messages
app.get('/api/chat/:recipientId', authenticateToken, (req, res) => {
    const { recipientId } = req.params;
    const userId = req.user.userId;
    
    const messages = dataStore.messages.filter(m => 
        (m.senderId === userId && m.recipientId === recipientId) ||
        (m.senderId === recipientId && m.recipientId === userId)
    );
    
    res.json({ success: true, messages });
});

// ==================== CUSTOM TABS ====================

// Create Tab
app.post('/api/tabs', authenticateToken, requireAdmin, (req, res) => {
    try {
        const data = validate(req.body, schemas.customTab);
        
        const tab = {
            id: Date.now().toString(),
            name: data.name,
            content: data.content,
            createdAt: Date.now()
        };
        
        dataStore.customTabs.push(tab);
        saveData();
        
        res.json({ success: true, tab });
        
    } catch (e) {
        logError('Create tab error', e);
        res.status(400).json({ success: false, message: e.message });
    }
});

// Get Tabs
app.get('/api/tabs', (req, res) => {
    res.json({ 
        success: true, 
        tabs: dataStore.customTabs,
        published: dataStore.publishedTabs 
    });
});

// Delete Tab
app.delete('/api/tabs/:tabId', authenticateToken, requireAdmin, (req, res) => {
    const { tabId } = req.params;
    
    dataStore.customTabs = dataStore.customTabs.filter(t => t.id !== tabId);
    dataStore.publishedTabs = dataStore.publishedTabs.filter(t => t.id !== tabId);
    saveData();
    
    res.json({ success: true });
});

// Publish Tabs
app.post('/api/tabs/publish', authenticateToken, requireAdmin, (req, res) => {
    dataStore.publishedTabs = [...dataStore.customTabs];
    saveData();
    
    io.emit('tabs:published', dataStore.publishedTabs);
    
    res.json({ success: true, published: dataStore.publishedTabs });
});

// ==================== WELCOME ====================

// Get Welcome
app.get('/api/welcome', (req, res) => {
    res.json({ success: true, welcome: dataStore.welcome });
});

// Update Welcome
app.put('/api/welcome', authenticateToken, requireAdmin, (req, res) => {
    try {
        const data = validate(req.body, schemas.welcome);
        
        dataStore.welcome = data;
        saveData();
        
        io.emit('welcome:updated', data);
        
        res.json({ success: true, welcome: dataStore.welcome });
        
    } catch (e) {
        logError('Update welcome error', e);
        res.status(400).json({ success: false, message: e.message });
    }
});

// ==================== ANALYTICS ====================

// Get Analytics
app.get('/api/analytics', authenticateToken, requireAdmin, (req, res) => {
    const analytics = {
        totalUsers: Object.keys(dataStore.users).length,
        activeUsers: Object.values(dataStore.users).filter(u => u.status === 'active').length,
        bannedUsers: Object.values(dataStore.users).filter(u => u.status === 'banned').length,
        pendingUsers: dataStore.pendingUsers.length,
        onlineUsers: Object.keys(dataStore.onlineUsers).length,
        totalBroadcasts: dataStore.broadcasts.length,
        totalRadioMessages: dataStore.radioMessages.length,
        totalChatMessages: dataStore.messages.length,
        customTabs: dataStore.customTabs.length
    };
    
    res.json({ success: true, analytics });
});

// Get System Log
app.get('/api/logs', authenticateToken, requireAdmin, (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    res.json({ 
        success: true, 
        logs: dataStore.systemLog.slice(-limit) 
    });
});

// ==================== SOCKET.IO ====================

io.on('connection', (socket) => {
    log(`Socket connected: ${socket.id}`);
    
    // Register user
    socket.on('register', (data) => {
        if (data && data.userId) {
            socket.userId = data.userId;
            socket.join(data.userId);
            
            // Join admin room if admin
            if (data.isAdmin) {
                socket.join('admins');
            }
            
            log(`Socket registered: ${data.userId}`);
        }
    });
    
    // Chat message
    socket.on('chat:send', (data) => {
        try {
            if (!socket.userId) return;
            
            const { recipientId, text } = data;
            const user = dataStore.users[socket.userId];
            
            const message = {
                id: Date.now().toString(),
                senderId: socket.userId,
                senderName: user ? user.name : 'Unknown',
                recipientId,
                text,
                timestamp: Date.now()
            };
            
            dataStore.messages.push(message);
            
            // Keep only last 1000 messages
            if (dataStore.messages.length > 1000) {
                dataStore.messages = dataStore.messages.slice(-1000);
            }
            
            saveData();
            
            // Send to recipient
            io.to(recipientId).emit('chat:message', message);
            // Send back to sender
            socket.emit('chat:message', message);
            
        } catch (e) {
            logError('Chat socket error', e);
        }
    });
    
    // Typing indicator
    socket.on('chat:typing', (data) => {
        if (data && data.recipientId) {
            io.to(data.recipientId).emit('chat:typing', {
                userId: socket.userId,
                isTyping: data.isTyping
            });
        }
    });
    
    // Disconnect
    socket.on('disconnect', () => {
        if (socket.userId) {
            delete dataStore.onlineUsers[socket.userId];
            saveData();
            io.emit('user:offline', { userId: socket.userId });
        }
        log(`Socket disconnected: ${socket.id}`);
    });
});

// ==================== ERROR HANDLING ====================

app.use((err, req, res, next) => {
    logError('Unhandled error', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// ==================== SERVER START ====================

async function startServer() {
    try {
        loadData();
        await initializeAdmin();
        
        server.listen(PORT, () => {
            console.log('====================================');
            console.log('   ARCS Server v3.2.2');
            console.log('====================================');
            console.log(`   Port: ${PORT}`);
            console.log(`   Admin ID: ${ADMIN_ID}`);
            console.log(`   Admin Password: ${ADMIN_PASSWORD}`);
            console.log('====================================');
            log('Server started successfully');
        });
        
    } catch (e) {
        logError('Server start error', e);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    log('Server shutting down...');
    saveData();
    process.exit(0);
});

process.on('SIGTERM', () => {
    log('Server terminating...');
    saveData();
    process.exit(0);
});

// Start server
startServer();

module.exports = { app, server, io };