const SOUNDS = {};
const audioIds = [
    'sfx-boot', 'sfx-click', 'sfx-notify',
    'sfx-alarm-green', 'sfx-alarm-blue', 'sfx-alarm-red',
    'sfx-alarm-gamma', 'sfx-alarm-epsilon',
    'sfx-power-on', 'sfx-power-off',
    'sfx-msg', 'sfx-denied', 'sfx-sent', 'sfx-sleep', 'sfx-uhoh'
];

audioIds.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
        element.addEventListener('error', () => {});
        const shortName = id.replace('sfx-', '').replace('alarm-', '');
        SOUNDS[shortName] = element;
    }
});

export function playSound(name) {
    const path = `assets/audio/${name}.wav`;
    const audio = new Audio(path);
    audio.play().catch(() => {});
}

export function initAudio() {
    document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => playSound('click'));
    });
}