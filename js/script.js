let currentUser = null;
const ADMIN_ID = '118107921024376';

const storage = {
async get(key, shared = false) {
if (window.storage && typeof window.storage.get === 'function') {
return await window.storage.get(key, shared);
}
const value = localStorage.getItem(key);
return value ? { key, value, shared } : null;
},
async set(key, value, shared = false) {
if (window.storage && typeof window.storage.set === 'function') {
return await window.storage.set(key, value, shared);
}
localStorage.setItem(key, value);
return { key, value, shared };
}
};

let socket = null;
let currentRadioChannel = '99.4';
let monitoringInterval = null;
let monitoringLogs = [];
let authToken = null;

const sprites = ['normal', 'happy', 'sad', 'annoyed', 'bug', 'dizzy', 'hollow', 'panic', 'sleeping', 'smug', 'stare', 'suspicious', 'werror'];

function playSound(id) {
const audio = document.getElementById(id);
if (audio) {
audio.currentTime = 0;
audio.play().catch(e => {});
}
}

function showScreen(id) {
document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
const el = document.getElementById(id);
if (el) el.classList.add('active');
}

function showStatus(message, isError = false) {
const status = document.getElementById('login-status');
if (!status) return;
status.textContent = message;
status.className = 'login-status show';
if (isError) status.classList.add('error');
setTimeout(() => status.classList.remove('show'), 3000);
}

function showGlobalError(message) {
const errorDiv = document.getElementById('error-notification');
const errorContent = document.getElementById('error-content');
if (!errorDiv || !errorContent) return;
errorContent.textContent = message;
errorDiv.classList.remove('hidden');
playSound('sfx-error');
setTimeout(() => errorDiv.classList.add('hidden'), 5000);
}

function startLoading() {
playSound('sfx-loading');
let progress = 0;
const bar = document.getElementById('loading-progress');
const interval = setInterval(() => {
progress += Math.random() * 15;
if (progress >= 100) {
progress = 100;
if (bar) bar.style.width = '100%';
clearInterval(interval);
setTimeout(() => {
const panel = document.getElementById('login-panel');
if (panel) panel.classList.remove('hidden');
}, 500);
} else {
if (bar) bar.style.width = progress + '%';
}
}, 200);
}

function getDeviceInfo() {
return {
userAgent: navigator.userAgent,
platform: navigator.platform
};
}

async function initSpriteSelector() {
const selector = document.getElementById('sprite-selector');
if (!selector) return;
selector.innerHTML = '';
sprites.forEach(sprite => {
const option = document.createElement('div');
option.className = 'sprite-option';
if (sprite === 'normal') option.classList.add('active');
option.setAttribute('data-sprite', sprite);
option.innerHTML = `             <img src="assets/sprites/${sprite}.png" alt="${sprite}">             <span>${sprite}</span>
        `;
option.onclick = function() {
document.querySelectorAll('.sprite-option').forEach(o => o.classList.remove('active'));
option.classList.add('active');
const select = document.getElementById('sprite-select');
if (select) select.value = sprite;
};
selector.appendChild(option);
});
}

async function handleLogin() {
const userIdEl = document.getElementById('operator-id');
const passwordEl = document.getElementById('operator-password');
const userId = userIdEl ? userIdEl.value.trim() : '';
if (!userId) {
playSound('sfx-error');
showStatus('PLEASE ENTER AN OPERATOR ID', true);
return;
}
try {
await init();
const usersData = await storage.get('arcs_users');
const users = usersData ? JSON.parse(usersData.value) : {};
if (users[userId] && users[userId].approved) {
currentUser = users[userId];
playSound('sfx-poweron');
showScreen('main-screen');
initSpriteSelector();
if (userId === ADMIN_ID) {
const adminTabs = document.getElementById('admin-tabs');
const adminToggle = document.getElementById('admin-toggle');
if (adminToggle) adminToggle.classList.remove('hidden');
if (adminTabs) adminTabs.classList.remove('hidden');
const personnelTabs = document.getElementById('personnel-tabs');
if (personnelTabs) personnelTabs.classList.add('hidden');
loadPending('pending-list');
loadPending('pending-list-modal');
initializeMonitoring();
startAutoMonitoring();
} else {
const adminTabs = document.getElementById('admin-tabs');
const personnelTabs = document.getElementById('personnel-tabs');
if (adminTabs) adminTabs.classList.add('hidden');
if (personnelTabs) personnelTabs.classList.remove('hidden');
}
updateUserDisplay();
goToHome();
loadBroadcastHistory();
joinRadioChannel();
} else if (!users[userId]) {
const pendingData = await storage.get('arcs_pending');
const pending = pendingData ? JSON.parse(pendingData.value) : [];
if (!pending.includes(userId)) {
pending.push(userId);
await storage.set('arcs_pending', JSON.stringify(pending));
}
playSound('sfx-sent');
showStatus('REQUEST SENT - AWAITING APPROVAL');
if (userIdEl) userIdEl.value = '';
if (passwordEl) passwordEl.value = '';
} else {
playSound('sfx-denied');
showStatus('ACCESS DENIED - AWAITING APPROVAL', true);
}
} catch (e) {
console.error('Login error:', e);
playSound('sfx-error');
showStatus('SYSTEM ERROR - TRY AGAIN', true);
}
}

function updateUserDisplay() {
const userName = document.getElementById('current-user-name');
if (userName && currentUser) {
userName.textContent = (currentUser.name || currentUser.id || '').toUpperCase();
}
}

