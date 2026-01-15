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

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'arcs_jwt_secret_v322_secure';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'arcs_encryption_v322';
const PEPPER = process.env.PEPPER || 'arcs_pepper_2041';
const SALT_ROUNDS = 12;

const ADMIN_ID = '118107921024376';
const ADMIN_PASSWORD = '2041';
const ADMIN_NAME = 'OBUNTO';

const DATA_FILE = path.join(__dirname, 'data', 'arcs_data.enc');
const LOG_FILE = path.join(__dirname, 'data', 'arcs.log');

app.use(express.json());
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: { success: false, message: 'Too many attempts. Try again later.' }
});

let dataStore = {
    users: {},
    pendingUsers: [],
    broadcasts: [],
    messages: [],
    radioMessages: [],
    customTabs: [],
    publishedTabs: [],
    menuContents: [
        {
            id: 1,
            type: 'text',
            title: 'BEM-VINDO AO ARCS',
            content: 'Sistema de Pesquisa e Contenção Avançado - Versão 3.2.2',
            visible: true,
            order: 1
        }
    ],
    welcome: {
        title: 'WELCOME',
        text: 'WELCOME TO ARCS V3.2.2. SELECT A MODULE FROM THE MENU BAR TO BEGIN OPERATIONS.'
    },
    onlineUsers: {},
    systemLog: []
};

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

function saveData() {
    try {
        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        
        const encrypted = encryptData(dataStore);
        fs.writeFileSync(DATA_FILE, encrypted, 'utf8');
    } catch (e) {
        console.error('Save error', e);
    }
}

function loadData() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            console.log('No data file found. Starting fresh.');
            return;
        }
        
        const encrypted = fs.readFileSync(DATA_FILE, 'utf8');
        const decrypted = decryptData(encrypted);
        
        if (decrypted) {
            dataStore = { ...dataStore, ...decrypted };
            console.log('Data loaded successfully');
        }
    } catch (e) {
        console.error('Load error', e);
    }
}

