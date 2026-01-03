import { UI, bringToFront } from '../ui.js';
import { playSound } from '../audio.js';

let currentMood = 'normal';
let currentChatTarget = null;
let currentSpyTarget = null;
const MOODS = ['annoyed', 'bug', 'dizzy', 'happy', 'hollow', 'normal', 'panic', 'sad', 'sleeping', 'Smug', 'stare', 'suspicious', 'werror'];
let bubbleTimeout;

export function initObunto(socket, userId) {
    socket.on('receive_broadcast_message', (data) => {
        if (data.targetId && data.targetId !== userId) return;
        speak(data.message, data.mood);
    });

    socket.on('play_alarm_sound', (type) => {
        playSound(type);
    });

    if (UI.obunto.aop.btnReboot) {
        UI.obunto.aop.btnReboot.onclick = () => {
            socket.emit('admin_trigger_alarm', 'on');
        };
    }

    if (userId === "8989") {
        UI.dock.btnObuntoControl.classList.remove('hidden');
        UI.dock.btnObuntoControl.onclick = () => {
            UI.obunto.panel.classList.remove('hidden');
            bringToFront(UI.obunto.panel);
            playSound('click');
        };

        setupAdminPanel(socket);
        
        UI.obunto.btnMonitor.onclick = () => {
            UI.obunto.monitor.window.classList.remove('hidden');
            bringToFront(UI.obunto.monitor.window);
            playSound('click');
        };
        UI.obunto.monitor.close.onclick = () => UI.obunto.monitor.window.classList.add('hidden');

        socket.on('personnel_list_update', (list) => {
            renderPersonnelList(list, socket);
        });

        socket.on('spy_data_update', (data) => {
            if(currentSpyTarget === data.targetId) {
                renderSpyData(data.state);
            }
        });

        socket.on('spy_input_update', (data) => {
            if(currentSpyTarget === data.targetId) {
                renderSpyInput(data);
            }
        });

        UI.obunto.spy.close.onclick = () => {
            UI.obunto.spy.window.classList.add('hidden');
            currentSpyTarget = null;
        };

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

function renderPersonnelList(list, socket) {
    const container = UI.obunto.monitor.list;
    container.innerHTML = '';
    list.forEach(p => {
        const div = document.createElement('div');
        div.className = 'personnel-row';
        div.style.cursor = 'pointer';
        div.innerHTML = `
            <div class="p-id">${p.id}</div>
            <div class="p-name">${p.name}</div>
            <div class="p-status ${p.status.toLowerCase()}">${p.status}</div>
            <div class="p-act">${p.activity}</div>
            <button class="btn-newton" style="font-size:9px; padding:2px 4px; margin-left:5px;">TASK</button>
        `;
        
        const btnTask = div.querySelector('button');
        btnTask.onclick = (e) => {
            e.stopPropagation();
            socket.emit('admin_assign_task', { targetId: p.id, taskType: 'HEX' });
        };

        div.onclick = () => {
            startSpy(p.id, p.name, socket);
        };
        container.appendChild(div);
    });
}

function startSpy(id, name, socket) {
    currentSpyTarget = id;
    UI.obunto.spy.title.textContent = name.toUpperCase();
    UI.obunto.spy.window.classList.remove('hidden');
    bringToFront(UI.obunto.spy.window);
    UI.obunto.spy.content.innerHTML = `<div class="spy-section"><div class="spy-header">SYSTEM STATE</div><div id="spy-state-data">WAITING FOR UPLINK...</div></div><div class="spy-section" style="flex: 1; border-top: 1px dashed var(--border-light);"><div class="spy-header">KEYSTROKE FEED</div><div id="spy-input-data" class="spy-log"></div></div>`;
    socket.emit('admin_spy_start', id);
}

function renderSpyData(state) {
    if(!state) return;
    const el = document.getElementById('spy-state-data');
    if(!el) return;
    
    let html = `<div style="margin-bottom:10px;">CURRENT VIEW: <strong>${state.view}</strong></div>`;
    html += `<div>OPEN WINDOWS:</div>`;
    state.windows.forEach(w => {
        if(!w.hidden) html += `<div>- ${w.id}</div>`;
    });
    if(state.afk) html += `<div style="color:var(--alert-color); margin-top:10px;">[USER IS AFK]</div>`;
    el.innerHTML = html;
}

function renderSpyInput(data) {
    const el = document.getElementById('spy-input-data');
    if(!el) return;
    const line = document.createElement('div');
    const time = new Date().toLocaleTimeString().split(' ')[0];
    line.textContent = `[${time}] > ${data.value}`; 
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
}

export function speak(text, mood) {
    UI.obunto.img.src = `/obunto/${mood}.png`;
    UI.obunto.text.textContent = text;
    UI.obunto.bubble.classList.remove('hidden');
    
    if (mood === 'sleeping') playSound('sleep');
    else if (mood === 'dizzy') playSound('uhoh');
    else playSound('msg');

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
        if(UI.obunto.ticketList.children.length === 0) UI.obunto.notifyIcon.classList.add('hidden');
        socket.emit('admin_accept_ticket', ticket.id);
    };
    if(UI.obunto.ticketList.querySelector('.no-tickets')) UI.obunto.ticketList.innerHTML = '';
    UI.obunto.ticketList.appendChild(div);
}

function openChatSession(userId) {
    currentChatTarget = userId;
    const { window, target, history } = UI.obunto.adminChat;
    target.textContent = userId;
    window.classList.remove('hidden');
    history.innerHTML = '<div class="chat-msg system">SESSION STARTED</div>';
}

function setupAdminPanel(socket) {
    UI.obunto.btnOpen.classList.remove('hidden');
    
    UI.obunto.notifyIcon.onclick = () => {
        UI.obunto.panel.classList.remove('hidden');
        UI.obunto.notifyIcon.classList.add('hidden');
    };

    // ENERGY CONTROLS
    const btnInc = document.getElementById('btnEnergyInc');
    const btnDec = document.getElementById('btnEnergyDec');
    if (btnInc) btnInc.onclick = () => socket.emit('admin_modify_energy', 10);
    if (btnDec) btnDec.onclick = () => socket.emit('admin_modify_energy', -10);

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

    UI.obunto.btnClose.onclick = () => UI.obunto.panel.classList.add('hidden');
    
    UI.obunto.btnToggle.onclick = () => {
        const current = document.getElementById('statusText').textContent;
        socket.emit('toggle_system_status', current === 'ONLINE' ? 'OFFLINE' : 'ONLINE');
    };

    document.querySelectorAll('.btn-alarm').forEach(btn => {
        btn.onclick = () => {
            const type = btn.getAttribute('data-alarm');
            socket.emit('admin_trigger_alarm', type);
        };
    });

    UI.obunto.btnSend.onclick = () => {
        const msg = UI.obunto.msg.value.trim();
        let target = null;
        if(UI.obunto.target && UI.obunto.target.value.trim() !== '') {
            target = UI.obunto.target.value.trim();
        }

        if (!msg) return;
        
        socket.emit('admin_broadcast_message', { 
            message: msg, 
            mood: currentMood, 
            targetId: target 
        });
        UI.obunto.msg.value = '';
    };

    const { send, input, wait, close } = UI.obunto.adminChat;

    send.onclick = () => {
        const msg = input.value.trim();
        if (!msg || !currentChatTarget) return;
        socket.emit('chat_message', { targetId: currentChatTarget, message: msg, sender: 'ADMIN' });
        const div = document.createElement('div');
        div.className = 'chat-msg admin';
        div.textContent = msg;
        UI.obunto.adminChat.history.appendChild(div);
        UI.obunto.adminChat.history.scrollTop = UI.obunto.adminChat.history.scrollHeight;
        input.value = '';
    };

    wait.onclick = () => {
        if(currentChatTarget) socket.emit('admin_wait_signal', currentChatTarget);
    };

    close.onclick = () => {
        if(currentChatTarget) {
            socket.emit('admin_close_ticket', currentChatTarget);
            currentChatTarget = null;
            UI.obunto.adminChat.window.classList.add('hidden');
        }
    };
}