async function handleLogout() {
if (!currentUser) return;
if (monitoringInterval) clearInterval(monitoringInterval);
currentUser = null;
authToken = null;
showScreen('loading-screen');
const userIdEl = document.getElementById('operator-id');
const passwordEl = document.getElementById('operator-password');
if (userIdEl) userIdEl.value = '';
if (passwordEl) passwordEl.value = '';
setTimeout(() => {
const panel = document.getElementById('login-panel');
if (panel) panel.classList.remove('hidden');
}, 500);
}

function initSocket() {
if (typeof io === 'undefined') {
return;
}
socket = io();
socket.on('connect', () => {
if (currentUser) socket.emit('register', currentUser.id);
});
socket.on('broadcast', (data) => {
showBroadcast(data);
});
socket.on('radio_message', (message) => {
renderRadioMessage(message);
});
socket.on('radio_cleared', (frequency) => {
if (!frequency || frequency === currentRadioChannel) {
const rm = document.getElementById('radio-messages');
if (rm) rm.innerHTML = '';
logMonitoring(`RADIO CLEARED: ${frequency || 'ALL'}`);
}
});
}

function goToHome() {
document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
const home = document.getElementById('view-home');
if (home) home.classList.add('active');
}

function switchTab(targetId) {
document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
const targetTab = document.querySelector(`[data-target="${targetId}"]`);
if (targetTab) targetTab.classList.add('active');
const content = document.getElementById(targetId);
if (content) content.classList.add('active');
if (targetId === 'adm-monitoring') updateMonitoring();
else if (targetId === 'adm-tickets') loadTickets();
else if (targetId === 'adm-alarms') loadAlarms();
else if (targetId === 'adm-users') {
loadActiveUsers();
loadPending('pending-list');
loadBannedUsers();
}
else if (targetId === 'adm-analytics') loadAnalytics();
else if (targetId === 'usr-workstation') loadMyTickets();
else if (targetId === 'usr-profile') loadProfile();
logMonitoring(`TAB ACCESSED: ${targetId}`);
}

function initializeMonitoring() {
monitoringLogs = [
'> SYSTEM MONITORING INITIALIZED',
'> DATA SWALLOW STATUS: OK',
'> ARCS CONNECTION: STABLE',
'> STATUS: GREEN',
'> ALL SYSTEMS OPERATIONAL'
];
updateMonitoringDisplay();
updateSystemStats();
}

function logMonitoring(message) {
const timestamp = new Date().toLocaleTimeString();
monitoringLogs.push(`[${timestamp}] ${message}`);
if (monitoringLogs.length > 100) {
monitoringLogs.shift();
}
updateMonitoringDisplay();
}

async function updateMonitoring() {
const target = document.getElementById('mon-target')?.value || 'all';
logMonitoring(`MONITORING REFRESH: ${target.toUpperCase()}`);
updateMonitoringDisplay();
await updateSystemStats();
}

function updateMonitoringDisplay() {
const logsElement = document.getElementById('monitoring-logs');
if (logsElement) {
logsElement.textContent = monitoringLogs.join('\n');
logsElement.scrollTop = logsElement.scrollHeight;
}
}

async function updateSystemStats() {
try {
const usersData = await storage.get('arcs_users');
const users = usersData ? JSON.parse(usersData.value) : {};
const pendingData = await storage.get('arcs_pending');
const pending = pendingData ? JSON.parse(pendingData.value) : [];
const ticketsData = await storage.get('arcs_tickets');
const tickets = ticketsData ? JSON.parse(ticketsData.value) : [];
const alarmsData = await storage.get('arcs_alarms');
const alarms = alarmsData ? JSON.parse(alarmsData.value) : [];
const statsDiv = document.getElementById('system-stats');
if (statsDiv) {
const onlineUsers = Object.values(users).filter(u => u.isOnline).length;
statsDiv.innerHTML = `                 USERS: ${onlineUsers}/${Object.keys(users).length} | 
                PENDING: ${pending.length} | 
                TICKETS: ${tickets.length} | 
                ALARMS: ${alarms.length}
            `;
}
} catch (e) {
console.error('Stats error:', e);
}
}

function startAutoMonitoring() {
monitoringInterval = setInterval(() => {
if (currentUser && currentUser.id === ADMIN_ID) {
updateSystemStats();
}
}, 30000);
}

async function loadPending(elementId) {
try {
const data = await storage.get('arcs_pending');
const pending = data ? JSON.parse(data.value) : [];
const list = document.getElementById(elementId);
if (!list) return;
list.innerHTML = '';
if (pending.length === 0) {
list.innerHTML = '<div style="padding:10px;text-align:center;color:#666;">NO PENDING REQUESTS</div>';
return;
}
pending.forEach(id => {
const item = document.createElement('div');
item.className = 'pending-item';
item.innerHTML = `                 <span>${id}</span>                 <div class="actions">                     <button onclick="approve('${id}')">APPROVE</button>                     <button onclick="deny('${id}')">DENY</button>                 </div>
            `;
list.appendChild(item);
});
} catch (e) {
console.error('Load pending error:', e);
}
}

async function approve(id) {
const users = await storage.get('arcs_users');
const data = users ? JSON.parse(users.value) : {};
data[id] = { id, approved: true, name: id, isOnline: false };
await storage.set('arcs_users', JSON.stringify(data));
const pending = await storage.get('arcs_pending');
const pend = pending ? JSON.parse(pending.value) : [];
await storage.set('arcs_pending', JSON.stringify(pend.filter(p => p !== id)));
playSound('sfx-blue');
loadPending('pending-list');
loadPending('pending-list-modal');
loadActiveUsers();
}

