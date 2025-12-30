import { UI } from './ui.js';
import { playSound } from './audio.js';

let currentMood = 'normal';
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
            speak(`New Help Request from ID ${ticket.userId}`, "happy");
        });
    }
}

export function speak(text, mood) {
    UI.obunto.img.src = `/obunto/${mood}.png`;
    UI.obunto.text.textContent = text;
    UI.obunto.bubble.classList.remove('hidden');
    playSound('speak');
    
    if (bubbleTimeout) clearTimeout(bubbleTimeout);
    bubbleTimeout = setTimeout(() => {
        UI.obunto.bubble.classList.add('hidden');
    }, 8000);
}

function setupAdminPanel(socket) {
    UI.obunto.btnOpen.classList.remove('hidden');
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
    
    UI.obunto.btnSend.onclick = () => {
        const msg = UI.obunto.msg.value.trim();
        const target = UI.obunto.target.value.trim();
        if (!msg) return;
        
        if (target) {
            socket.emit('admin_chat_reply', { targetId: target, message: msg });
        } else {
            socket.emit('mascot_broadcast', { message: msg, mood: currentMood, targetId: null });
        }
        UI.obunto.msg.value = '';
    };

    UI.obunto.btnToggle.onclick = () => {
        const current = document.getElementById('statusText').textContent;
        const newStatus = current === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
        socket.emit('toggle_system_status', newStatus);
    };
}