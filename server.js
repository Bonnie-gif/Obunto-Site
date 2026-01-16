// ARCS v3.2.2 - Server.js Implementation Guide
// Add these changes to your existing server.js

// ==================== 1. UPDATE DATA STORE ====================
// Add these fields to your dataStore object:

let dataStore = {
    users: {},
    pendingUsers: [],
    broadcasts: [],
    messages: [],
    radioMessages: [],
    customTabs: [],
    publishedTabs: [],
    menuContents: [],
    welcome: {
        title: 'WELCOME',
        text: 'WELCOME TO ARCS V3.2.2'
    },
    onlineUsers: {},
    systemLog: [],
    
    // NEW: Help Tickets
    helpTickets: {},  // { ticketId: ticket }
    ticketCounter: 0
};

// ==================== 2. USER MODEL UPDATE ====================
// When creating/updating users, include permissions field:

dataStore.users[userId] = {
    id: userId,
    name: 'Operator Name',
    password: hashedPassword,
    approved: true,
    status: 'active',
    isAdmin: false,
    createdAt: Date.now(),
    
    // NEW: Permissions array
    permissions: ['radio', 'credentials', 'tickets']  // Default permissions
};

// ==================== 3. PERMISSIONS ENDPOINTS ====================

// Get user permissions
app.get('/api/users/:userId/permissions', authenticateToken, requireAdmin, (req, res) => {
    const user = dataStore.users[req.params.userId];
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    res.json({ 
        success: true, 
        permissions: user.permissions || []
    });
});

// Update user permissions
app.put('/api/users/:userId/permissions', authenticateToken, requireAdmin, (req, res) => {
    const user = dataStore.users[req.params.userId];
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    const { permissions } = req.body;
    
    // Validate permissions
    const validPermissions = ['radio', 'credentials', 'tickets'];
    const filteredPermissions = permissions.filter(p => validPermissions.includes(p));
    
    user.permissions = filteredPermissions;
    saveData();
    
    // Emit socket event to notify user
    io.emit('permissions:updated', { 
        userId: req.params.userId, 
        permissions: filteredPermissions 
    });
    
    log(`Permissions updated for ${req.params.userId} by ${req.user.userId}`);
    
    res.json({ success: true });
});

// ==================== 4. TICKETS ENDPOINTS ====================

// Validation schema for tickets
const ticketSchemas = {
    createTicket: Joi.object({
        subject: Joi.string().required().max(200),
        message: Joi.string().required().max(2000)
    }),
    respondToTicket: Joi.object({
        message: Joi.string().required().max(2000)
    })
};

