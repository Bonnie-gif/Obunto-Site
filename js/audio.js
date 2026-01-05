const SOUNDS = {
    boot: document.getElementById('sfx-boot'),
    click: document.getElementById('sfx-click'),
    notify: document.getElementById('sfx-notify'),
    denied: document.getElementById('sfx-denied'),
    sent: document.getElementById('sfx-sent'),
    error: document.getElementById('sfx-error'),
    powerOn: document.getElementById('sfx-power-on'),
    powerOff: document.getElementById('sfx-power-off')
};

export function playSound(name) {
    const sound = SOUNDS[name];
    if (sound) {
        try {
            sound.currentTime = 0;
            sound.play().catch(() => {});
        } catch (e) {}
    }
}

export function initAudio() {
    document.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('.dock-btn') || e.target.closest('.nav-item')) {
            playSound('click');
        }
    });
}