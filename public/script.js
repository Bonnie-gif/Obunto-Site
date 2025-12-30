const socket = io();
const MOODS = ['annoyed', 'bug', 'dizzy', 'happy', 'hollow', 'normal', 'panic', 'sad', 'sleeping', 'Smug', 'stare', 'suspicious', 'werror'];
let currentMood = 'normal';

// Se admin panel existir (para ID 000)
function buildAdminPanel() {
    if (document.getElementById('admin-screen')) {
        const container = document.getElementById('mood-container');
        MOODS.forEach(mood => {
            const div = document.createElement('div');
            div.className = 'mood-icon';
            div.innerHTML = `<img src="/obunto/${mood}.png" alt="${mood}">`;
            div.onclick = () => {
                document.querySelectorAll('.mood-icon').forEach(el => el.classList.remove('active'));
                div.classList.add('active');
                currentMood = mood;
            };
            container.appendChild(div);
        });
    }
}

// Broadcast function (se button existir)
function sendBroadcast() {
    const msg = document.getElementById('adminMsg').value;
    if (!msg) return;

    socket.emit('mascot_broadcast', {
        message: msg,
        mood: currentMood
    });
}

// Receive
socket.on('display_mascot_message', (data) => {
    showObunto(data.message, data.mood);
});

// Call if needed
window.onload = () => {
    buildAdminPanel();
};