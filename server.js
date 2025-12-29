const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- CONFIGURAÇÃO DO BANCO DE DADOS ---
const MONGO_URI = process.env.MONGO_URI;

const connectDB = async () => {
    if (!MONGO_URI) return console.log("⚠️ MONGO_URI não configurada no Render!");
    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ ACCESS GRANTED: Database Online");
    } catch (err) {
        console.error("❌ DB ERROR:", err.message);
        setTimeout(connectDB, 5000); // Tenta reconectar em 5s
    }
};
connectDB();

// Modelo de Usuário
const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// Cache de Memória (Economiza Banco e API)
const USER_CACHE = {}; 
const CACHE_TIME = 1000 * 60 * 15; // 15 Minutos

const TSC_GROUPS = {
    11649027: "ADMINISTRATION", 12026513: "MEDICAL_DEPT", 11577231: "INTERNAL_SECURITY",
    14159717: "INTELLIGENCE", 12026669: "SCIENCE_DIV", 12045419: "ENGINEERING", 12022092: "LOGISTICS"
};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rota para manter o site acordado (UptimeRobot)
app.get('/health', (req, res) => res.send('SYSTEM_ACTIVE'));

// 1. CHECAR SE USUÁRIO EXISTE (Para a interface decidir se pede Login ou Registro)
app.post('/api/check-user', async (req, res) => {
    const { userId } = req.body;
    try {
        const user = await User.findOne({ userId });
        res.json({ registered: !!user });
    } catch (e) { res.status(500).json({ error: "DB_FAIL" }); }
});

// 2. REGISTRAR NOVA CONTA
app.post('/api/register', async (req, res) => {
    const { userId, password } = req.body;
    try {
        const exists = await User.findOne({ userId });
        if (exists) return res.status(400).json({ success: false, message: "ID_TAKEN" });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        
        await new User({ userId, passwordHash: hash }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 3. LOGIN (Com Cache e Validação)
app.post('/api/login', async (req, res) => {
    const { userId, password } = req.body;

    // Admin Backdoor
    if (userId === "000" && password === "TSC-OMEGA") {
        return res.json({ success: true, userData: { id: "000", username: "OBUNTO", dept: "CORE", rank: "MASTER_ADMIN", clearance: "OMEGA", avatar: "obunto/normal.png", affiliations: [] } });
    }

    try {
        // Verifica Senha no Banco
        const user = await User.findOne({ userId });
        if (!user) return res.status(404).json({ success: false, message: "NO_USER" });

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) return res.status(401).json({ success: false, message: "WRONG_PASS" });

        // Verifica Cache de Dados do Roblox
        const now = Date.now();
        if (USER_CACHE[userId] && (now - USER_CACHE[userId].timestamp < CACHE_TIME)) {
            console.log(`⚡ Serving ${userId} from CACHE`);
            return res.json({ success: true, userData: USER_CACHE[userId].data });
        }

        // Busca Dados no Roblox (Se não estiver no cache)
        console.log(`🌐 Fetching ${userId} from ROBLOX API`);
        const userRes = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
        const groupsRes = await axios.get(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
        const thumbRes = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`);

        const tscGroups = groupsRes.data.data.filter(g => TSC_GROUPS[g.group.id]);
        
        // Se não for TSC, nega acesso (Opcional - remova se quiser liberar para todos)
        if (tscGroups.length === 0) return res.status(403).json({ success: false, message: "CIVILIAN_DETECTED" });

        const primary = tscGroups.sort((a, b) => b.role.rank - a.role.rank)[0];
        const levelMatch = primary.role.name.match(/\d+/);

        const profileData = {
            id: userId,
            username: userRes.data.name,
            dept: TSC_GROUPS[primary.group.id],
            rank: primary.role.name,
            clearance: `CLEARANCE ${levelMatch ? levelMatch[0] : '0'}`,
            avatar: thumbRes.data.data[0].imageUrl,
            affiliations: tscGroups.map(g => ({ name: g.group.name, role: g.role.name, div: TSC_GROUPS[g.group.id] }))
        };

        // Salva no Cache
        USER_CACHE[userId] = { timestamp: now, data: profileData };

        res.json({ success: true, userData: profileData });

    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: "SYSTEM_FAIL" });
    }
});

io.on('connection', (socket) => {
    socket.on('mascot_broadcast', (data) => io.emit('receive_mascot_msg', data));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`SYSTEM ONLINE :${PORT}`));