async function deny(id) {
const pending = await storage.get('arcs_pending');
const pend = pending ? JSON.parse(pending.value) : [];
await storage.set('arcs_pending', JSON.stringify(pend.filter(p => p !== id)));
playSound('sfx-denied');
loadPending('pending-list');
loadPending('pending-list-modal');
}

async function sendBroadcast() {
const text = document.getElementById('broadcast-text')?.value.trim();
const sprite = document.getElementById('sprite-select')?.value || 'normal';
if (!text) {
playSound('sfx-error');
showGlobalError('Please enter a message');
return;
}
playSound('sfx-sent');
document.getElementById('broadcast-text').value = '';
const broadcast = { id: Date.now().toString(), message: text, sprite, timestamp: Date.now(), adminId: currentUser?.id || ADMIN_ID };
const bcData = await storage.get('arcs_broadcasts');
const bcs = bcData ? JSON.parse(bcData.value) : [];
bcs.push(broadcast);
await storage.set('arcs_broadcasts', JSON.stringify(bcs));
showBroadcast({ message: text, sprite });
logMonitoring(`BROADCAST SENT: ${text.substring(0,30)}...`);
}

function showBroadcast(data) {
const spriteImg = document.getElementById('notif-sprite');
if (spriteImg) {
spriteImg.src = `assets/sprites/${data.sprite}.png`;
spriteImg.onerror = () => {
spriteImg.src = 'assets/sprites/normal.png';
};
}
const notifText = document.getElementById('notif-text');
if (notifText) notifText.textContent = data.message || data.text || '';
const notif = document.getElementById('broadcast-notification');
if (notif) notif.classList.remove('hidden');
playSound('sfx-newmessage');
setTimeout(() => {
const n = document.getElementById('broadcast-notification');
if (n) n.classList.add('hidden');
}, 8000);
}

async function loadBroadcastHistory() {
try {
const response = await storage.get('arcs_broadcasts');
const data = response ? JSON.parse(response.value) : [];
const historyDiv = document.getElementById('broadcast-history');
if (!historyDiv) return;
historyDiv.innerHTML = '';
if (data.length === 0) {
historyDiv.innerHTML = '<div style="padding:10px;color:#666;">NO BROADCASTS</div>';
return;
}
const reversed = [...data].reverse();
reversed.forEach(b => {
const time = new Date(b.timestamp).toLocaleTimeString();
const div = document.createElement('div');
div.style.padding = '5px';
div.style.borderBottom = '1px solid #ccc';
div.style.fontSize = '10px';
div.innerHTML = `<strong>${time}:</strong> ${b.message}`;
historyDiv.appendChild(div);
});
} catch (e) {
console.error('Load history error:', e);
}
}

function joinRadioChannel() {
const channel = document.getElementById('radio-channel')?.value || currentRadioChannel;
currentRadioChannel = channel;
const freqDisplay = document.getElementById('radio-freq-display');
const currentChannel = document.getElementById('current-channel');
if (freqDisplay) freqDisplay.textContent = `CHANNEL ${channel}`;
if (currentChannel) currentChannel.textContent = channel;
loadRadioMessages();
logMonitoring(`JOINED RADIO CHANNEL: ${channel}`);
}

async function loadRadioMessages() {
try {
const response = await storage.get('arcs_radio_messages');
const data = response ? JSON.parse(response.value) : [];
const messages = data.filter(m => m.frequency === currentRadioChannel);
const messagesDiv = document.getElementById('radio-messages');
if (!messagesDiv) return;
messagesDiv.innerHTML = '';
if (messages && messages.length > 0) {
messages.forEach(msg => renderRadioMessage(msg));
}
} catch (e) {
console.error('Load radio messages error:', e);
}
}

function sendRadioMessage() {
const input = document.getElementById('radio-input');
const message = input?.value.trim();
if (!message) return;
const msg = {
id: Date.now().toString(),
frequency: currentRadioChannel,
message,
userId: currentUser?.id || 'UNKNOWN',
userName: currentUser?.name || (currentUser?.id || 'UNKNOWN'),
timestamp: Date.now()
};
storage.get('arcs_radio_messages').then(res => {
const arr = res ? JSON.parse(res.value) : [];
arr.push(msg);
storage.set('arcs_radio_messages', JSON.stringify(arr));
});
input.value = '';
logMonitoring(`RADIO MESSAGE SENT ON ${currentRadioChannel}`);
renderRadioMessage(msg);
}

