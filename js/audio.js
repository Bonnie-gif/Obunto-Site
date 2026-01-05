const SOUNDS = {
    boot: document.getElementById('sfx-boot'),
    click: document.getElementById('sfx-click'),
    notify: document.getElementById('sfx-notify'),
    denied: document.getElementById('sfx-denied')
};

export function playSound(name) {
    const audio = SOUNDS[name];
    if (audio) {
        try {
            audio.currentTime = 0;
            audio.play().catch(e => {});
        } catch(e) {}
    }
}

export function initAudio() {
    document.addEventListener('click', (e) => {
        if(e.target.closest('button')) playSound('click');
    });
}