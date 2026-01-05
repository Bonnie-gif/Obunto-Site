// Gerencia o mascote Obunto e seus sprites
export function initObunto(socket) {
    const avatar = document.getElementById('obunto-avatar');
    const bubble = document.getElementById('obunto-bubble');
    const btn = document.getElementById('btnObunto');

    if(btn) {
        btn.onclick = () => {
            const win = document.getElementById('obunto-window');
            win.classList.toggle('hidden');
        };
    }

    // Função para mudar sprite baseado no humor
    window.setObuntoMood = (mood) => {
        if(avatar) {
            // Caminho baseado na pasta 'assets/Sprites' da sua imagem
            avatar.src = `assets/Sprites/${mood}.png`;
        }
    };

    window.obuntoSay = (text, mood = 'normal') => {
        if(bubble) bubble.textContent = text;
        window.setObuntoMood(mood);
        const win = document.getElementById('obunto-window');
        if(win) win.classList.remove('hidden');
    };
}