function renderRadioMessage(message) {
const messagesDiv = document.getElementById('radio-messages');
if (!messagesDiv) return;
const div = document.createElement('div');
div.className = 'radio-message';
const time = new Date(message.timestamp).toLocaleTimeString();
div.innerHTML = `         <span class="radio-message-time">[${time}]</span>         <span class="radio-message-user">${message.userName}:</span>         <span class="radio-message-text">${message.message}</span>
    `;
messagesDiv.appendChild(div);
messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function clearRadioChannel() {
if (!currentUser || currentUser.id !== ADMIN_ID) return;
const all = await storage.get('arcs_radio_messages');
const arr = all ? JSON.parse(all.value) : [];
const filtered = arr.filter(m => m.frequency !== currentRadioChannel);
await storage.set('arcs_radio_messages', JSON.stringify(filtered));
const messagesDiv = document.getElementById('radio-messages');
if (messagesDiv) messagesDiv.innerHTML = '';
playSound('sfx-blue');
logMonitoring(`RADIO CHANNEL ${currentRadioChannel} CLEARED`);
}

async function loadActiveUsers() {
try {
const response = await storage.get('arcs_users');
const data = response ? JSON.parse(response.value) : {};
const list = document.getElementById('active-users-list');
if (!list) return;
list.innerHTML = '';
Object.values(data).forEach(user => {
const div = document.createElement('div');
div.className = 'user-item';
div.innerHTML = `                <div class="user-info">                     <span class="user-name">${user.name || user.id}</span>                     <span class="user-status ${user.isOnline ? 'online' : 'offline'}">
                        ${user.isOnline ? 'ONLINE' : 'OFFLINE'}                     </span>                 </div>                 <div class="user-id">${user.id}</div>
                ${user.id !== ADMIN_ID && !user.isBanned ?`<button onclick="openBanModal('${user.id}')">BAN</button>`: ''}
           `;
list.appendChild(div);
});
} catch (e) {
console.error('Load users error:', e);
}
}

async function loadBannedUsers() {
try {
const response = await storage.get('arcs_banned');
const data = response ? JSON.parse(response.value) : [];
const list = document.getElementById('banned-list');
if (!list) return;
list.innerHTML = '';
if (!data || data.length === 0) {
list.innerHTML = '<div style="padding:10px;text-align:center;color:#666;">NO BANNED USERS</div>';
return;
}
data.forEach(ban => {
const div = document.createElement('div');
div.className = 'banned-item';
div.innerHTML = `                 <span>${ban.userId}</span>                 <span>${ban.reason}</span>                 <button onclick="unbanUser('${ban.userId}')">UNBAN</button>
            `;
list.appendChild(div);
});
} catch (e) {
console.error('Load banned error:', e);
}
}

function openBanModal(userId) {
const el = document.getElementById('ban-user-id');
if (el) el.value = userId;
const modal = document.getElementById('ban-modal');
if (modal) modal.classList.remove('hidden');
}

function closeBanModal() {
const modal = document.getElementById('ban-modal');
if (modal) modal.classList.add('hidden');
const reason = document.getElementById('ban-reason');
const duration = document.getElementById('ban-duration');
if (reason) reason.value = '';
if (duration) duration.value = '0';
}

async function confirmBan() {
const userId = document.getElementById('ban-user-id')?.value;
const reason = document.getElementById('ban-reason')?.value.trim();
const duration = parseInt(document.getElementById('ban-duration')?.value || '0') * 3600000;
if (!reason) {
showGlobalError('Please enter a reason');
return;
}
const banned = await storage.get('arcs_banned');
const arr = banned ? JSON.parse(banned.value) : [];
arr.push({ userId, reason, expiresAt: duration ? Date.now() + duration : null });
await storage.set('arcs_banned', JSON.stringify(arr));
const usersData = await storage.get('arcs_users');
const users = usersData ? JSON.parse(usersData.value) : {};
if (users[userId]) {
users[userId].isBanned = true;
await storage.set('arcs_users', JSON.stringify(users));
}
playSound('sfx-denied');
closeBanModal();
loadBannedUsers();
loadActiveUsers();
logMonitoring(`USER BANNED: ${userId}`);
}

async function unbanUser(userId) {
try {
const banned = await storage.get('arcs_banned');
const arr = banned ? JSON.parse(banned.value) : [];
await storage.set('arcs_banned', JSON.stringify(arr.filter(b => b.userId !== userId)));
const users = await storage.get('arcs_users');
const data = users ? JSON.parse(users.value) : {};
if (data[userId]) {
data[userId].isBanned = false;
await storage.set('arcs_users', JSON.stringify(data));
}
playSound('sfx-blue');
loadBannedUsers();
loadActiveUsers();
logMonitoring(`USER UNBANNED: ${userId}`);
} catch (e) {
console.error('Unban error:', e);
}
}

async function loadTickets() {
try {
const response = await storage.get('arcs_tickets');
const data = response ? JSON.parse(response.value) : [];
const list = document.getElementById('tickets-list');
if (!list) return;
list.innerHTML = '';
if (data.length === 0) {
list.innerHTML = '<div style="padding:10px;text-align:center;color:#666;">NO TICKETS</div>';
return;
}
data.forEach(ticket => {
const div = document.createElement('div');
div.className = 'ticket-item';
div.innerHTML = `                <div class="ticket-header">                     <span>${ticket.id}</span>                     <span class="ticket-status ${ticket.status}">${ticket.status}</span>                 </div>                 <div class="ticket-subject">${ticket.subject}</div>                 <div class="ticket-desc">${ticket.description}</div>
                ${currentUser && currentUser.id === ADMIN_ID ?` <div class="ticket-actions"> <button onclick="closeTicket('${ticket.id}')">CLOSE</button> </div>
`: ''}
           `;
list.appendChild(div);
});
} catch (e) {
console.error('Load tickets error:', e);
}
}

async function loadMyTickets() {
try {
const response = await storage.get('arcs_tickets');
const data = response ? JSON.parse(response.value) : [];
const list = document.getElementById('my-tickets');
if (!list) return;
list.innerHTML = '';
const my = data.filter(t => t.userId === (currentUser?.id || ''));
if (my.length === 0) {
list.innerHTML = '<div style="padding:10px;text-align:center;color:#666;">NO TICKETS</div>';
return;
}
my.forEach(ticket => {
const div = document.createElement('div');
div.className = 'ticket-item';
div.innerHTML = `                 <div class="ticket-header">                     <span>${ticket.id}</span>                     <span class="ticket-status ${ticket.status}">${ticket.status}</span>                 </div>                 <div class="ticket-subject">${ticket.subject}</div>                 <div class="ticket-desc">${ticket.description}</div>
            `;
list.appendChild(div);
});
} catch (e) {
console.error('Load my tickets error:', e);
}
}

function openTicketForm() {
const modal = document.getElementById('ticket-form-modal');
if (modal) modal.classList.remove('hidden');
}

function closeTicketForm() {
const modal = document.getElementById('ticket-form-modal');
if (modal) modal.classList.add('hidden');
const subj = document.getElementById('ticket-subject');
const desc = document.getElementById('ticket-description');
if (subj) subj.value = '';
if (desc) desc.value = '';
}

async function submitTicket() {
const subject = document.getElementById('ticket-subject')?.value.trim();
const description = document.getElementById('ticket-description')?.value.trim();
if (!subject || !description) {
showGlobalError('Please fill all fields');
return;
}
const ticket = {
id: Date.now().toString(),
userId: currentUser?.id || 'UNKNOWN',
subject,
description,
status: 'open',
timestamp: Date.now()
};
const all = await storage.get('arcs_tickets');
const arr = all ? JSON.parse(all.value) : [];
arr.push(ticket);
await storage.set('arcs_tickets', JSON.stringify(arr));
playSound('sfx-sent');
closeTicketForm();
logMonitoring(`TICKET CREATED: ${subject}`);
loadMyTickets();
loadTickets();
}

async function closeTicket(ticketId) {
try {
const all = await storage.get('arcs_tickets');
const arr = all ? JSON.parse(all.value) : [];
const updated = arr.map(t => t.id === ticketId ? Object.assign({}, t, { status: 'closed' }) : t);
await storage.set('arcs_tickets', JSON.stringify(updated));
playSound('sfx-blue');
logMonitoring(`TICKET CLOSED: ${ticketId}`);
loadTickets();
} catch (e) {
console.error('Close ticket error:', e);
}
}

async function loadAlarms() {
try {
const response = await storage.get('arcs_alarms');
const data = response ? JSON.parse(response.value) : [];
const container = document.getElementById('alarms-container');
if (!container) return;
container.innerHTML = '';
if (data.length === 0) {
container.innerHTML = '<div class="featured-box"><div class="featured-title">NO ACTIVE ALARMS</div></div>';
return;
}
data.forEach(alarm => {
const div = document.createElement('div');
div.className = 'alarm-item';
div.innerHTML = `                <div class="alarm-type">${alarm.type}</div>                 <div class="alarm-details">${alarm.details}</div>
                ${currentUser && currentUser.id === ADMIN_ID ?`<button onclick="dismissAlarm('${alarm.id}')">DISMISS</button>`: ''}
           `;
container.appendChild(div);
});
} catch (e) {
console.error('Load alarms error:', e);
}
}

async function dismissAlarm(alarmId) {
try {
const all = await storage.get('arcs_alarms');
const arr = all ? JSON.parse(all.value) : [];
await storage.set('arcs_alarms', JSON.stringify(arr.filter(a => a.id !== alarmId)));
loadAlarms();
} catch (e) {
console.error('Dismiss alarm error:', e);
}
}

async function loadAnalytics() {
try {
const usersData = await storage.get('arcs_users');
const users = usersData ? JSON.parse(usersData.value) : {};
const container = document.getElementById('analytics-container');
if (!container) return;
container.innerHTML = '';
const analytics = Object.values(users).map(u => ({
userName: u.name || u.id,
userId: u.id,
logins: u.logins || 0,
messagesSent: u.messagesSent || 0,
broadcastsSent: u.broadcastsSent || 0,
ticketsCreated: u.ticketsCreated || 0
}));
if (!analytics || analytics.length === 0) {
container.innerHTML = '<div style="padding:10px;text-align:center;color:#666;">NO ANALYTICS DATA</div>';
return;
}
analytics.forEach(user => {
const div = document.createElement('div');
div.className = 'analytics-item';
div.innerHTML = `                 <div class="analytics-user">${user.userName} (${user.userId})</div>                 <div class="analytics-stats">                     <span>Logins: ${user.logins}</span>                     <span>Messages: ${user.messagesSent}</span>                     <span>Broadcasts: ${user.broadcastsSent}</span>                     <span>Tickets: ${user.ticketsCreated}</span>                 </div>
            `;
container.appendChild(div);
});
} catch (e) {
console.error('Load analytics error:', e);
}
}

function loadProfile() {
const profileDiv = document.getElementById('profile-content');
if (!profileDiv || !currentUser) return;
profileDiv.innerHTML = `         <div class="profile-field">             <label>NAME:</label>             <span>${currentUser.name || currentUser.id}</span>         </div>         <div class="profile-field">             <label>ID:</label>             <span>${currentUser.id}</span>         </div>         <div class="profile-field">             <label>ROLE:</label>             <span>${currentUser.id === ADMIN_ID ? 'ADMINISTRATOR' : 'OPERATOR'}</span>         </div>
    `;
}

function switchCredTab(tab) {
document.querySelectorAll('.cred-tab').forEach(t => t.classList.remove('active'));
document.querySelectorAll('.cred-content').forEach(c => c.classList.remove('active'));
event.target.classList.add('active');
document.getElementById(`cred-${tab}`).classList.add('active');
if (tab === 'users') {
loadUserCredentials();
}
}

async function loadUserCredentials() {
try {
const response = await storage.get('arcs_users');
const data = response ? JSON.parse(response.value) : {};
const list = document.getElementById('users-credentials-list');
if (!list) return;
list.innerHTML = '';
Object.values(data).filter(u => u.id !== ADMIN_ID).forEach(user => {
const div = document.createElement('div');
div.className = 'cred-user-item';
div.innerHTML = `                 <div class="cred-user-name">${user.name || user.id}</div>                 <div class="cred-user-id">${user.id}</div>                 <div class="cred-user-avatar">                     <img src="${user.avatar || 'assets/sprites/normal.png'}" style="width:40px;height:40px;image-rendering:pixelated;">                 </div>
            `;
list.appendChild(div);
});
} catch (e) {
console.error('Load credentials error:', e);
}
}

function openChat() {
const chatWindow = document.getElementById('chat-window');
if (chatWindow) {
chatWindow.classList.remove('hidden');
loadChatHistory();
}
}

function closeChat() {
const chatWindow = document.getElementById('chat-window');
if (chatWindow) {
chatWindow.classList.add('hidden');
}
}

function minimizeChat() {
closeChat();
}

function loadChatHistory() {
if (!currentUser) return;
storage.get('arcs_chat').then(res => {
const history = res ? JSON.parse(res.value) : [];
const messagesDiv = document.getElementById('chat-messages');
if (messagesDiv) {
messagesDiv.innerHTML = '';
history.filter(h => h.participants && h.participants.includes(currentUser.id)).forEach(msg => renderChatMessage(msg));
}
});
}

function renderChatMessage(message) {
const messagesDiv = document.getElementById('chat-messages');
if (!messagesDiv || !currentUser) return;
const isSent = message.senderId === currentUser.id;
const msgDiv = document.createElement('div');
msgDiv.className = `chat-msg ${isSent ? 'sent' : 'received'}`;
let content = `<div class="chat-msg-content">${message.message}</div>`;
if (message.attachment) {
content += `<img src="${message.attachment}" class="chat-msg-image" onclick="openImageModal('${message.attachment}')">`;
}
const time = new Date(message.timestamp).toLocaleTimeString();
content += `         <div class="chat-msg-meta">             <span>${isSent ? 'YOU' : (message.senderName || 'OBUNTO')}</span>             <span>${time}</span>         </div>
    `;
msgDiv.innerHTML = content;
messagesDiv.appendChild(msgDiv);
messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function sendChatMessage() {
const input = document.getElementById('chat-input');
const text = input?.value.trim();
if (!text || !currentUser) return;
const msg = {
id: Date.now().toString(),
senderId: currentUser.id,
senderName: currentUser.name || currentUser.id,
participants: [currentUser.id, ADMIN_ID],
receiverId: ADMIN_ID,
message: text,
timestamp: Date.now()
};
const all = await storage.get('arcs_chat');
const arr = all ? JSON.parse(all.value) : [];
arr.push(msg);
await storage.set('arcs_chat', JSON.stringify(arr));
input.value = '';
logMonitoring(`CHAT MESSAGE SENT TO OBUNTO`);
renderChatMessage(msg);
const users = await storage.get('arcs_users');
const udata = users ? JSON.parse(users.value) : {};
if (udata[currentUser.id]) {
udata[currentUser.id].messagesSent = (udata[currentUser.id].messagesSent || 0) + 1;
await storage.set('arcs_users', JSON.stringify(udata));
}
}

async function handleFileUpload(event) {
const file = event.target.files[0];
if (!file) return;
const reader = new FileReader();
reader.onload = async (e) => {
const url = e.target.result;
const msg = {
id: Date.now().toString(),
senderId: currentUser.id,
senderName: currentUser.name || currentUser.id,
participants: [currentUser.id, ADMIN_ID],
receiverId: ADMIN_ID,
message: '[Image]',
attachment: url,
timestamp: Date.now()
};
const all = await storage.get('arcs_chat');
const arr = all ? JSON.parse(all.value) : [];
arr.push(msg);
await storage.set('arcs_chat', JSON.stringify(arr));
logMonitoring('IMAGE SENT IN CHAT');
renderChatMessage(msg);
};
reader.readAsDataURL(file);
event.target.value = '';
}

function openImageModal(src) {
const modal = document.getElementById('image-modal');
const img = document.getElementById('modal-image');
if (modal && img) {
img.src = src;
modal.classList.remove('hidden');
}
}

function closeImageModal() {
const modal = document.getElementById('image-modal');
if (modal) modal.classList.add('hidden');
}

document.getElementById('operator-id')?.addEventListener('keypress', (e) => {
if (e.key === 'Enter') {
const pass = document.getElementById('operator-password');
if (pass) pass.focus();
else handleLogin();
}
});

document.getElementById('operator-password')?.addEventListener('keypress', (e) => {
if (e.key === 'Enter') handleLogin();
});

document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
if (e.key === 'Enter') sendChatMessage();
});

