const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(__dirname));

const DATA_FILE = path.join(__dirname, 'arcs_data.json');
const ADMIN_ID = '118107921024376';

let dataStore = {
  users: {},
  pendingUsers: [],
  broadcasts: [],
  messages: []
};

if (fs.existsSync(DATA_FILE)) {
  try {
    dataStore = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    console.error('Error loading data:', e);
  }
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(dataStore, null, 2));
  } catch (e) {
    console.error('Error saving data:', e);
  }
}

if (!dataStore.users[ADMIN_ID]) {
  dataStore.users[ADMIN_ID] = {
    id: ADMIN_ID,
    name: 'Obunto',
    approved: true,
    isAdmin: true
  };
  saveData();
}

app.post('/api/login', (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ success: false, message: 'No user ID provided' });
  }
  
  const user = dataStore.users[userId];
  
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  
  if (!user.approved) {
    return res.status(403).json({ success: false, message: 'Account pending approval' });
  }
  
  res.json({
    success: true,
    userData: {
      id: user.id,
      name: user.name,
      isAdmin: user.id === ADMIN_ID
    }
  });
});

app.post('/api/create-account', (req, res) => {
  const { userId } = req.body;
  
  if (!userId || userId.length < 5) {
    return res.status(400).json({ success: false, message: 'Invalid user ID' });
  }
  
  if (dataStore.users[userId]) {
    return res.status(400).json({ success: false, message: 'User already exists' });
  }
  
  if (dataStore.pendingUsers.includes(userId)) {
    return res.status(400).json({ success: false, message: 'Already pending approval' });
  }
  
  dataStore.pendingUsers.push(userId);
  saveData();
  
  io.emit('pending_update', dataStore.pendingUsers);
  
  res.json({ success: true, message: 'Account request sent' });
});

app.get('/api/pending', (req, res) => {
  res.json({ pending: dataStore.pendingUsers });
});

app.post('/api/approve', (req, res) => {
  const { userId, adminId } = req.body;
  
  if (adminId !== ADMIN_ID) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }
  
  const index = dataStore.pendingUsers.indexOf(userId);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'User not in pending list' });
  }
  
  dataStore.pendingUsers.splice(index, 1);
  dataStore.users[userId] = {
    id: userId,
    name: `Operator_${userId.slice(-4)}`,
    approved: true,
    isAdmin: false
  };
  saveData();
  
  io.emit('pending_update', dataStore.pendingUsers);
  io.emit('user_approved', { userId });
  
  res.json({ success: true });
});

app.post('/api/deny', (req, res) => {
  const { userId, adminId } = req.body;
  
  if (adminId !== ADMIN_ID) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }
  
  const index = dataStore.pendingUsers.indexOf(userId);
  if (index !== -1) {
    dataStore.pendingUsers.splice(index, 1);
    saveData();
    
    io.emit('pending_update', dataStore.pendingUsers);
  }
  
  res.json({ success: true });
});

app.post('/api/broadcast', (req, res) => {
  const { message, sprite, adminId } = req.body;
  
  if (adminId !== ADMIN_ID) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }
  
  const broadcast = {
    message,
    sprite: sprite || 'normal',
    timestamp: Date.now()
  };
  
  dataStore.broadcasts.push(broadcast);
  if (dataStore.broadcasts.length > 50) {
    dataStore.broadcasts.shift();
  }
  saveData();
  
  io.emit('broadcast', broadcast);
  
  res.json({ success: true });
});

app.get('/api/broadcasts', (req, res) => {
  res.json({ broadcasts: dataStore.broadcasts.slice(-10) });
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('register', (userId) => {
    socket.userId = userId;
    socket.join(userId);
    
    if (userId === ADMIN_ID) {
      socket.join('admins');
      socket.emit('pending_list', dataStore.pendingUsers);
    }
  });
  
  socket.on('request_pending', () => {
    if (socket.userId === ADMIN_ID) {
      socket.emit('pending_list', dataStore.pendingUsers);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`ARCS Server running on port ${PORT}`);
  console.log(`Admin ID: ${ADMIN_ID}`);
});