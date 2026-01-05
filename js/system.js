export function initSystem(socket) {
    socket.on('alarm_update', (type) => {
        document.body.className = `alarm-${type}`;
    });
    
    // Konami Code
    const code = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','b','a'];
    let idx = 0;
    document.addEventListener('keydown', (e) => {
        if(e.key === code[idx]) idx++;
        else idx = 0;
        if(idx === code.length) {
            alert("CHEAT MODE ENABLED");
            idx = 0;
        }
    });
}