document.getElementById('radio-input')?.addEventListener('keypress', (e) => {
if (e.key === 'Enter') sendRadioMessage();
});

window.addEventListener('load', async () => {
await init();
loadCustomTabs();
const savedTheme = localStorage.getItem('alarm-theme') || 'green';
if (savedTheme !== 'green') setAlarmTheme(savedTheme);
setTimeout(startLoading, 1000);
});

function openRegisterModal() {
const modal = document.getElementById('register-modal');
if (modal) modal.classList.remove('hidden');
const id = document.getElementById('register-id');
if (id) id.focus();
}

function closeRegisterModal() {
const modal = document.getElementById('register-modal');
if (modal) modal.classList.add('hidden');
const id = document.getElementById('register-id');
const pass = document.getElementById('register-password');
const passc = document.getElementById('register-password-confirm');
if (id) id.value = '';
if (pass) pass.value = '';
if (passc) passc.value = '';
const statusDiv = document.getElementById('register-status');
if (statusDiv) {
statusDiv.textContent = '';
statusDiv.className = 'register-status';
}
}

function showRegisterStatus(message, isError = false) {
const status = document.getElementById('register-status');
if (!status) return;
status.textContent = message;
status.className = 'register-status show';
if (isError) status.classList.add('error');
else status.classList.add('success');
}

async function handleRegister() {
const userId = document.getElementById('register-id')?.value.trim();
const password = document.getElementById('register-password')?.value;
const passwordConfirm = document.getElementById('register-password-confirm')?.value;
if (!userId || userId.length < 5) {
playSound('sfx-error');
showRegisterStatus('OPERATOR ID MUST BE AT LEAST 5 CHARACTERS', true);
return;
}
if (!password || password.length < 4) {
playSound('sfx-error');
showRegisterStatus('PASSWORD MUST BE AT LEAST 4 CHARACTERS', true);
return;
}
if (password !== passwordConfirm) {
playSound('sfx-error');
showRegisterStatus('PASSWORDS DO NOT MATCH', true);
return;
}
const usersData = await storage.get('arcs_users');
const users = usersData ? JSON.parse(usersData.value) : {};
if (users[userId]) {
playSound('sfx-denied');
showRegisterStatus('USER ALREADY EXISTS', true);
return;
}
const pendingData = await storage.get('arcs_pending');
const pending = pendingData ? JSON.parse(pendingData.value) : [];
if (!pending.includes(userId)) {
pending.push(userId);
await storage.set('arcs_pending', JSON.stringify(pending));
}
playSound('sfx-sent');
showRegisterStatus('REQUEST SENT! AWAITING ADMIN APPROVAL.', false);
setTimeout(() => {
closeRegisterModal();
}, 3000);
}

