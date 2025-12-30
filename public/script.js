const socket = io();
const MOODS = ['annoyed', 'bug', 'dizzy', 'happy', 'hollow', 'normal', 'panic', 'sad', 'sleeping', 'Smug', 'stare', 'suspicious', 'werror'];
let currentMood = 'normal';

// Admin panel (if ID 000, add to desktop if needed)
function buildAdminPanel() {
    // Assume admin-screen exists for ID 000 - add logic in renderer.js if needed
    const container = document.getElementById('mood-container');
    if (container) {
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

// Broadcast
function sendBroadcast() {
    const msg = document.getElementById('adminMsg').value;
    if (!msg) return;

    socket.emit('mascot_broadcast', {
        message: msg,
        mood: currentMood
    });
}

// Receive broadcast
socket.on('display_mascot_message', (data) => {
    showObunto(data.message, data.mood);
});