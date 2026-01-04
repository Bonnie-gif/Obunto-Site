// Módulo de Áudio Robusto
const SOUNDS = {};

// Lista completa dos seus IDs de áudio originais
const audioIds = [
    'sfx-boot', 
    'sfx-click', 
    'sfx-notify',
    'sfx-alarm-green', 
    'sfx-alarm-blue', 
    'sfx-alarm-red',
    'sfx-alarm-gamma', 
    'sfx-alarm-epsilon',
    'sfx-power-on', 
    'sfx-power-off',
    'sfx-msg', 
    'sfx-denied', 
    'sfx-sent', 
    'sfx-sleep', 
    'sfx-uhoh'
];

// Carrega os elementos de áudio se existirem no HTML
audioIds.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
        // Previne erros no console se o arquivo não carregar
        element.addEventListener('error', () => {
            console.warn(`Audio source failed for: ${id}`);
        });
        
        // Remove prefixos para facilitar o uso (ex: 'sfx-click' vira 'click')
        const shortName = id.replace('sfx-', '').replace('alarm-', '');
        SOUNDS[shortName] = element;
    }
});

// Função pública para tocar som
export function playSound(name) {
    if (SOUNDS[name]) {
        try {
            SOUNDS[name].currentTime = 0;
            const playPromise = SOUNDS[name].play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // Ignora erros de autoplay bloqueado pelo navegador
                    // console.log('Playback prevented');
                });
            }
        } catch (e) {
            console.error('Audio error:', e);
        }
    } else {
        // Som não encontrado (seguro, não quebra o app)
        // console.warn(`Sound '${name}' not found.`);
    }
}

export function initAudio() {
    // Adiciona som de clique a todos os botões automaticamente
    document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => playSound('click'));
    });
    console.log('Audio System Initialized');
}