document.getElementById('register-id')?.addEventListener('keypress', (e) => {
if (e.key === 'Enter') {
const pass = document.getElementById('register-password');
if (pass) pass.focus();
}
});

document.getElementById('register-password')?.addEventListener('keypress', (e) => {
if (e.key === 'Enter') {
const passc = document.getElementById('register-password-confirm');
if (passc) passc.focus();
}
});

document.getElementById('register-password-confirm')?.addEventListener('keypress', (e) => {
if (e.key === 'Enter') handleRegister();
});

async function openAdmin() {
const panel = document.getElementById('admin-panel');
if (panel) panel.classList.remove('hidden');
loadPending('pending-list-modal');
}

function closeAdmin() {
const panel = document.getElementById('admin-panel');
if (panel) panel.classList.add('hidden');
}

async function init() {
try {
const users = await storage.get('arcs_users');
if (!users) {
const base = { [ADMIN_ID]: { id: ADMIN_ID, approved: true, name: 'ADMIN', isOnline: false } };
await storage.set('arcs_users', JSON.stringify(base));
}
const pending = await storage.get('arcs_pending');
if (!pending) {
await storage.set('arcs_pending', JSON.stringify([]));
}
const broadcasts = await storage.get('arcs_broadcasts');
if (!broadcasts) await storage.set('arcs_broadcasts', JSON.stringify([]));
const tickets = await storage.get('arcs_tickets');
if (!tickets) await storage.set('arcs_tickets', JSON.stringify([]));
const alarms = await storage.get('arcs_alarms');
if (!alarms) await storage.set('arcs_alarms', JSON.stringify([]));
const radio = await storage.get('arcs_radio_messages');
if (!radio) await storage.set('arcs_radio_messages', JSON.stringify([]));
const chat = await storage.get('arcs_chat');
if (!chat) await storage.set('arcs_chat', JSON.stringify([]));
const banned = await storage.get('arcs_banned');
if (!banned) await storage.set('arcs_banned', JSON.stringify([]));
} catch (e) {
console.error('Init error:', e);
}
}

function setAlarmTheme(theme) {
document.body.className = '';
if (theme !== 'green') {
document.body.classList.add(`theme-${theme}`);
}
localStorage.setItem('alarm-theme', theme);
playSound('sfx-blue');
}

let customTabs = [];
let activeTabId = null;

function loadCustomTabs() {
const saved = localStorage.getItem('arcs-custom-tabs');
if (saved) {
customTabs = JSON.parse(saved);
renderCustomTabsList();
}
}

