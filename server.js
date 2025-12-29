const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const DB_FILE = 'database.json';
const TSC_GROUPS = {
    11649027: "ADMINISTRATION",
    12026513: "MEDICAL_DEPT",
    11577231: "INTERNAL_SECURITY",
    14159717: "INTELLIGENCE",
    12026669: "SCIENCE_DIV",
    12045419: "ENGINEERING",
    12022092: "LOGISTICS"
};

// --- SISTEMA DE BANCO DE DADOS SIMPLES ---
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({}));

function getDB() { return JSON.parse(fs.readFileSync(DB_FILE)); }
function saveDB(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. VERIFICAR SE O USUÁRIO EXISTE
app.post('/api/check-user', (req, res) => {
    const { userId } = req.body;
    const db = getDB();
    // Retorna se o usuário já tem senha cadastrada
    res.json({ registered: !!db[userId] });
});

// 2. REGISTRAR NOVO USUÁRIO (CRIAR SENHA)
app.post('/api/register', async (req, res) => {
    const { userId, password } = req.body;
    const db = getDB();

    if (db[userId]) return res.status(400).json({ success: false, message: "ALREADY_REGISTERED" });

    // Criptografa a senha antes de salvar
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    db[userId] = { hash: hash, created_at: new Date().toISOString() };
    saveDB(db);

    res.json({ success: true });
});

// 3. LOGIN (VERIFICAR SENHA) E BUSCAR DADOS
app.post('/api/login', async (req, res) => {
    const { userId, password } = req.body;
    const db = getDB();

    // Login Especial do Obunto
    if (userId === "000" && password === "TSC-OMEGA") { // Defina uma senha para o admin aqui
        return res.json({
            success: true,
            userData: { id: "000", username: "OBUNTO", dept: "CORE", rank: "MASTER_ADMIN", clearance: "OMEGA", avatar: "obunto/normal.png", affiliations: [] }
        });
    }

    // Verifica se o usuário existe no banco local
    if (!db[userId]) return res.status(404).json({ success: false, message: "NO_RECORD_FOUND" });

    // Compara a senha digitada com a criptografia salva
    const isMatch = await bcrypt.compare(password, db[userId].hash);
    if (!isMatch) return res.status(401).json({ success: false, message: "INVALID_CREDENTIALS" });

    // Se a senha estiver certa, busca os dados no Roblox
    try {
        const userRes = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
        const groupsRes = await axios.get(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
        const tscGroups = groupsRes.data.data.filter(g => TSC_GROUPS[g.group.id]);

        if (tscGroups.length === 0) return res.status(403).json({ success: false, message: "NOT_TSC_PERSONNEL" });

        const primary = tscGroups.sort((a, b) => b.role.rank - a.role.rank)[0];
        const levelMatch = primary.role.name.match(/\d+/);
        
        // Busca imagem oficial
        const thumbRes = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`);

        res.json({
            success: true,
            userData: {
                id: userId,
                username: userRes.data.name,
                dept: TSC_GROUPS[primary.group.id],
                rank: primary.role.name,
                clearance: `CLEARANCE ${levelMatch ? levelMatch[0] : '0'}`,
                avatar: thumbRes.data.data[0].imageUrl,
                affiliations: tscGroups.map(g => ({ name: g.group.name, role: g.role.name, div: TSC_GROUPS[g.group.id] }))
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, message: "CONNECTION_ERROR" });
    }
});

io.on('connection', (socket) => {
    socket.on('mascot_broadcast', (data) => io.emit('receive_mascot_msg', data));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {});