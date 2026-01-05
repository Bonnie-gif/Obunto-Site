import { playSound } from './audio.js';

export async function handleLogin(socket) {
    const idInput = document.getElementById('inpId');
    const status = document.getElementById('loginStatus');
    const id = idInput.value.trim();

    if(!id) return;

    status.textContent = "AUTHENTICATING...";
    
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId: id })
        });
        const data = await res.json();

        if(data.success) {
            playSound('notify');
            status.textContent = "ACCESS GRANTED";
            
            // Atualiza Interface
            document.getElementById('sbUser').textContent = data.userData.username;
            document.getElementById('sbRank').textContent = data.userData.rank;
            
            // Se for Obunto, mostra janela dele
            if(data.userData.isObunto) {
                document.getElementById('obunto-window').classList.remove('hidden');
            }

            socket.emit('register_user', id);

            setTimeout(() => {
                document.getElementById('login-screen').classList.add('hidden');
                document.getElementById('desktop-screen').classList.remove('hidden');
            }, 1000);
        } else {
            playSound('denied');
            status.textContent = "ACCESS DENIED";
        }
    } catch(e) {
        status.textContent = "SERVER ERROR";
    }
}