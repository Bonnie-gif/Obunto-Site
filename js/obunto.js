import { playSound } from './audio.js';

export function initObunto(socket) {
    const avatar = document.getElementById('obunto-avatar');
    const bubble = document.getElementById('obunto-bubble');
    
    window.setObuntoMood = (mood) => {
        if(avatar) avatar.src = `Sprites/${mood}.png`;
    };

    window.obuntoSay = (text, mood = 'normal') => {
        if(bubble) bubble.textContent = text;
        window.setObuntoMood(mood);
        document.getElementById('obunto-window').classList.remove('hidden');
        playSound('notify');
    };
    
    socket.on('receive_broadcast_message', (data) => {
        window.obuntoSay(data.message, data.mood);
    });

    const btnToggleStatus = document.getElementById('btnToggleStatus');
    if(btnToggleStatus) {
        btnToggleStatus.onclick = () => {
            const newStatus = confirm("SWITCH SYSTEM STATUS?") ? 'OFFLINE' : 'ONLINE';
            socket.emit('toggle_system_status', newStatus);
        };
    }

    const btnBroadcast = document.getElementById('btnBroadcast');
    const adminMsg = document.getElementById('adminMsg');
    if(btnBroadcast && adminMsg) {
        btnBroadcast.onclick = () => {
            if(adminMsg.value.trim()) {
                socket.emit('admin_broadcast_message', { message: adminMsg.value, mood: 'normal' });
                adminMsg.value = '';
            }
        };
    }

    document.querySelectorAll('.btn-alarm').forEach(btn => {
        btn.onclick = () => {
            const type = btn.dataset.alarm;
            socket.emit('admin_trigger_alarm', type);
        };
    });

    const spyLog = document.getElementById('spy-input-data');
    if(spyLog) {
        socket.on('spy_input_update', (data) => {
            spyLog.textContent += data.value;
            spyLog.scrollTop = spyLog.scrollHeight;
        });
    }
}