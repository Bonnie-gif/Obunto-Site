export function initNotepad(socket) {
    const area = document.querySelector('.notepad-area');
    let timeout;

    if (area) {
        area.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                // Simulação de salvamento local ou envio para servidor se houver endpoint
                localStorage.setItem('tsc_user_notes', area.value);
            }, 1000);
        });
    }

    socket.on('load_notes', (notes) => {
        if (area) area.value = notes || localStorage.getItem('tsc_user_notes') || "";
    });
}