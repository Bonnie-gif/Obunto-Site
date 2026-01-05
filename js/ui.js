export function initUI() {
    // Lógica básica de arrastar janelas
    document.querySelectorAll('.window-newton').forEach(win => {
        const header = win.querySelector('.win-header');
        if(!header) return;

        header.onmousedown = (e) => {
            let shiftX = e.clientX - win.getBoundingClientRect().left;
            let shiftY = e.clientY - win.getBoundingClientRect().top;

            function moveAt(pageX, pageY) {
                win.style.left = pageX - shiftX + 'px';
                win.style.top = pageY - shiftY + 'px';
            }

            function onMouseMove(event) {
                moveAt(event.pageX, event.pageY);
            }

            document.addEventListener('mousemove', onMouseMove);

            header.onmouseup = () => {
                document.removeEventListener('mousemove', onMouseMove);
                header.onmouseup = null;
            };
        };
    });

    // Botão Notepad
    const btnNote = document.getElementById('btnNotepad');
    if(btnNote) {
        btnNote.onclick = () => alert("Notepad module logic here");
    }
}