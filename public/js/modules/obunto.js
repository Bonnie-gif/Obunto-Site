import { UI, bringToFront } from './ui.js';
import { playSound } from './audio.js';

let currentMood = 'normal';
let currentChatTarget = null;
let currentSpyTarget = null;
const MOODS = ['annoyed', 'bug', 'dizzy', 'happy', 'hollow', 'normal', 'panic', 'sad', 'sleeping', 'Smug', 'stare', 'suspicious', 'werror'];
let bubbleTimeout;

export function initObunto(socket, userId) {
    // Escuta mensagens do mascote
    socket.on('receive_broadcast_message', (data) => {
        if (data.targetId && data.targetId !== userId) return;
        speak(data.message, data.mood);
    });

    socket.on('play_alarm_sound', (type) => {
        playSound(type);
    });

    // Se for Admin (8989) ou Dr. Holtz (36679824), habilita o painel
    if (userId === "8989" || userId === "36679824") {
        UI.dock.btnObuntoControl.classList.remove('hidden');
        
        // Botão da Dock abre o painel
        UI.dock.btnObuntoControl.onclick = () => {
            UI.obunto.panel.classList.remove('hidden');
            bringToFront(UI.obunto.panel);
            playSound('click');
        };

        setupAdminPanel(socket);
        setupMonitor(socket);
        setupTicketSystem(socket);
        
        // Admin Chat
        socket.on('chat_receive', (data) => {
            if (currentChatTarget) {
                const div = document.createElement('div');
                div.className = 'chat-msg user';
                div.textContent = data.message;
                UI.obunto.adminChat.history.appendChild(div);
                UI.obunto.adminChat.history.scrollTop = UI.obunto.adminChat.history.scrollHeight;
                playSound('msg');
            }
        });
    }
}

function setupAdminPanel(socket) {
    UI.obunto.btnClose.onclick = () => UI.obunto.panel.classList.add('hidden');
    
    // Controles de Energia (+ e -)
    const btnInc = document.getElementById('btnEnergyInc');
    const btnDec = document.getElementById('btnEnergyDec');
    if (btnInc) btnInc.onclick = () => socket.emit('admin_modify_energy', 10);
    if (btnDec) btnDec.onclick = () => socket.emit('admin_modify_energy', -10);

    // Sistema Online/Offline
    UI.obunto.btnToggle.onclick = () => {
        const current = document.getElementById('statusText').textContent;
        socket.emit('toggle_system_status', current === 'ONLINE' ? 'OFFLINE' : 'ONLINE');
    };

    // Botões de Alarme
    document.querySelectorAll('.btn-alarm').forEach(btn => {
        btn.onclick = () => {
            const type = btn.getAttribute('data-alarm');
            socket.emit('admin_trigger_alarm', type);
        };
    });

    // Broadcast
    UI.obunto.btnSend.onclick = () => {
        const msg = UI.obunto.msg.value.trim();
        const target = UI.obunto.target.value.trim() || null;
        if (!msg) return;
        socket.emit('admin_broadcast_message', { message: msg, mood: currentMood, targetId: target });
        UI.obunto.msg.value = '';
    };
    
    // Mood Grid
    if(UI.obunto.moods) {
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
    }
}

