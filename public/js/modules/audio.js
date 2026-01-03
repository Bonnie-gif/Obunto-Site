const SOUNDS = {
    boot: document.getElementById('sfx-boot'),
    click: document.getElementById('sfx-click'),
    green: document.getElementById('sfx-alarm-green'),
    blue: document.getElementById('sfx-alarm-blue'),
    red: document.getElementById('sfx-alarm-red'),
    gamma: document.getElementById('sfx-alarm-gamma'),
    epsilon: document.getElementById('sfx-alarm-epsilon'),
    on: document.getElementById('sfx-power-on'),
    off: document.getElementById('sfx-power-off'),
    msg: document.getElementById('sfx-msg'),
    denied: document.getElementById('sfx-denied'),
    sent: document.getElementById('sfx-sent'),
    sleep: document.getElementById('sfx-sleep'),
    uhoh: document.getElementById('sfx-uhoh')
};

export function playSound(name) {
    if (SOUNDS[name]) {
        try {
            SOUNDS[name].currentTime = 0;
            const playPromise = SOUNDS[name].play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // Silently ignore auto-play restrictions or missing files
                    // console.warn('Audio play failed:', error); 
                });
            }
        } catch (e) {
            // Ignore missing elements
        }
    }
}

export function initAudio() {
    document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => playSound('click'));
    });
}