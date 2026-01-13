/**
 * ARCS - Advanced Research & Containment System
 * Server v3.2.2 - CORRIGIDO E DEFINITIVO
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

// ==================== MIDDLEWARE (ROTAS ESTÁTICAS CORRIGIDAS) ====================
app.use(express.json());

// 1. Servir pastas estáticas explicitamente
// Isso garante que /css venha da pasta 'css' na raiz, /assets venha de 'assets', etc.
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 2. Servir o index.html na rota raiz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rate Limiting
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15,
    message: { success: false, message: 'Too many attempts. Try again later.' }
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
    systemLog: []
};

// ==================== ENCRYPTION ====================
function encryptData(data) {
    try {
        return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
    } catch (e) {
        console.error('Encryption error', e);
        return null;
    }
}

function decryptData(encrypted) {
    try {
        const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
        return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch (e) {
        console.error('Decryption error', e);
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
        console.error('Save data error', e);
    }
}

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const encrypted = fs.readFileSync(DATA_FILE, 'utf8');
            const decrypted = decryptData(encrypted);
            if (decrypted) {
                dataStore = { ...dataStore, ...decrypted };
                dataStore.onlineUsers = {}; // Limpar users online ao reiniciar
            }
        }
    } catch (e) {
        console.error('Load data error', e);
    }
}

// ==================== LOGGING ====================
function log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type}] ${message}`;
    console.log(logEntry);
    
    dataStore.systemLog.push({ timestamp, type, message });
    if (dataStore.systemLog.length > 500) {
        dataStore.systemLog = dataStore.systemLog.slice(-500);
    }
}

function logError(message, error) {
    log(`${message}: ${error.message}`, 'ERROR');
}

// ==================== AUTH & SECURITY ====================
async function hashPassword(password, salt) {
    return await bcrypt.hash(password + PEPPER + salt, SALT_ROUNDS);
}

async function verifyPassword(input, storedHash, salt) {
    return await bcrypt.compare(input + PEPPER + salt, storedHash);
}

function generateToken(userId, isAdmin = false) {
    return jwt.sign({ userId, isAdmin }, JWT_SECRET, { expiresIn: '24h' });
}

function verifyToken(token) {
    try { return jwt.verify(token, JWT_SECRET); } catch (e) { return null; }
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });
    
    const decoded = verifyToken(token);
    if (!decoded) return res.status(403).json({ success: false, message: 'Invalid token' });
    
    req.user = decoded;
    next();
}

function requireAdmin(req, res, next) {
    if (!req.user || !req.user.isAdmin) return res.status(403).json({ success: false, message: 'Admin access required' });
    next();
}

// ==================== VALIDATION SCHEMAS ====================
const schemas = {
    login: Joi.object({
        userId: Joi.string().required(),
        password: Joi.string().allow('').optional()
    }),
    register: Joi.object({ userId: Joi.string().required() }),
    broadcast: Joi.object({
        text: Joi.string().required(),
        sprite: Joi.string().default('normal')
    }),
    radioMessage: Joi.object({ text: Joi.string().required() }),
    updateUser: Joi.object({
        name: Joi.string().optional(),
        status: Joi.string().valid('active', 'banned').optional()
    }),
    customTab: Joi.object({
        name: Joi.string().required(),
        content: Joi.string().required()
    }),
    welcome: Joi.object({
        title: Joi.string().required(),
        text: Joi.string().required()
    })
};

function validate(data, schema) {
    const { error, value } = schema.validate(data);
    if (error) throw new Error(error.details[0].message);
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

// ==================== ROUTES ====================

app.get('/api/health', (req, res) => res.json({ success: true, status: 'online' }));

// Login
app.post('/api/login', loginLimiter, async (req, res) => {
    try {
        const { userId, password } = validate(req.body, schemas.login);
        const normalizedId = userId.toUpperCase();
        const user = dataStore.users[normalizedId];
        
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        if (user.status === 'banned') return res.status(403).json({ success: false, message: 'Account banned.' });
        if (!user.approved) return res.status(403).json({ success: false, message: 'Account pending approval.' });
        
        // Admin Password Check
        if (user.isAdmin) {
            if (!password) return res.status(401).json({ success: false, message: 'Password required for admin.' });
            const valid = await verifyPassword(password, user.password, normalizedId);
            if (!valid) return res.status(401).json({ success: false, message: 'Invalid password.' });
        }
        
        const token = generateToken(normalizedId, user.isAdmin);
        dataStore.onlineUsers[normalizedId] = { id: normalizedId, name: user.name };
        saveData();
        io.emit('user:online', { userId: normalizedId, name: user.name });
        
        res.json({ success: true, token, user: { id: user.id, name: user.name, isAdmin: user.isAdmin, status: user.status } });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
});

// Register
app.post('/api/register', loginLimiter, (req, res) => {
    try {
        const { userId } = validate(req.body, schemas.register);
        const normalizedId = userId.toUpperCase();
        
        if (dataStore.users[normalizedId]) return res.status(400).json({ success: false, message: 'ID taken.' });
        if (dataStore.pendingUsers.some(p => p.userId === normalizedId)) return res.status(400).json({ success: false, message: 'Already pending.' });
        
        dataStore.pendingUsers.push({ userId: normalizedId, requestedAt: Date.now() });
        saveData();
        io.to('admins').emit('pending:new', { userId: normalizedId });
        
        res.json({ success: true, message: 'Request sent.' });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
});

// Features & Data Routes (Simplified for brevity but fully functional)
app.get('/api/pending', authenticateToken, requireAdmin, (req, res) => res.json({ success: true, pending: dataStore.pendingUsers }));
app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
    const users = Object.values(dataStore.users).map(u => ({ id: u.id, name: u.name, status: u.status, isAdmin: u.isAdmin }));
    res.json({ success: true, users });
});

// Approve/Deny
app.post('/api/users/approve', authenticateToken, requireAdmin, (req, res) => {
    const { userId } = req.body;
    const normalizedId = userId.toUpperCase();
    dataStore.pendingUsers = dataStore.pendingUsers.filter(p => p.userId !== normalizedId);
    dataStore.users[normalizedId] = {
        id: normalizedId, name: `Operator_${normalizedId.slice(-4)}`,
        approved: true, status: 'active', isAdmin: false, createdAt: Date.now()
    };
    saveData();
    io.emit('user:approved', { userId: normalizedId });
    res.json({ success: true });
});

app.post('/api/users/deny', authenticateToken, requireAdmin, (req, res) => {
    const normalizedId = req.body.userId.toUpperCase();
    dataStore.pendingUsers = dataStore.pendingUsers.filter(p => p.userId !== normalizedId);
    saveData();
    res.json({ success: true });
});

// Ban/Unban/Edit
app.post('/api/users/:userId/ban', authenticateToken, requireAdmin, (req, res) => {
    if (dataStore.users[req.params.userId] && !dataStore.users[req.params.userId].isAdmin) {
        dataStore.users[req.params.userId].status = 'banned';
        saveData();
    }
    res.json({ success: true });
});
app.post('/api/users/:userId/unban', authenticateToken, requireAdmin, (req, res) => {
    if (dataStore.users[req.params.userId]) {
        dataStore.users[req.params.userId].status = 'active';
        saveData();
    }
    res.json({ success: true });
});
app.put('/api/users/:userId', authenticateToken, requireAdmin, (req, res) => {
    const user = dataStore.users[req.params.userId];
    if (user && (!user.isAdmin || req.user.userId === ADMIN_ID)) {
        if(req.body.name) user.name = req.body.name;
        if(req.body.status) user.status = req.body.status;
        saveData();
    }
    res.json({ success: true });
});

// Broadcast & Radio
app.post('/api/broadcast', authenticateToken, requireAdmin, (req, res) => {
    const data = validate(req.body, schemas.broadcast);
    const item = { ...data, id: Date.now().toString(), senderId: req.user.userId, timestamp: Date.now() };
    dataStore.broadcasts.push(item);
    if(dataStore.broadcasts.length > 50) dataStore.broadcasts.shift();
    saveData();
    io.emit('broadcast:new', item);
    res.json({ success: true });
});
app.get('/api/radio', (req, res) => res.json({ success: true, messages: dataStore.radioMessages }));
app.post('/api/radio', authenticateToken, (req, res) => {
    const data = validate(req.body, schemas.radioMessage);
    const user = dataStore.users[req.user.userId];
    const item = { id: Date.now().toString(), userId: req.user.userId, user: user?.name || '?', text: data.text, timestamp: Date.now() };
    dataStore.radioMessages.push(item);
    if(dataStore.radioMessages.length > 200) dataStore.radioMessages.shift();
    saveData();
    io.emit('radio:message', item);
    res.json({ success: true });
});
app.delete('/api/radio', authenticateToken, requireAdmin, (req, res) => {
    dataStore.radioMessages = [];
    saveData();
    io.emit('radio:cleared');
    res.json({ success: true });
});

// Tabs & Welcome
app.get('/api/tabs', (req, res) => res.json({ success: true, tabs: dataStore.customTabs, published: dataStore.publishedTabs }));
app.post('/api/tabs', authenticateToken, requireAdmin, (req, res) => {
    const data = validate(req.body, schemas.customTab);
    dataStore.customTabs.push({ ...data, id: Date.now().toString(), createdAt: Date.now() });
    saveData();
    res.json({ success: true });
});
app.delete('/api/tabs/:id', authenticateToken, requireAdmin, (req, res) => {
    dataStore.customTabs = dataStore.customTabs.filter(t => t.id !== req.params.id);
    dataStore.publishedTabs = dataStore.publishedTabs.filter(t => t.id !== req.params.id);
    saveData();
    res.json({ success: true });
});
app.post('/api/tabs/publish', authenticateToken, requireAdmin, (req, res) => {
    dataStore.publishedTabs = [...dataStore.customTabs];
    saveData();
    io.emit('tabs:published', dataStore.publishedTabs);
    res.json({ success: true });
});
app.get('/api/welcome', (req, res) => res.json({ success: true, welcome: dataStore.welcome }));
app.put('/api/welcome', authenticateToken, requireAdmin, (req, res) => {
    dataStore.welcome = req.body;
    saveData();
    io.emit('welcome:updated', req.body);
    res.json({ success: true });
});

app.get('/api/analytics', authenticateToken, requireAdmin, (req, res) => {
    res.json({ success: true, analytics: {
        totalUsers: Object.keys(dataStore.users).length,
        onlineUsers: Object.keys(dataStore.onlineUsers).length,
        totalBroadcasts: dataStore.broadcasts.length,
        totalRadioMessages: dataStore.radioMessages.length
    }});
});

// Socket
io.on('connection', (socket) => {
    socket.on('register', (data) => {
        if (data?.userId) {
            socket.userId = data.userId;
            socket.join(data.userId);
            if (data.isAdmin) socket.join('admins');
        }
    });
    socket.on('disconnect', () => {
        if (socket.userId && dataStore.onlineUsers[socket.userId]) {
            delete dataStore.onlineUsers[socket.userId];
            saveData();
            io.emit('user:offline', { userId: socket.userId });
        }
    });
});

// Start
loadData();
initializeAdmin().then(() => {
    server.listen(PORT, () => {
        console.log(`ARCS Server running on port ${PORT}`);
        console.log(`Admin: ${ADMIN_ID} | Pass: ${ADMIN_PASSWORD}`);
    });
});