export function initNotepad(socket) {
    const area = document.querySelector('.notepad-area');
    let timeout;

    if (area) {
        const saved = localStorage.getItem('tsc_user_notes');
        if (saved) area.value = saved;

        area.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                localStorage.setItem('tsc_user_notes', area.value);
            }, 1000);
        });
    }
}