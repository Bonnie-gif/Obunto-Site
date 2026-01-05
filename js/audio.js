const SOUNDS = {
    boot: document.getElementById('sfx-boot'),
    click: document.getElementById('sfx-click'),
    notify: document.getElementById('sfx-notify'),
    denied: document.getElementById('sfx-denied')
};

export function playSound(name) {
    const audio = SOUNDS[name];
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log("Audio error:", e));
    }
}

export function initAudio() {
    document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => playSound('click'));
    });
}