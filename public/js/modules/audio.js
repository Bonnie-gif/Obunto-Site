const SOUNDS = {
    startup: document.getElementById('sfx-startup'),
    click: document.getElementById('sfx-click'),
    notify: document.getElementById('sfx-notify'),
    error: document.getElementById('sfx-error'),
    speak: document.getElementById('sfx-speak')
};

export function playSound(name) {
    if (SOUNDS[name]) {
        SOUNDS[name].currentTime = 0;
        SOUNDS[name].play().catch(e => {});
    }
}

export function initAudio() {
    document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => playSound('click'));
    });
}