import { playSound } from './audio.js';

export function initObunto(socket) {
    const avatar = document.getElementById('obunto-avatar');
    const bubble = document.getElementById('obunto-bubble');
    let currentMood = 'normal';
    
    window.setObuntoMood = (mood) => {
        currentMood = mood;
        if(avatar) avatar.src = `/Sprites/${mood}.png`;
    };

    window.obuntoSay = (text, mood = 'normal') => {
        if(bubble) bubble.textContent = text;
        window.setObuntoMood(mood);
        const obuntoWindow = document.getElementById('obunto-window');
        if(obuntoWindow) {
            obuntoWindow.classList.remove('hidden');
            obuntoWindow.style.zIndex = 2000;
        }
        playSound('notify');
    };
    
    socket.on('receive_broadcast_message', (data) => {
        window.obuntoSay(data.message, data.mood || 'normal');
    });

    const btnToggleStatus = document.getElementById('btnToggleStatus');
    if(btnToggleStatus) {
        btnToggleStatus.onclick = () => {
            const sbStatus = document.getElementById('adminStatus');
            const currentStatus = sbStatus ? sbStatus.textContent : 'ONLINE';
            const newStatus = currentStatus === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
            socket.emit('toggle_system_status', newStatus);
            playSound('click');
        };
    }

    const btnBroadcast = document.getElementById('btnBroadcast');
    const adminMsg = document.getElementById('adminMsg');
    if(btnBroadcast && adminMsg) {
        btnBroadcast.onclick = () => {
            const msg = adminMsg.value.trim();
            if(msg) {
                socket.emit('admin_broadcast_message', { 
                    message: msg, 
                    mood: currentMood 
                });
                adminMsg.value = '';
                playSound('click');
            } else {
                playSound('denied');
            }
        };
    }

    document.querySelectorAll('.mood-icon').forEach(icon => {
        icon.onclick = () => {
            document.querySelectorAll('.mood-icon').forEach(i => i.classList.remove('active'));
            icon.classList.add('active');
            const mood = icon.dataset.mood;
            currentMood = mood;
            window.setObuntoMood(mood);
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
            const timestamp = new Date().toLocaleTimeString();
            spyLog.textContent += `[${timestamp}] [USER ${data.targetId}]: ${data.value}\n`;
            spyLog.scrollTop = spyLog.scrollHeight;
        });
    }

    const adminCommList = document.getElementById('admin-comm-list');
    const adminCommTarget = document.getElementById('adminCommTarget');
    const adminCommMsg = document.getElementById('adminCommMsg');
    const btnAdminCommSend = document.getElementById('btnAdminCommSend');

    function addAdminMessage(msg, type) {
        if(!adminCommList) return;
        const el = document.createElement('div');
        el.className = `comm-msg ${type}`;
        el.innerHTML = `
            <div class="comm-meta">${msg.sender || 'UNKNOWN'} → ${msg.target || 'ALL'}</div>
            <div class="comm-body">${msg.message}</div>
        `;
        adminCommList.appendChild(el);
        adminCommList.scrollTop = adminCommList.scrollHeight;
        if(type === 'other') playSound('notify');
    }

    function sendAdminComm() {
        const target = adminCommTarget ? adminCommTarget.value.trim() : '';
        const msg = adminCommMsg ? adminCommMsg.value.trim() : '';
        
        if(!msg) {
            playSound('denied');
            return;
        }
        
        socket.emit('chat_message', { 
            message: msg, 
            targetId: target || 'ALL', 
            sender: 'ADMIN' 
        });
        
        addAdminMessage({ 
            sender: 'ADMIN', 
            target: target || 'ALL', 
            message: msg 
        }, 'self');
        
        if(adminCommMsg) adminCommMsg.value = '';
        playSound('click');
    }

    if(btnAdminCommSend) {
        btnAdminCommSend.onclick = sendAdminComm;
    }
    
    if(adminCommMsg) {
        adminCommMsg.addEventListener('keydown', (e) => {
            if(e.key === 'Enter') sendAdminComm();
        });
    }

    socket.on('chat_receive', (data) => {
        if(adminCommList && data.fromId) {
            addAdminMessage({
                sender: data.fromId,
                target: 'ADMIN',
                message: data.message
            }, 'other');
        }
    });
}