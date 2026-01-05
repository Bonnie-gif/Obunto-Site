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
            playSound('notify');
            
            setTimeout(() => {
                overlay.classList.add('hidden');
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
            const current = statusEl.textContent;
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
            spyLog.textContent += `[${time}] ${data.value}`;
            spyLog.scrollTop = spyLog.scrollHeight;
        });
    }

    initHelpQueue(socket);
}

function initHelpQueue(socket) {
    const queue = document.getElementById('help-queue');
    if(!queue) return;
    
    socket.on('help_request_received', (ticket) => {
        const el = document.createElement('div');
        el.className = 'help-ticket';
        el.id = `ticket-${ticket.id}`;
        el.innerHTML = `
            <div class="ticket-header">
                <span>USER: ${ticket.userId}</span>
                <span>TIME: ${new Date(ticket.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="ticket-message">${ticket.message}</div>
            <div class="ticket-actions">
                <button class="btn-newton" onclick="window.acceptTicket('${ticket.id}')">ACCEPT</button>
                <button class="btn-newton" onclick="window.rejectTicket('${ticket.id}')">REJECT</button>
            </div>
        `;
        queue.appendChild(el);
        playSound('notify');
    });

    window.acceptTicket = (id) => {
        socket.emit('update_ticket_status', { ticketId: id, status: 'accepted' });
        document.getElementById(`ticket-${id}`)?.remove();
        playSound('click');
    };

    window.rejectTicket = (id) => {
        socket.emit('update_ticket_status', { ticketId: id, status: 'rejected' });
        document.getElementById(`ticket-${id}`)?.remove();
        playSound('click');
    };
}