function setupMonitor(socket) {
    UI.obunto.btnMonitor.onclick = () => {
        UI.obunto.monitor.window.classList.remove('hidden');
        bringToFront(UI.obunto.monitor.window);
        playSound('click');
    };
    UI.obunto.monitor.close.onclick = () => UI.obunto.monitor.window.classList.add('hidden');

    socket.on('personnel_list_update', (list) => {
        const container = UI.obunto.monitor.list;
        container.innerHTML = '';
        list.forEach(p => {
            const div = document.createElement('div');
            div.className = 'personnel-row';
            div.innerHTML = `
                <div class="p-id">${p.id}</div>
                <div class="p-name">${p.name}</div>
                <div class="p-status ${p.status.toLowerCase()}">${p.status}</div>
                <div class="p-act">${p.activity}</div>
                <button class="btn-newton" style="font-size:9px; padding:2px 4px;">TASK</button>
            `;
            // Botão Task
            div.querySelector('button').onclick = (e) => {
                e.stopPropagation();
                socket.emit('admin_assign_task', { targetId: p.id, taskType: 'HEX' });
            };
            // Clique na linha = Espionar
            div.onclick = () => startSpy(p.id, p.name, socket);
            container.appendChild(div);
        });
    });

    // Spy Logic
    socket.on('spy_data_update', (data) => {
        if(currentSpyTarget === data.targetId) {
            const el = document.getElementById('spy-state-data');
            if(el) el.innerHTML = `VIEW: <strong>${data.state.view}</strong><br>AFK: ${data.state.afk}`;
        }
    });

    socket.on('spy_input_update', (data) => {
        if(currentSpyTarget === data.targetId) {
            const el = document.getElementById('spy-input-data');
            if(el) {
                const line = document.createElement('div');
                line.textContent = `> ${data.value}`;
                el.appendChild(line);
                el.scrollTop = el.scrollHeight;
            }
        }
    });

    UI.obunto.spy.close.onclick = () => {
        UI.obunto.spy.window.classList.add('hidden');
        currentSpyTarget = null;
    };
}

function startSpy(id, name, socket) {
    currentSpyTarget = id;
    UI.obunto.spy.title.textContent = name.toUpperCase();
    UI.obunto.spy.window.classList.remove('hidden');
    bringToFront(UI.obunto.spy.window);
    UI.obunto.spy.content.innerHTML = `<div class="spy-section"><div class="spy-header">SYSTEM STATE</div><div id="spy-state-data">WAITING...</div></div><div class="spy-section"><div class="spy-header">LOG</div><div id="spy-input-data" class="spy-log"></div></div>`;
    socket.emit('admin_spy_start', id);
}

function setupTicketSystem(socket) {
    socket.on('new_help_request', (ticket) => {
        playSound('msg');
        UI.obunto.notifyIcon.classList.remove('hidden');
        addTicketToList(ticket, socket);
    });

    socket.on('load_pending_tickets', (tickets) => {
        if(tickets.length > 0) UI.obunto.notifyIcon.classList.remove('hidden');
        UI.obunto.ticketList.innerHTML = '';
        tickets.forEach(t => addTicketToList(t, socket));
    });

    UI.obunto.notifyIcon.onclick = () => {
        UI.obunto.panel.classList.remove('hidden');
        UI.obunto.notifyIcon.classList.add('hidden');
    };

    // Chat Admin Controls
    const { send, input, close } = UI.obunto.adminChat;
    send.onclick = () => {
        const msg = input.value.trim();
        if (!msg || !currentChatTarget) return;
        socket.emit('chat_message', { targetId: currentChatTarget, message: msg, sender: 'ADMIN' });
        const div = document.createElement('div');
        div.className = 'chat-msg admin';
        div.textContent = msg;
        UI.obunto.adminChat.history.appendChild(div);
        input.value = '';
    };
    close.onclick = () => {
        if(currentChatTarget) {
            socket.emit('admin_close_ticket', currentChatTarget);
            currentChatTarget = null;
            UI.obunto.adminChat.window.classList.add('hidden');
        }
    };
}

function addTicketToList(ticket, socket) {
    const div = document.createElement('div');
    div.className = 'ticket-item';
    div.innerHTML = `<span>ID: ${ticket.userId}</span>`;
    div.onclick = () => {
        currentChatTarget = ticket.userId;
        UI.obunto.adminChat.target.textContent = ticket.userId;
        UI.obunto.adminChat.window.classList.remove('hidden');
        UI.obunto.adminChat.history.innerHTML = '<div class="chat-msg system">SESSION STARTED</div>';
        div.remove();
        socket.emit('admin_accept_ticket', ticket.id);
    };
    if(UI.obunto.ticketList.querySelector('.no-tickets')) UI.obunto.ticketList.innerHTML = '';
    UI.obunto.ticketList.appendChild(div);
}

export function speak(text, mood) {
    UI.obunto.img.src = `/obunto/${mood}.png`;
    UI.obunto.text.textContent = text;
    UI.obunto.bubble.classList.remove('hidden');
    playSound('msg');
    if (bubbleTimeout) clearTimeout(bubbleTimeout);
    bubbleTimeout = setTimeout(() => { UI.obunto.bubble.classList.add('hidden'); }, 8000);
}