// Módulo de Autenticação com Proxy para evitar CORS

export async function handleLogin(socket) {
    const input = document.getElementById('inpId');
    const status = document.getElementById('loginStatus');
    const userId = input.value.trim();

    if (!userId) {
        status.textContent = 'ID REQUIRED';
        return null;
    }

    status.textContent = 'AUTHENTICATING...';

    // Rota direta para Admins (Bypass)
    if (userId === "8989" || userId === "36679824") {
        return performServerLogin(socket, userId);
    }

    try {
        // CORREÇÃO: Usa a rota proxy do seu próprio servidor em vez de chamar o Roblox direto
        const response = await fetch(`/api/roblox/${userId}`);
        
        if (!response.ok) throw new Error('User not found');
        const data = await response.json();

        // Se encontrou o usuário, prossegue para o login no sistema
        return performServerLogin(socket, data.id.toString());

    } catch (error) {
        console.error(error);
        status.textContent = 'ACCESS DENIED';
        // Toca som de erro se disponível no módulo de áudio
        const audio = document.getElementById('sfx-denied');
        if (audio) audio.play().catch(e => {});
        return null;
    }
}

async function performServerLogin(socket, userId) {
    const status = document.getElementById('loginStatus');
    
    return new Promise((resolve) => {
        // Faz a requisição de login para o backend do Newton OS
        fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                status.textContent = 'ACCESS GRANTED';
                
                // Toca som de sucesso
                const audio = document.getElementById('sfx-notify');
                if (audio) audio.play().catch(e => {});

                // Registra no Socket
                socket.emit('register_user', userId);
                
                // Atualiza UI da Sidebar
                document.getElementById('sbUser').textContent = data.userData.username.toUpperCase();
                document.getElementById('sbRank').textContent = data.userData.rank;
                
                // Atualiza Dashboard (se existir)
                const dashName = document.getElementById('dashName');
                if (dashName) dashName.textContent = data.userData.displayName.toUpperCase();
                const dashId = document.getElementById('dashId');
                if (dashId) dashId.textContent = data.userData.id;
                const dashRank = document.getElementById('dashRank');
                if (dashRank) dashRank.textContent = data.userData.rank;
                const dashAvatar = document.getElementById('dashAvatar');
                if (dashAvatar && data.userData.avatar) dashAvatar.src = data.userData.avatar;
                
                // Renderiza afiliações
                const dashDepts = document.getElementById('dashDepts');
                if (dashDepts && data.userData.affiliations) {
                    dashDepts.innerHTML = '';
                    data.userData.affiliations.forEach(aff => {
                        const row = document.createElement('div');
                        row.className = 'dept-row';
                        row.innerHTML = `
                            <div class="dept-name">${aff.groupName}</div>
                            <div class="dept-role">${aff.role} (Rank ${aff.rank})</div>
                        `;
                        dashDepts.appendChild(row);
                    });
                }

                // Troca a tela
                setTimeout(() => {
                    document.getElementById('login-screen').classList.add('hidden');
                    document.getElementById('desktop-screen').classList.remove('hidden');
                    document.getElementById('desktop-screen').classList.add('active');
                }, 1000);

                resolve(data.userData);
            } else {
                status.textContent = data.message || 'LOGIN FAILED';
                resolve(null);
            }
        })
        .catch(err => {
            console.error(err);
            status.textContent = 'SERVER ERROR';
            resolve(null);
        });
    });
}