// Módulo de Áudio Robusto
const SOUNDS = {
    boot: document.getElementById('sfx-boot'),
    click: document.getElementById('sfx-click'),
    notify: document.getElementById('sfx-notify'),
    denied: document.getElementById('sfx-denied'),
    sent: document.getElementById('sfx-sent'),
    error: document.getElementById('sfx-error')
    // Adicione outros conforme necessário
};

export function playSound(name) {
    const sound = SOUNDS[name];
    if (sound) {
        // Tenta resetar o tempo para tocar do início
        sound.currentTime = 0;
        // Toca e ignora erros se o arquivo não existir
        sound.play().catch(e => {
            // console.warn(`Áudio '${name}' falhou ou não existe.`);
        });
    }
}

export function initAudio() {
    document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => playSound('click'));
    });
}