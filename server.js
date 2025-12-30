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

// MongoDB Connection (Optional)
const connectDB = async () => {
    if (!MONGO_URI) {
        console.log('⚠️  MongoDB URI not provided - running without database');
        return;
    }
    try { 
        await mongoose.connect(MONGO_URI); 
        isDbConnected = true;
        console.log('✅ MongoDB Connected');
    } catch (err) { 
        console.error('❌ DB Error:', err.message);
        setTimeout(connectDB, 10000); 
    }
};
connectDB();

// Database Schema
const UserSchema = new mongoose.Schema({
    userId: { type: String, unique: true },
    frozen: { type: Boolean, default: false },
    notes: { type: String, default: "" },
    lastAccess: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// TSC Groups Configuration
const TSC_GROUPS = {
    11577231: "THUNDER SCIENTIFIC CORPORATION",
    11608337: "SECURITY DEPARTMENT",
    11649027: "ADMINISTRATION",
    12045972: "ETHICS COMMITTEE",
    12026513: "MEDICAL DEPARTMENT",
    12026669: "SCIENTIFIC DEPARTMENT",
    12045419: "ENGINEERING",
    12022092: "LOGISTICS",
    14159717: "INTELLIGENCE"
};

// Get Roblox User Data
async function getRobloxData(userId) {
    try {
        // Get profile
        const profileRes = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
        const username = profileRes.data.name;
        const displayName = profileRes.data.displayName;
        const description = profileRes.data.description || "";
        const created = profileRes.data.created;

        // Get avatar
        const avatarRes = await axios.get(
            `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`
        );
        const avatar = avatarRes.data.data[0]?.imageUrl || "";

        // Get groups
        const groupsRes = await axios.get(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
        const allGroups = groupsRes.data.data || [];

        // Filter TSC groups
        const tscGroups = allGroups.filter(g => TSC_GROUPS[g.group.id]);

        if (tscGroups.length === 0) {
            throw new Error("No TSC affiliation detected");
        }

        // Extract RANK/LEVEL from main group (11577231)
        const mainGroup = tscGroups.find(g => g.group.id === 11577231);
        let level = "LEVEL 0";
        
        if (mainGroup) {
            const levelMatch = mainGroup.role.name.match(/\d+/);
            level = levelMatch ? `LEVEL ${levelMatch[0]}` : "LEVEL 0";
        } else {
            // Fallback to highest rank TSC group
            tscGroups.sort((a, b) => b.role.rank - a.role.rank);
            if (tscGroups[0]) {
                const levelMatch = tscGroups[0].role.name.match(/\d+/);
                level = levelMatch ? `LEVEL ${levelMatch[0]}` : "LEVEL 0";
            }
        }

        return {
            id: userId,
            username,
            displayName,
            description,
            created,
            avatar,
            rank: level,
            affiliations: tscGroups.map(g => ({ 
                groupId: g.group.id,
                groupName: TSC_GROUPS[g.group.id] || g.group.name,
                role: g.role.name,
                rank: g.role.rank
            })),
            allGroups: allGroups.map(g => ({
                id: g.group.id,
                name: g.group.name,
                role: g.role.name,
                rank: g.role.rank
            })),
            isObunto: userId === "1947"
        };
    } catch (err) {
        throw err;
    }
}

// API Endpoints
app.post('/api/login', async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ 
            success: false, 
            message: "USER ID REQUIRED" 
        });
    }

    // Admin access
    if (userId === "000") {
        return res.json({ 
            success: true, 
            userData: { 
                id: "000", 
                username: "OBUNTO_CORE", 
                displayName: "System Administrator",
                rank: "OMEGA",
                avatar: "/obunto/normal.png", 
                affiliations: [{
                    groupName: "TSC MAINFRAME",
                    role: "SYSTEM CORE",
                    rank: 999
                }],
                allGroups: [],
                isAdmin: true,
                isObunto: true
            } 
        });
    }

    try {
        // Check if user is frozen (if DB available)
        if (isDbConnected) {
            let user = await User.findOne({ userId });
            if (!user) {
                user = new User({ userId });
                await user.save();
            } else if (user.frozen) {
                return res.status(403).json({ 
                    success: false, 
                    message: "ACCESS DENIED - USER ID FROZEN" 
                });
            }
            
            // Update last access
            user.lastAccess = new Date();
            await user.save();
        }

        // Get Roblox data
        const profile = await getRobloxData(userId);
        
        res.json({ 
            success: true, 
            userData: profile 
        });

    } catch (e) {
        console.error('Login error:', e.message);
        res.status(500).json({ 
            success: false, 
            message: e.message || "SERVER ERROR" 
        });
    }
});

// Save operator notes
app.post('/api/save-note', async (req, res) => {
    const { userId, note } = req.body;
    
    if (!userId) {
        return res.status(400).json({ success: false });
    }
    
    try {
        if (isDbConnected) {
            await User.updateOne(
                { userId }, 
                { notes: note },
                { upsert: true }
            );
        }
        res.json({ success: true });
    } catch (e) {
        console.error('Save note error:', e);
        res.status(500).json({ success: false });
    }
});

// Get operator notes
app.get('/api/get-note/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        if (isDbConnected) {
            const user = await User.findOne({ userId });
            res.json({ 
                success: true, 
                note: user?.notes || "" 
            });
        } else {
            res.json({ 
                success: true, 
                note: "" 
            });
        }
    } catch (e) {
        res.status(500).json({ 
            success: false, 
            note: "" 
        });
    }
});

// Socket.io for Obunto broadcasts
io.on('connection', (socket) => {
    console.log('👤 User connected:', socket.id);
    
    // Mascot broadcast (admin only)
    socket.on('mascot_broadcast', (data) => {
        console.log('📢 Obunto broadcast:', data.message);
        io.emit('display_mascot_message', {
            message: data.message,
            mood: data.mood || 'normal'
        });
    });
    
    socket.on('disconnect', () => {
        console.log('👋 User disconnected:', socket.id);
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   TSC NEWTON OS - PERSONNEL DATABASE  ║');
    console.log('╚════════════════════════════════════════╝');
    console.log(`\n🌐 Server running on port ${PORT}`);
    console.log(`📱 Access: http://localhost:${PORT}`);
    console.log(`\n💾 Database: ${isDbConnected ? '✅ Connected' : '⚠️  Local storage only'}`);
    console.log('\n🎮 Test IDs:');
    console.log('   • 000 - Admin (Obunto Core)');
    console.log('   • 1947 - Obunto Control');
    console.log('   • 1 - Roblox User\n');
});