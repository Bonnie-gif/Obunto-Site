import { playSound } from './audio.js';

export function initObunto(socket) {
    window.obuntoSay = (text, mood = 'normal') => {
        const overlay = document.getElementById('obunto-overlay');
        const bubble = document.getElementById('obunto-bubble');
        const avatar = document.getElementById('obunto-avatar');
        
        if(avatar) avatar.src = `/Sprites/${mood}.png`;
        if(bubble) bubble.textContent = text;
        
        if(overlay) {
            overlay.classList.remove('hidden');
            overlay.style.animation = 'slideInUp 0.5s ease-out forwards';
            playSound('notify');
            
            setTimeout(() => {
                overlay.style.animation = 'slideOutDown 0.5s ease-in forwards';
                setTimeout(() => {
                    overlay.classList.add('hidden');
                }, 500);
            }, 8000);
        }
    };
    
    socket.on('receive_broadcast_message', (data) => {
        window.obuntoSay(data.message, data.mood);
    });

    const btnToggleStatus = document.getElementById('btnToggleStatus');
    if(btnToggleStatus) {
        btnToggleStatus.onclick = () => {
            const statusEl = document.getElementById('adminStatus');
            const current = statusEl?.textContent;
            const newStatus = current === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
            socket.emit('toggle_system_status', newStatus);
        };
    }

    const btnBroadcast = document.getElementById('btnBroadcast');
    const adminMsg = document.getElementById('adminMsg');
    
    if(btnBroadcast && adminMsg) {
        btnBroadcast.onclick = () => {
            const msg = adminMsg.value.trim();
            if(msg) {
                const activeMood = document.querySelector('.mood-icon.active')?.dataset.mood || 'normal';
                socket.emit('admin_broadcast_message', { message: msg, mood: activeMood });
                adminMsg.value = '';
                playSound('sent');
            }
        };
    }

    document.querySelectorAll('.mood-icon').forEach(icon => {
        icon.onclick = () => {
            document.querySelectorAll('.mood-icon').forEach(i => i.classList.remove('active'));
            icon.classList.add('active');
            playSound('click');
        };
    });

    document.querySelectorAll('.btn-alarm').forEach(btn => {
        btn.onclick = () => {
            const type = btn.dataset.alarm;
            socket.emit('admin_trigger_alarm', type);
            playSound('click');
        };
    });

    const spyLog = document.getElementById('spy-input-data');
    if(spyLog) {
        socket.on('spy_input_update', (data) => {
            const time = new Date().toLocaleTimeString();
            spyLog.textContent += `[${time}] USER ${data.targetId}: ${data.value}\n`;
            spyLog.scrollTop = spyLog.scrollHeight;
        });
    }

    const btnAdminChatSend = document.getElementById('btnAdminChatSend');
    const adminChatTarget = document.getElementById('adminChatTarget');
    const adminChatMsg = document.getElementById('adminChatMsg');

    if (btnAdminChatSend) {
        btnAdminChatSend.onclick = () => {
            const target = adminChatTarget?.value.trim();
            const msg = adminChatMsg?.value.trim();
            if (target && msg) {
                socket.emit('chat_message', { 
                    message: msg, 
                    targetId: target, 
                    sender: 'ADMIN' 
                });
                adminChatMsg.value = '';
                playSound('sent');
            }
        };
    }

    initHelpQueue(socket);
}

function initHelpQueue(socket) {
    const queue = document.getElementById('help-queue');
    if(!queue) return;
    
    socket.on('help_request_received', (ticket) => {
        const existing = document.getElementById(`ticket-${ticket.id}`);
        if(existing) return;

        const el = document.createElement('div');
        el.className = 'help-ticket';
        el.id = `ticket-${ticket.id}`;
        el.dataset.userid = ticket.userId; 
        el.innerHTML = `
            <div class="ticket-header">
                <span>USER: ${ticket.userId}</span>
                <span>${new Date(ticket.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="ticket-message">${ticket.message}</div>
            <div class="ticket-actions">
                <button class="btn-newton" onclick="window.acceptTicket('${ticket.id}')">ACCEPT</button>
                <button class="btn-newton" onclick="window.rejectTicket('${ticket.id}')">REJECT</button>
                <button class="btn-newton" onclick="window.waitTicket('${ticket.id}')">WAITING</button>
            </div>
        `;
        queue.appendChild(el);
        playSound('notify');
    });

    window.acceptTicket = (id) => {
        const el = document.getElementById(`ticket-${id}`);
        if(el) {
            socket.emit('update_ticket_status', { ticketId: id, status: 'accepted' });
            el.style.backgroundColor = '#90ee90';
            const userId = el.dataset.userid;
            const adminTarget = document.getElementById('adminChatTarget');
            if(adminTarget && userId) adminTarget.value = userId;
            
            setTimeout(() => el.remove(), 2000);
        }
        playSound('click');
    };

    window.rejectTicket = (id) => {
        socket.emit('update_ticket_status', { ticketId: id, status: 'rejected' });
        document.getElementById(`ticket-${id}`)?.remove();
        playSound('click');
    };

    window.waitTicket = (id) => {
        socket.emit('update_ticket_status', { ticketId: id, status: 'waiting' });
        const el = document.getElementById(`ticket-${id}`);
        if(el) el.style.backgroundColor = '#ffd700';
        playSound('click');
    };

    socket.on('load_pending_tickets', (tickets) => {
        tickets.forEach(ticket => {
            const fakeEvent = {
                ...ticket,
                timestamp: ticket.timestamp || Date.now()
            };
            socket.emit('help_request_received', fakeEvent);
        });
    });
}