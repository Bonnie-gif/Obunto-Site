export function initNotepad(socket) {
    const win = document.getElementById('notepad-window');
    const area = document.getElementById('notepad-area');
    const btnOpen = document.getElementById('btnOpenNotepad');
    const btnClose = document.getElementById('closeNotepad');
    
    // CORREÇÃO: Verifica se o botão existe antes de adicionar evento
    if (btnOpen) {
        btnOpen.onclick = () => {
            win.classList.remove('hidden');
            win.style.zIndex = 5000;
        };
    }
    
    if (btnClose) {
        btnClose.onclick = () => {
            win.classList.add('hidden');
        };
    }

    if (area) {
        let timeout;
        area.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                // Auto-save logic here if needed
            }, 1000);
        });
    }

    socket.on('load_notes', (notes) => {
        if (area) area.value = notes;
    });
}