const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const MONGO_URI = process.env.MONGO_URI;
let isDbConnected = false;

const connectDB = async () => {
    if (!MONGO_URI) return;
    try { 
        await mongoose.connect(MONGO_URI); 
        isDbConnected = true;
    } catch (err) { 
        setTimeout(connectDB, 10000); 
    }
};
connectDB();

const UserSchema = new mongoose.Schema({
    userId: { type: String, unique: true },
    frozen: { type: Boolean, default: false }
});
let User; try { User = mongoose.model('User', UserSchema); } catch(e) { User = mongoose.model('User'); }

// --- MAPA COMPLETO DE DEPARTAMENTOS ---
// Mapeia ID do Grupo -> Nome do Departamento
const TSC_GROUPS = {
    // High Command / Admin
    11649027: "ADMINISTRATION", 
    11608337: "O5 COUNCIL",
    12045972: "ETHICS COMMITTEE",
    
    // Security & Intel
    11577231: "INTERNAL SECURITY",
    14159717: "INTELLIGENCE AGENCY", 
    33326090: "ALPHA-1",
    16499790: "BETA-7",
    
    // Science & Medical
    12026669: "SCIENTIFIC DEPT", 
    12026513: "MEDICAL DEPT", 
    
    // Support
    12045419: "ENGINEERING", 
    12022092: "LOGISTICS DEPT",
    14474303: "MANUFACTURING",
    
    // Foundations / Main
    5214183: "THUNDER SCIENTIFIC", // Grupo Principal (se quiser que apareça como genérico)
    34002295: "DEPARTMENT OF EXTERNAL AFFAIRS"
};

async function getRobloxData(userId) {
    try {
        // 1. Busca Info Básica e Grupos em paralelo
        const [userRes, groupsRes, thumbRes] = await Promise.all([
            axios.get(`https://users.roblox.com/v1/users/${userId}`),
            axios.get(`https://groups.roblox.com/v2/users/${userId}/groups/roles`),
            axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`)
        ]);

        const userGroups = groupsRes.data.data;
        
        // 2. Filtra apenas grupos que estão na nossa lista TSC_GROUPS
        const myTscGroups = userGroups.filter(g => TSC_GROUPS[g.group.id]);
        
        let primaryGroup = null;
        let deptName = "CIVILIAN";
        let rankName = "PERSONNEL";

        if (myTscGroups.length > 0) {
            // 3. ORDENAÇÃO POR RANK: Pega o grupo onde o usuário tem o maior número de rank (0-255)
            // Se tiver empate, pega o primeiro da lista.
            myTscGroups.sort((a, b) => b.role.rank - a.role.rank);
            
            primaryGroup = myTscGroups[0];
            
            // Define os nomes baseados no grupo vencedor
            deptName = TSC_GROUPS[primaryGroup.group.id];
            rankName = primaryGroup.role.name.toUpperCase();
        } 

        // Se não achou grupo na lista, mas o usuário existe
        if (!primaryGroup) {
            rankName = "CLASS-D / UNAUTHORIZED";
        }

        return {
            id: userId,
            username: userRes.data.name,
            dept: deptName,
            rank: rankName,
            avatar: thumbRes.data.data[0].imageUrl
        };

    } catch (e) {
        console.error("Erro API Roblox:", e.message);
        return { 
            id: userId, 
            username: "Unknown User", 
            dept: "CONNECTION ERROR", 
            rank: "OFFLINE", 
            avatar: "assets/icon-large-owner_info-28x14.png" // Fallback image
        };
    }
}

app.post('/api/login', async (req, res) => {
    const { userId } = req.body;

    // Login Mestre 000
    if (userId === "000") {
        return res.json({ 
            success: true, 
            userData: { 
                id: "000", 
                username: "OBUNTO_CORE", 
                dept: "MAINFRAME", 
                rank: "MASTER_ADMIN", 
                avatar: "obunto/normal.png", 
                isAdmin: true 
            } 
        });
    }

    try {
        // Verifica congelamento no banco
        if (isDbConnected) {
            let u = await User.findOne({ userId });
            if (!u) { u = new User({ userId }); await u.save(); }
            else if (u.frozen) return res.status(403).json({ success: false, message: "ID FROZEN" });
        }

        // Pega dados reais
        const profile = await getRobloxData(userId);
        res.json({ success: true, userData: profile });

    } catch (e) { 
        res.status(500).json({ success: false, message: "SERVER ERROR" }); 
    }
});

// ... Resto do código do Socket.io mantém igual ...
io.on('connection', (socket) => {
    socket.on('admin_login', () => socket.join('admins'));
    socket.on('user_login', (data) => socket.broadcast.to('admins').emit('user_online', data));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`NEWTON SERVER ONLINE`));