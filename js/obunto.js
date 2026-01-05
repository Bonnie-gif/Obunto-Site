export function initObunto(socket) {
    const win = document.getElementById('obunto-window');
    const avatar = document.getElementById('obunto-avatar');
    const bubble = document.getElementById('obunto-bubble');
    const btn = document.getElementById('btnObunto');

    if(btn) {
        btn.onclick = () => {
            win.classList.toggle('hidden');
        };
    }

    window.setObuntoMood = (mood) => {
        if(avatar) {
            avatar.src = `Sprites/${mood}.png`;
        }
    };

    window.obuntoSay = (text, mood = 'normal') => {
        if(bubble) bubble.textContent = text;
        window.setObuntoMood(mood);
        if(win) win.classList.remove('hidden');
    };
    
    socket.on('receive_broadcast_message', (data) => {
        window.obuntoSay(data.message, data.mood);
    });
}