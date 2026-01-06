let notepadContent = '';

export function initNotepad(socket) {
    const area = document.querySelector('.notepad-area');
    
    if (area) {
        area.value = notepadContent;
        
        area.addEventListener('input', () => {
            notepadContent = area.value;
            
            if (socket && socket.connected) {
                socket.emit('save_note', { content: notepadContent });
            }
        });
    }
    
    if (socket) {
        socket.on('load_note', (data) => {
            if (data && data.content) {
                notepadContent = data.content;
                if (area) {
                    area.value = notepadContent;
                }
            }
        });
        
        socket.emit('request_note');
    }
}