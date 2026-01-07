import { playSound } from './audio.js';

let activeChats = new Map();

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
            spyLog.textContent += `[${time}] USER ${data.targetId} (${data.field}): ${data.value}\n`;
            spyLog.scrollTop = spyLog.scrollHeight;
        });
    }

    initTaskSystem(socket);
    initHelpQueue(socket);
    initAdminChat(socket);
}

function initTaskSystem(socket) {
    const taskSection = document.querySelector('.admin-section.task-system');
    if (!taskSection) {
        const adminPanel = document.querySelector('#admin-panel .win-body');
        if (adminPanel) {
            const newSection = document.createElement('div');
            newSection.className = 'admin-section task-system';
            newSection.innerHTML = `
                <div class="admin-label">TASK ASSIGNMENT SYSTEM</div>
                <div class="target-row">
                    <input type="text" id="taskTargetId" class="input-newton" placeholder="TARGET USER ID" style="width: 150px; margin: 0;">
                    <select id="taskDifficulty" class="input-newton" style="width: 120px; margin: 0;">
                        <option value="10">EASY (+10%)</option>
                        <option value="20">MEDIUM (+20%)</option>
                        <option value="35">HARD (+35%)</option>
                        <option value="50">EXTREME (+50%)</option>
                    </select>
                    <button id="btnAssignTask" class="btn-newton" style="flex: 1; margin: 0;">ASSIGN TASK</button>
                </div>
            `;
            adminPanel.appendChild(newSection);

            const btnAssignTask = document.getElementById('btnAssignTask');
            const taskTargetId = document.getElementById('taskTargetId');
            const taskDifficulty = document.getElementById('taskDifficulty');

            if (btnAssignTask) {
                btnAssignTask.onclick = () => {
                    const targetId = taskTargetId.value.trim();
                    const energyBoost = parseInt(taskDifficulty.value);

                    if (targetId) {
                        socket.emit('assign_task', {
                            targetId: targetId,
                            energyBoost: energyBoost,
                            type: taskDifficulty.options[taskDifficulty.selectedIndex].text.split(' ')[0]
                        });
                        taskTargetId.value = '';
                        playSound('sent');
                    } else {
                        playSound('denied');
                    }
                };
            }
        }
    }
}

function initAdminChat(socket) {
    socket.on('chat_receive', (data) => {
        if (data.sender === 'USER') {
            const fromId = data.fromId;
            
            if (!activeChats.has(fromId)) {
                createChatWindow(fromId, socket);
            }

            const chatWindow = activeChats.get(fromId);
            if (chatWindow && chatWindow.history) {
                addMessageToChat(chatWindow.history, data.message, 'user');
            }
            
            playSound('notify');
        }
    });
}

function createChatWindow(userId, socket) {
    const chatId = `admin-chat-${userId}`;
    let chatWin = document.getElementById(chatId);

    if (!chatWin) {
        const workspace = document.querySelector('.workspace');
        chatWin = document.createElement('div');
        chatWin.id = chatId;
        chatWin.className = 'window-newton';
        chatWin.style.cssText = `top: ${100 + activeChats.size * 30}px; left: ${400 + activeChats.size * 30}px; width: 500px; height: 450px;`;
        chatWin.innerHTML = `
            <div class="win-header">
                <span class="win-title">CHAT WITH USER ${userId}</span>
                <div class="win-controls">
                    <button class="win-btn" data-action="minimize">_</button>
                    <button class="win-btn close-btn">×</button>
                </div>
            </div>
            <div class="win-body" style="padding: 18px;">
                <div class="chat-history" style="flex: 1; overflow-y: auto; border: 4px solid var(--border-dark); padding: 14px; background: var(--paper); margin-bottom: 14px; box-shadow: inset 4px 4px 0 rgba(0, 0, 0, 0.35), inset -2px -2px 0 rgba(255, 255, 255, 0.6); min-height: 300px; max-height: 300px;"></div>
                <div style="display: flex; gap: 8px;">
                    <input type="text" class="chat-input input-newton" placeholder="MESSAGE USER ${userId}..." style="flex: 1; margin: 0;">
                    <button class="chat-send btn-newton" style="width: 80px; margin: 0;">SEND</button>
                </div>
            </div>
            <div class="resize-handle"></div>
        `;
        workspace.appendChild(chatWin);

        const closeBtn = chatWin.querySelector('.close-btn');
        const chatInput = chatWin.querySelector('.chat-input');
        const chatSend = chatWin.querySelector('.chat-send');
        const chatHistory = chatWin.querySelector('.chat-history');

        closeBtn.onclick = () => {
            chatWin.classList.add('hidden');
            activeChats.delete(userId);
        };

        const sendMessage = () => {
            const msg = chatInput.value.trim();
            if (msg) {
                socket.emit('chat_message', {
                    message: msg,
                    targetId: userId,
                    sender: 'ADMIN'
                });
                addMessageToChat(chatHistory, msg, 'admin');
                chatInput.value = '';
                playSound('sent');
            }
        };

        chatSend.onclick = sendMessage;
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        activeChats.set(userId, {
            window: chatWin,
            history: chatHistory,
            input: chatInput
        });

        chatWin.classList.remove('hidden');
        
        const header = chatWin.querySelector('.win-header');
        makeDraggable(chatWin, header);
    }

    chatWin.classList.remove('hidden');
}

function addMessageToChat(historyEl, message, type) {
    const msgEl = document.createElement('div');
    msgEl.className = `comm-msg ${type}`;
    
    const time = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    msgEl.innerHTML = `
        <div class="comm-meta">${type.toUpperCase()} [${time}]</div>
        <div class="comm-body">${escapeHtml(message)}</div>
    `;
    
    historyEl.appendChild(msgEl);
    historyEl.scrollTop = historyEl.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function makeDraggable(win, header) {
    header.onmousedown = (e) => {
        if(e.target.closest('button')) return;
        
        const rect = win.getBoundingClientRect();
        const shiftX = e.clientX - rect.left;
        const shiftY = e.clientY - rect.top;

        function moveAt(pageX, pageY) {
            const newLeft = Math.max(0, Math.min(pageX - shiftX, window.innerWidth - rect.width));
            const newTop = Math.max(0, Math.min(pageY - shiftY, window.innerHeight - 100));
            
            win.style.left = newLeft + 'px';
            win.style.top = newTop + 'px';
        }

        function onMouseMove(event) {
            moveAt(event.clientX, event.clientY);
        }

        document.addEventListener('mousemove', onMouseMove);

        function stopDrag() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', stopDrag);
        }

        document.addEventListener('mouseup', stopDrag);
    };
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
            <div class="ticket-message">${escapeHtml(ticket.message)}</div>
            <div class="ticket-actions">
                <button class="btn-newton" onclick="window.acceptTicket('${ticket.id}', '${ticket.userId}')">ACCEPT</button>
                <button class="btn-newton" onclick="window.rejectTicket('${ticket.id}')">REJECT</button>
                <button class="btn-newton" onclick="window.waitTicket('${ticket.id}')">WAITING</button>
            </div>
        `;
        queue.appendChild(el);
        playSound('notify');
    });

    window.acceptTicket = (id, userId) => {
        const el = document.getElementById(`ticket-${id}`);
        if(el) {
            socket.emit('update_ticket_status', { ticketId: id, status: 'accepted' });
            el.style.backgroundColor = '#90ee90';
            
            createChatWindow(userId, socket);
            
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