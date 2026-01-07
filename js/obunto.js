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
            } else {
                playSound('denied');
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

    // Spy input tracking - apenas frases completas
    let inputBuffer = '';
    const spyLog = document.getElementById('spy-input-data');
    if(spyLog) {
        socket.on('spy_input_update', (data) => {
            if (data.value === '\n' || data.value === 'Enter') {
                if (inputBuffer.trim()) {
                    const time = new Date().toLocaleTimeString();
                    spyLog.textContent += `[${time}] USER ${data.targetId}: ${inputBuffer}\n`;
                    spyLog.scrollTop = spyLog.scrollHeight;
                    inputBuffer = '';
                }
            } else if (data.value && data.value.length === 1) {
                inputBuffer += data.value;
            }
        });
    }

    // Sistema de tarefas para IDs específicos
    const btnSendTask = document.getElementById('btnSendTask');
    const taskTargetId = document.getElementById('taskTargetId');
    const taskDescription = document.getElementById('taskDescription');
    const taskEnergyReward = document.getElementById('taskEnergyReward');

    if (btnSendTask && taskTargetId && taskDescription && taskEnergyReward) {
        btnSendTask.onclick = () => {
            const target = taskTargetId.value.trim();
            const desc = taskDescription.value.trim();
            const reward = parseFloat(taskEnergyReward.value) || 5;

            if (target && desc) {
                socket.emit('assign_task', {
                    targetId: target,
                    description: desc,
                    energyReward: reward
                });
                taskTargetId.value = '';
                taskDescription.value = '';
                taskEnergyReward.value = '5';
                playSound('sent');
            } else {
                playSound('denied');
            }
        };
    }

    const btnAdminChatSend = document.getElementById('btnAdminChatSend');
    const adminChatTarget = document.getElementById('adminChatTarget');
    const adminChatMsg = document.getElementById('adminChatMsg');

    if (btnAdminChatSend) {
        btnAdminChatSend.onclick = () => {
            const target = adminChatTarget.value.trim();
            const msg = adminChatMsg.value.trim();
            if (target && msg) {
                socket.emit('chat_message', { message: msg, targetId: target, sender: 'ADMIN' });
                adminChatMsg.value = '';
                playSound('sent');
            }
        };
    }

    initHelpQueue(socket);
    initEnergySystem(socket);
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
            
            // Abrir janela de help automaticamente
            const helpWindow = document.getElementById('help-window');
            if (helpWindow) {
                helpWindow.classList.remove('hidden');
                helpWindow.style.zIndex = 9000;
            }
            
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
}

function initEnergySystem(socket) {
    // Sistema de energia que desce 50% a cada 24 horas (100% em 2 dias)
    const energyEl = document.getElementById('sbEnergy');
    const energyFill = document.getElementById('energyFill');
    const adminEnergy = document.getElementById('adminEnergy');
    const adminEnergyBar = document.getElementById('adminEnergyBar');
    
    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000; // 2 dias em milissegundos
    const START_ENERGY = 100;
    
    let startTime = localStorage.getItem('energy_start_time');
    if (!startTime) {
        startTime = Date.now();
        localStorage.setItem('energy_start_time', startTime);
    } else {
        startTime = parseInt(startTime);
    }
    
    function updateEnergy() {
        const elapsed = Date.now() - startTime;
        const energyPercent = Math.max(0, START_ENERGY - (elapsed / TWO_DAYS_MS) * 100);
        
        if (energyEl) energyEl.textContent = `${energyPercent.toFixed(1)}%`;
        if (energyFill) energyFill.style.width = `${energyPercent}%`;
        if (adminEnergy) adminEnergy.textContent = `${energyPercent.toFixed(1)}%`;
        if (adminEnergyBar) adminEnergyBar.style.width = `${energyPercent}%`;
        
        socket.emit('energy_update', energyPercent);
    }
    
    // Atualizar energia a cada segundo
    setInterval(updateEnergy, 1000);
    updateEnergy();
    
    // Receber recompensas de energia
    socket.on('energy_reward', (data) => {
        const currentEnergy = parseFloat(energyEl.textContent);
        const newEnergy = Math.min(100, currentEnergy + data.amount);
        
        // Ajustar o tempo de início para refletir a nova energia
        const energyGained = newEnergy - currentEnergy;
        const timeGained = (energyGained / 100) * TWO_DAYS_MS;
        startTime = startTime + timeGained;
        localStorage.setItem('energy_start_time', startTime);
        
        updateEnergy();
        playSound('notify');
        window.obuntoSay(`ENERGY RESTORED: +${data.amount.toFixed(1)}%`, 'happy');
    });
}