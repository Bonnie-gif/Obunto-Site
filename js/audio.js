const SOUNDS = {
    boot: document.getElementById('sfx-boot'),
    click: document.getElementById('sfx-click'),
    notify: document.getElementById('sfx-notify'),
    denied: document.getElementById('sfx-denied'),
    sent: document.getElementById('sfx-sent')
};

export function playSound(name) {
    const audio = SOUNDS[name];
    if (audio) {
        try {
            audio.currentTime = 0;
            audio.play().catch(() => {});
        } catch (e) {}
    }
}

export function initAudio() {
    document.addEventListener('click', (e) => {
        if (e.target.closest('button:not(.win-btn)') || e.target.closest('.dock-btn')) {
            playSound('click');
        }
    });
}