export function initObunto(socket) {
    const avatar = document.getElementById('obunto-avatar');
    const btn = document.getElementById('btnObunto');
    const win = document.getElementById('obunto-window');

    if(btn && win) {
        btn.onclick = () => {
            win.classList.toggle('hidden');
        };
    }

    window.setObuntoMood = (mood) => {
        if(avatar) {
            avatar.src = `/Sprites/${mood}.png`;
        }
    };
}