function renderCustomTabsList() {
const list = document.getElementById('custom-tabs-list');
if (!list) return;
list.innerHTML = '';
customTabs.forEach(tab => {
const item = document.createElement('div');
item.className = `tab-item ${activeTabId === tab.id ? 'active' : ''}`;
item.innerHTML = `             <span>${tab.name}</span>             <div class="tab-item-actions">                 <div class="tab-action-btn" onclick="editCustomTab('${tab.id}')">✎</div>                 <div class="tab-action-btn" onclick="deleteCustomTab('${tab.id}')">×</div>             </div>
        `;
item.onclick = (e) => {
if (!e.target.classList.contains('tab-action-btn')) {
editCustomTab(tab.id);
}
};
list.appendChild(item);
});
}

function createNewCustomTab() {
const newTab = {
id: Date.now().toString(),
name: 'New Tab',
material: 'paper',
content: '',
image: null
};
customTabs.push(newTab);
renderCustomTabsList();
editCustomTab(newTab.id);
}

function editCustomTab(tabId) {
activeTabId = tabId;
const tab = customTabs.find(t => t.id === tabId);
if (!tab) return;
const editor = document.getElementById('tab-editor');
if (!editor) return;
editor.innerHTML = `        <div class="editor-section">             <div class="editor-section-title">Tab Settings</div>             <div class="editor-field">                 <label class="editor-label">Tab Name</label>                 <input type="text" class="editor-input" value="${tab.name}" onchange="updateTabField('${tabId}', 'name', this.value)">             </div>         </div>         <div class="editor-section">             <div class="editor-section-title">Background Material</div>             <div class="material-selector">                 <div class="material-option ${tab.material === 'paper' ? 'active' : ''}" onclick="updateTabField('${tabId}', 'material', 'paper')">PAPER</div>                 <div class="material-option ${tab.material === 'metal' ? 'active' : ''}" onclick="updateTabField('${tabId}', 'material', 'metal')">METAL</div>                 <div class="material-option ${tab.material === 'wood' ? 'active' : ''}" onclick="updateTabField('${tabId}', 'material', 'wood')">WOOD</div>                 <div class="material-option ${tab.material === 'screen' ? 'active' : ''}" onclick="updateTabField('${tabId}', 'material', 'screen')">SCREEN</div>             </div>         </div>         <div class="editor-section">             <div class="editor-section-title">Content</div>             <div class="editor-field">                 <label class="editor-label">Text Content</label>                 <textarea class="editor-textarea" onchange="updateTabField('${tabId}', 'content', this.value)">${tab.content}</textarea>             </div>         </div>         <div class="editor-section">             <div class="editor-section-title">Image</div>             <div class="image-upload-zone ${tab.image ? 'has-image' : ''}" onclick="uploadTabImage('${tabId}')">
                ${tab.image ?`<img src="${tab.image}" class="uploaded-image-preview"><div class="image-remove-btn" onclick="event.stopPropagation(); removeTabImage('${tabId}')">×</div>`: 'CLICK TO UPLOAD IMAGE'}             </div>         </div>         <div class="editor-preview">             <div class="preview-label">Preview</div>             <div class="preview-content" style="background: ${getMaterialStyle(tab.material)}">
                ${tab.image ?`<img src="${tab.image}" style="max-width:100%; margin-bottom:16px;">`: ''}
                ${tab.content}             </div>         </div>
   `;
renderCustomTabsList();
}

function updateTabField(tabId, field, value) {
const tab = customTabs.find(t => t.id === tabId);
if (tab) {
tab[field] = value;
if (field === 'name') renderCustomTabsList();
else editCustomTab(tabId);
}
}

function deleteCustomTab(tabId) {
if (confirm('Delete this tab?')) {
customTabs = customTabs.filter(t => t.id !== tabId);
renderCustomTabsList();
const editor = document.getElementById('tab-editor');
if (editor) editor.innerHTML = `             <div class="empty-editor-state">                 <div class="empty-editor-icon">📝</div>                 <div class="empty-editor-text">SELECT A TAB OR CREATE A NEW ONE</div>             </div>
        `;
}
}

function getMaterialStyle(material) {
const styles = {
paper: '#F5F0E8',
metal: '#C0C8D0',
wood: '#D4B896',
screen: '#E8F0E8'
};
return styles[material] || '#E0D8C0';
}

function saveCustomTabs() {
localStorage.setItem('arcs-custom-tabs', JSON.stringify(customTabs));
playSound('sfx-sent');
alert('TABS SAVED');
}

function publishCustomTabs() {
saveCustomTabs();
playSound('sfx-blue');
alert('TABS PUBLISHED TO MENU');
}

function uploadTabImage(tabId) {
const input = document.createElement('input');
input.type = 'file';
input.accept = 'image/*';
input.onchange = (e) => {
const file = e.target.files[0];
if (file) {
const reader = new FileReader();
reader.onload = (event) => {
updateTabField(tabId, 'image', event.target.result);
};
reader.readAsDataURL(file);
}
};
input.click();
}

function removeTabImage(tabId) {
updateTabField(tabId, 'image', null);
}

document.querySelectorAll('.sprite-option').forEach(option => {
option.addEventListener('click', () => {
document.querySelectorAll('.sprite-option').forEach(o => o.classList.remove('active'));
option.classList.add('active');
const select = document.getElementById('sprite-select');
if (select) select.value = option.dataset.sprite;
});
});

document.querySelectorAll('.tab').forEach(tab => {
tab.addEventListener('click', () => {
const parentId = tab.parentElement.id;
document.querySelectorAll(`#${parentId} .tab`).forEach(t => t.classList.remove('active'));
tab.classList.add('active');
const target = tab.getAttribute('data-target');
switchTab(target);
});
});
