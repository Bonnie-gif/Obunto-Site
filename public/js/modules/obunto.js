import { UI } from './ui.js';

let currentMood = 'normal';
const MOODS = ['annoyed', 'bug', 'dizzy', 'happy', 'hollow', 'normal', 'panic', 'sad', 'sleeping', 'Smug', 'stare', 'suspicious', 'werror'];
let bubbleTimeout;

export function initObunto(socket, userId) {
    socket.on('display_mascot_message', (data) => {
        speak(data.message, data.mood);
    });

    if (userId === "8989") {
        setupAdminPanel(socket);
    }
}

export function speak(text, mood) {
    UI.obunto.img.src = `/obunto/${mood}.png`;
    UI.obunto.text.textContent = text;
    UI.obunto.bubble.classList.remove('hidden');
    
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
        
        if (!msg) {
            alert("Message cannot be empty.");
            return;
        }

        socket.emit('mascot_broadcast', {
            message: msg,
            mood: currentMood,
            targetId: target 
        });

        UI.obunto.msg.value = '';
    };
}