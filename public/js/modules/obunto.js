import { UI } from './ui.js';
import { playSound } from './audio.js';

let currentMood = 'normal';
let currentChatTarget = null;
const MOODS = ['annoyed', 'bug', 'dizzy', 'happy', 'hollow', 'normal', 'panic', 'sad', 'sleeping', 'Smug', 'stare', 'suspicious', 'werror'];
let bubbleTimeout;

export function initObunto(socket, userId) {
    socket.on('display_mascot_message', (data) => {
        if (data.targetId && data.targetId !== userId) return;
        speak(data.message, data.mood);
    });

    if (userId === "8989") {
        setupAdminPanel(socket);
        
        socket.on('new_help_request', (ticket) => {
            playSound('notify');
            UI.obunto.notifyIcon.classList.remove('hidden');
            addTicketToList(ticket, socket);
        });

        socket.on('load_pending_tickets', (tickets) => {
            if (tickets.length > 0) UI.obunto.notifyIcon.classList.remove('hidden');
            UI.obunto.ticketList.innerHTML = '';
            tickets.forEach(t => addTicketToList(t, socket));
        });

        socket.on('chat_receive', (data) => {
            if (currentChatTarget) {
                const div = document.createElement('div');
                div.className = 'chat-msg user';
                div.textContent = data.message;
                UI.obunto.chatHistory.appendChild(div);
                UI.obunto.chatHistory.scrollTop = UI.obunto.chatHistory.scrollHeight;
                playSound('notify');
            }
        });
    }
}

export function speak(text, mood) {
    UI.obunto.img.src = `/obunto/${mood}.png`;
    UI.obunto.text.textContent = text;
    UI.obunto.bubble.classList.remove('hidden');
    playSound('speak');
    if (bubbleTimeout) clearTimeout(bubbleTimeout);
    bubbleTimeout = setTimeout(() => { UI.obunto.bubble.classList.add('hidden'); }, 8000);
}

function addTicketToList(ticket, socket) {
    const div = document.createElement('div');
    div.className = 'ticket-item';
    div.id = `ticket-${ticket.id}`;
    div.innerHTML = `<span>ID: ${ticket.userId}</span><small>${ticket.msg.substring(0, 15)}...</small>`;
    div.onclick = () => {
        openChatSession(ticket.userId);
        div.remove();
        if (UI.obunto.ticketList.children.length === 0) UI.obunto.notifyIcon.classList.add('hidden');
        socket.emit('admin_accept_ticket', ticket.id);
    };
    if(UI.obunto.ticketList.querySelector('.no-tickets')) UI.obunto.ticketList.innerHTML = '';
    UI.obunto.ticketList.appendChild(div);
}

function openChatSession(userId) {
    currentChatTarget = userId;
    UI.obunto.chatTarget.textContent = userId;
    UI.obunto.chatArea.classList.remove('hidden');
    UI.obunto.chatHistory.innerHTML = '<div class="chat-msg system">SESSION STARTED</div>';
}

function setupAdminPanel(socket) {
    UI.obunto.btnOpen.classList.remove('hidden');
    UI.obunto.notifyIcon.onclick = () => {
        UI.obunto.panel.classList.remove('hidden');
        UI.obunto.notifyIcon.classList.add('hidden');
    };

    UI.obunto.moods.innerHTML = '';
    MOODS.forEach(mood => {
        const div = document.createElement('div');
        div.className = 'mood-icon';
        if (mood === 'normal') div.classList.add('active'); 
        div.innerHTML = `<img src="/obunto/${mood}.png"><br><span>${mood}</span>`;
        div.onclick = () => {
            document.querySelectorAll('.mood-icon').forEach(m => m.classList.remove('active'));
            div.classList.add('active');
            currentMood = mood;
        };
        UI.obunto.moods.appendChild(div);
    });

    UI.obunto.btnOpen.onclick = () => UI.obunto.panel.classList.remove('hidden');
    UI.obunto.btnClose.onclick = () => UI.obunto.panel.classList.add('hidden');
    
    UI.obunto.btnToggle.onclick = () => {
        const current = document.getElementById('statusText').textContent;
        socket.emit('toggle_system_status', current === 'ONLINE' ? 'OFFLINE' : 'ONLINE');
    };

    UI.obunto.chatSend.onclick = () => {
        const msg = UI.obunto.chatInput.value.trim();
        if (!msg || !currentChatTarget) return;
        socket.emit('chat_message', { targetId: currentChatTarget, message: msg, sender: 'ADMIN' });
        const div = document.createElement('div');
        div.className = 'chat-msg admin';
        div.textContent = msg;
        UI.obunto.chatHistory.appendChild(div);
        UI.obunto.chatHistory.scrollTop = UI.obunto.chatHistory.scrollHeight;
        UI.obunto.chatInput.value = '';
    };

    UI.obunto.chatClose.onclick = () => {
        if(currentChatTarget) {
            socket.emit('admin_close_ticket', currentChatTarget);
            currentChatTarget = null;
            UI.obunto.chatArea.classList.add('hidden');
        }
    };

    UI.obunto.btnSend.onclick = () => {
        const msg = UI.obunto.msg.value.trim();
        const target = UI.obunto.target.value.trim();
        if (!msg) return;
        socket.emit('mascot_broadcast', { message: msg, mood: currentMood, targetId: target || null });
        UI.obunto.msg.value = '';
    };
}