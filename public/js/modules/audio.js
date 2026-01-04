const SOUNDS = {
    boot: document.getElementById('sfx-boot'),
    click: document.getElementById('sfx-click'),
    notify: document.getElementById('sfx-notify'),
    denied: document.getElementById('sfx-denied'),
    sent: document.getElementById('sfx-sent'),
    error: document.getElementById('sfx-error')
};

export function playSound(name) {
    const sound = SOUNDS[name];
    if (sound) {
        try {
            sound.currentTime = 0;
            sound.play().catch(e => {
                // Ignora erro se o usuário não interagiu com a página ainda
                console.warn('Audio play prevented:', e.message);
            });
        } catch (e) {
            console.warn('Audio element error');
        }
    }
}

export function initAudio() {
    document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => playSound('click'));
    });
}