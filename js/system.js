export function initSystem(socket) {
    const konami = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let kIdx = 0;

    document.addEventListener('keydown', (e) => {
        if (e.key === konami[kIdx]) {
            kIdx++;
            if (kIdx === konami.length) {
                alert("SYSTEM OVERRIDE: GOD MODE ENABLED");
                kIdx = 0;
            }
        } else {
            kIdx = 0;
        }
    });

    const btnReboot = document.getElementById('btnSystemReboot');
    if(btnReboot) {
        btnReboot.onclick = () => {
            socket.emit('toggle_system_status', 'REBOOTING');
            location.reload();
        };
    }
}