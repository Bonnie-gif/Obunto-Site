import { playSound } from './audio.js';

export function initUI() {
    document.querySelectorAll('.window-newton').forEach(win => {
        const header = win.querySelector('.win-header');
        if(!header) return;

        header.onmousedown = (e) => {
            if(e.target.closest('button')) return;

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
        
        win.onmousedown = () => {
            document.querySelectorAll('.window-newton').forEach(w => w.style.zIndex = 1000);
            win.style.zIndex = 1001;
        };
    });

    const btnNotepad = document.getElementById('btnNotepad');
    const winNotepad = document.getElementById('notepad-window');
    const closeNotepad = document.getElementById('closeNote');

    if (btnNotepad && winNotepad) {
        btnNotepad.onclick = () => {
            const isHidden = winNotepad.classList.contains('hidden');
            document.querySelectorAll('.window-newton').forEach(w => w.style.zIndex = 1000);
            
            if (isHidden) {
                winNotepad.classList.remove('hidden');
                winNotepad.style.zIndex = 1001;
                playSound('click');
            } else {
                winNotepad.classList.add('hidden');
            }
        };
    }

    if (closeNotepad && winNotepad) {
        closeNotepad.onclick = () => {
            winNotepad.classList.add('hidden');
            playSound('click');
        };
    }
}