function log(message) {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${message}\n`;
    dataStore.systemLog.push({ timestamp, message });
    if (dataStore.systemLog.length > 1000) dataStore.systemLog.shift();
    
    try {
        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        fs.appendFileSync(LOG_FILE, entry);
    } catch (e) {
        console.error('Log error', e);
    }
}

async function hashPassword(password, userId) {
    const peppered = password + PEPPER + userId;
    return await bcrypt.hash(peppered, SALT_ROUNDS);
}

async function verifyPassword(password, hash, userId) {
    const peppered = password + PEPPER + userId;
    return await bcrypt.compare(peppered, hash);
}

function generateToken(userId, isAdmin) {
    return jwt.sign({ userId, isAdmin }, JWT_SECRET, { expiresIn: '24h' });
}

function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token' });
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, message: 'Invalid token' });
        req.user = user;
        next();
    });
}

function requireAdmin(req, res, next) {
    if (!req.user?.isAdmin) return res.status(403).json({ success: false, message: 'Admin required' });
    next();
}

const schemas = {
    login: Joi.object({
        userId: Joi.string().required(),
        password: Joi.string().optional()
    }),
    register: Joi.object({
        userId: Joi.string().required()
    }),
    broadcast: Joi.object({
        text: Joi.string().required(),
        sprite: Joi.string().optional()
    }),
    radioMessage: Joi.object({
        text: Joi.string().required()
    }),
    updateUser: Joi.object({
        name: Joi.string().optional(),
        status: Joi.string().valid('active', 'banned').optional(),
        clearance: Joi.number().min(1).max(5).optional(),
        role: Joi.string().optional(),
        department: Joi.string().optional()
    }),
    customTab: Joi.object({
        name: Joi.string().required(),
        content: Joi.string().required()
    }),
    welcome: Joi.object({
        title: Joi.string().required(),
        text: Joi.string().required()
    }),
    contents: Joi.object({
        contents: Joi.array().items(Joi.object({
            id: Joi.number().required(),
            type: Joi.string().valid('text', 'image', 'link').required(),
            title: Joi.string().allow('').optional(),
            content: Joi.string().allow('').optional(),
            imageUrl: Joi.string().allow('').optional(),
            alt: Joi.string().allow('').optional(),
            url: Joi.string().allow('').optional(),
            buttonText: Joi.string().allow('').optional(),
            visible: Joi.boolean().required(),
            order: Joi.number().required()
        })).required()
    })
};

function validate(data, schema) {
    const { error, value } = schema.validate(data);
    if (error) throw new Error(error.details[0].message);
    return value;
}

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
            clearance: 5,
            role: 'SYSTEM ADMINISTRATOR',
            department: 'UPEO COMMAND',
            createdAt: Date.now()
        };
        saveData();
        log(`Admin account created: ${ADMIN_ID}`);
    }
}

app.get('/api/health', (req, res) => res.json({ success: true, status: 'online' }));

app.post('/api/login', loginLimiter, async (req, res) => {
    try {
        const { userId, password } = validate(req.body, schemas.login);
        const normalizedId = userId.toUpperCase();
        const user = dataStore.users[normalizedId];
        
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        if (user.status === 'banned') return res.status(403).json({ success: false, message: 'Account banned.' });
        if (!user.approved) return res.status(403).json({ success: false, message: 'Account pending approval.' });
        
        if (user.isAdmin) {
            if (!password) return res.status(401).json({ success: false, message: 'Password required for admin.' });
            const valid = await verifyPassword(password, user.password, normalizedId);
            if (!valid) return res.status(401).json({ success: false, message: 'Invalid password.' });
        }
        
        const token = generateToken(normalizedId, user.isAdmin);
        dataStore.onlineUsers[normalizedId] = { id: normalizedId, name: user.name };
        saveData();
        io.emit('user:online', { userId: normalizedId, name: user.name });
        
        res.json({ 
            success: true, 
            token, 
            user: { 
                id: user.id, 
                name: user.name, 
                isAdmin: user.isAdmin, 
                status: user.status,
                clearance: user.clearance || 1,
                role: user.role || 'OPERATOR',
                department: user.department || 'FIELD OPERATIONS'
            } 
        });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
});

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

app.get('/api/pending', authenticateToken, requireAdmin, (req, res) => res.json({ success: true, pending: dataStore.pendingUsers }));

app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
    const users = Object.values(dataStore.users).map(u => ({ 
        id: u.id, 
        name: u.name, 
        status: u.status, 
        isAdmin: u.isAdmin,
        clearance: u.clearance || 1,
        role: u.role || 'OPERATOR',
        department: u.department || 'FIELD OPERATIONS'
    }));
    res.json({ success: true, users });
});

app.post('/api/users/approve', authenticateToken, requireAdmin, (req, res) => {
    const { userId } = req.body;
    const normalizedId = userId.toUpperCase();
    dataStore.pendingUsers = dataStore.pendingUsers.filter(p => p.userId !== normalizedId);
    dataStore.users[normalizedId] = {
        id: normalizedId, 
        name: `Operator_${normalizedId.slice(-4)}`,
        approved: true, 
        status: 'active', 
        isAdmin: false,
        clearance: 1,
        role: 'OPERATOR',
        department: 'FIELD OPERATIONS',
        createdAt: Date.now()
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

app.post('/api/users/:userId/ban', authenticateToken, requireAdmin, (req, res) => {
    if (dataStore.users[req.params.userId] && !dataStore.users[req.params.userId].isAdmin) {
        dataStore.users[req.params.userId].status = 'banned';
        saveData();
        io.emit('user:banned', { userId: req.params.userId });
    }
    res.json({ success: true });
});

app.post('/api/users/:userId/unban', authenticateToken, requireAdmin, (req, res) => {
    if (dataStore.users[req.params.userId]) {
        dataStore.users[req.params.userId].status = 'active';
        saveData();
        io.emit('user:unbanned', { userId: req.params.userId });
    }
    res.json({ success: true });
});

app.put('/api/users/:userId', authenticateToken, requireAdmin, (req, res) => {
    const user = dataStore.users[req.params.userId];
    if (user && (!user.isAdmin || req.user.userId === ADMIN_ID)) {
        const validated = validate(req.body, schemas.updateUser);
        if(validated.name) user.name = validated.name;
        if(validated.status) user.status = validated.status;
        if(validated.clearance !== undefined) user.clearance = validated.clearance;
        if(validated.role) user.role = validated.role;
        if(validated.department) user.department = validated.department;
        saveData();
        io.emit('user:updated', { userId: req.params.userId });
    }
    res.json({ success: true });
});

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

app.delete('/api/radio/:id', authenticateToken, requireAdmin, (req, res) => {
    dataStore.radioMessages = dataStore.radioMessages.filter(m => m.id !== req.params.id);
    saveData();
    io.emit('radio:deleted', { id: req.params.id });
    res.json({ success: true });
});

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

app.get('/api/contents', (req, res) => {
    res.json({ success: true, contents: dataStore.menuContents });
});

app.post('/api/contents', authenticateToken, requireAdmin, (req, res) => {
    try {
        const data = validate(req.body, schemas.contents);
        dataStore.menuContents = data.contents;
        saveData();
        io.emit('content:updated', dataStore.menuContents);
        log(`Menu contents updated by ${req.user.userId}`);
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
});

app.delete('/api/contents/:id', authenticateToken, requireAdmin, (req, res) => {
    const contentId = parseInt(req.params.id);
    dataStore.menuContents = dataStore.menuContents.filter(c => c.id !== contentId);
    saveData();
    io.emit('content:updated', dataStore.menuContents);
    log(`Content ${contentId} deleted by ${req.user.userId}`);
    res.json({ success: true });
});

app.get('/api/analytics', authenticateToken, requireAdmin, (req, res) => {
    res.json({ success: true, analytics: {
        totalUsers: Object.keys(dataStore.users).length,
        onlineUsers: Object.keys(dataStore.onlineUsers).length,
        totalBroadcasts: dataStore.broadcasts.length,
        totalRadioMessages: dataStore.radioMessages.length,
        totalContents: dataStore.menuContents.length
    }});
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('register', (data) => {
        if (data?.userId) {
            socket.userId = data.userId;
            socket.join(data.userId);
            if (data.isAdmin) socket.join('admins');
            console.log(`User registered: ${data.userId}`);
        }
    });
    
    socket.on('disconnect', () => {
        if (socket.userId && dataStore.onlineUsers[socket.userId]) {
            delete dataStore.onlineUsers[socket.userId];
            saveData();
            io.emit('user:offline', { userId: socket.userId });
            console.log(`User disconnected: ${socket.userId}`);
        }
    });
});

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

loadData();
initializeAdmin().then(() => {
    server.listen(PORT, () => {
        console.log('========================================');
        console.log(`ARCS Server v3.2.2 RUNNING`);
        console.log(`Port: ${PORT}`);
        console.log(`Admin ID: ${ADMIN_ID}`);
        console.log(`Admin Password: ${ADMIN_PASSWORD}`);
        console.log('========================================');
    });
});