// Get all tickets (admin sees all, users see only their own)
app.get('/api/tickets', authenticateToken, (req, res) => {
    try {
        let tickets = Object.values(dataStore.helpTickets);
        
        // If not admin, filter to only user's tickets
        if (!req.user.isAdmin) {
            tickets = tickets.filter(t => t.userId === req.user.userId);
        }
        
        // Sort by creation date (newest first)
        tickets.sort((a, b) => b.createdAt - a.createdAt);
        
        res.json({ success: true, tickets });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Create new ticket
app.post('/api/tickets', authenticateToken, (req, res) => {
    try {
        const data = validate(req.body, ticketSchemas.createTicket);
        const user = dataStore.users[req.user.userId];
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const ticketId = `TKT${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        
        const ticket = {
            id: ticketId,
            userId: user.id,
            userName: user.name,
            subject: data.subject,
            message: data.message,
            status: 'pending',  // pending, active, closed
            createdAt: Date.now(),
            messages: [
                {
                    senderId: user.id,
                    senderName: user.name,
                    message: data.message,
                    isAdmin: false,
                    timestamp: Date.now()
                }
            ]
        };
        
        dataStore.helpTickets[ticketId] = ticket;
        saveData();
        
        // Notify admin
        io.to('admins').emit('ticket:new', ticket);
        
        log(`New ticket created: ${ticketId} by ${user.id}`);
        
        res.json({ success: true, ticket });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
});

// Get single ticket
app.get('/api/tickets/:id', authenticateToken, (req, res) => {
    const ticket = dataStore.helpTickets[req.params.id];
    
    if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    
    // Check permission (admin or ticket owner)
    if (!req.user.isAdmin && ticket.userId !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    res.json({ success: true, ticket });
});

// Approve ticket (admin only)
app.post('/api/tickets/:id/approve', authenticateToken, requireAdmin, (req, res) => {
    const ticket = dataStore.helpTickets[req.params.id];
    
    if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    
    ticket.status = 'active';
    ticket.approvedAt = Date.now();
    saveData();
    
    // Notify user
    io.emit('ticket:approved', ticket);
    
    log(`Ticket ${req.params.id} approved by ${req.user.userId}`);
    
    res.json({ success: true, ticket });
});

// Reject ticket (admin only)
app.post('/api/tickets/:id/reject', authenticateToken, requireAdmin, (req, res) => {
    const ticket = dataStore.helpTickets[req.params.id];
    
    if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    
    ticket.status = 'closed';
    ticket.closedAt = Date.now();
    ticket.rejectedBy = req.user.userId;
    saveData();
    
    log(`Ticket ${req.params.id} rejected by ${req.user.userId}`);
    
    res.json({ success: true });
});

// Close ticket (admin only)
app.post('/api/tickets/:id/close', authenticateToken, requireAdmin, (req, res) => {
    const ticket = dataStore.helpTickets[req.params.id];
    
    if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    
    ticket.status = 'closed';
    ticket.closedAt = Date.now();
    ticket.closedBy = req.user.userId;
    saveData();
    
    // Notify user
    io.emit('ticket:closed', req.params.id);
    
    log(`Ticket ${req.params.id} closed by ${req.user.userId}`);
    
    res.json({ success: true });
});

// Send message in ticket (both admin and user)
app.post('/api/tickets/:id/respond', authenticateToken, (req, res) => {
    try {
        const ticket = dataStore.helpTickets[req.params.id];
        
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }
        
        // Check permission
        if (!req.user.isAdmin && ticket.userId !== req.user.userId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        
        const data = validate(req.body, ticketSchemas.respondToTicket);
        const user = dataStore.users[req.user.userId];
        
        const message = {
            senderId: user.id,
            senderName: user.name,
            message: data.message,
            isAdmin: req.user.isAdmin,
            timestamp: Date.now()
        };
        
        ticket.messages.push(message);
        saveData();
        
        // Emit to both parties
        io.emit('ticket:message', {
            ticketId: req.params.id,
            message: message
        });
        
        res.json({ success: true, message });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
});

// ==================== 5. UPDATE ANALYTICS ====================

app.get('/api/analytics', authenticateToken, requireAdmin, (req, res) => {
    res.json({ 
        success: true, 
        analytics: {
            totalUsers: Object.keys(dataStore.users).length,
            onlineUsers: Object.keys(dataStore.onlineUsers).length,
            totalBroadcasts: dataStore.broadcasts.length,
            totalRadioMessages: dataStore.radioMessages.length,
            totalContents: dataStore.menuContents.length,
            
            // NEW: Ticket stats
            totalTickets: Object.keys(dataStore.helpTickets).length,
            pendingTickets: Object.values(dataStore.helpTickets).filter(t => t.status === 'pending').length,
            activeTickets: Object.values(dataStore.helpTickets).filter(t => t.status === 'active').length,
            closedTickets: Object.values(dataStore.helpTickets).filter(t => t.status === 'closed').length
        }
    });
});

// ==================== 6. UPDATE SOCKET REGISTRATION ====================

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('register', (data) => {
        if (data?.userId) {
            socket.userId = data.userId;
            socket.join(data.userId);
            
            // NEW: Join admins room if admin
            if (data.isAdmin) {
                socket.join('admins');
            }
            
            console.log(`User registered: ${data.userId} (Admin: ${data.isAdmin})`);
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

// ==================== 7. DEFAULT PERMISSIONS ON USER APPROVAL ====================

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
        createdAt: Date.now(),
        
        // NEW: Default permissions
        permissions: ['tickets']  // By default, users can only create tickets
    };
    
    saveData();
    io.emit('user:approved', { userId: normalizedId });
    
    log(`User ${normalizedId} approved by ${req.user.userId}`);
    
    res.json({ success: true });
});

// ==================== 8. TESTING CHECKLIST ====================

/*
TEST CHECKLIST:

1. Permissions System:
   ✓ Create new user
   ✓ Approve user
   ✓ Open permissions modal
   ✓ Change permissions
   ✓ Verify tabs show/hide
   ✓ Test Socket.IO update

2. Tickets System:
   ✓ User creates ticket
   ✓ Admin sees ticket in pending
   ✓ Admin approves ticket
   ✓ Chat window opens for both
   ✓ Send messages back and forth
   ✓ Admin closes ticket
   ✓ Verify ticket moves to closed

3. Real-time Updates:
   ✓ Permission changes reflect immediately
   ✓ Ticket notifications appear
   ✓ Chat messages appear instantly

4. Edge Cases:
   ✓ User without permissions can't access tabs
   ✓ User can't access other users' tickets
   ✓ Admin can access all tickets
   ✓ Closed tickets can't be reopened
*/