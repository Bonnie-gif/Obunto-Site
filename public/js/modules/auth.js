export async function handleLogin(socket) {
    const input = document.getElementById('inpId');
    const status = document.getElementById('loginStatus');
    const userId = input.value.trim();

    if (!userId) {
        status.textContent = 'ID REQUIRED';
        return null;
    }

    status.textContent = 'AUTHENTICATING...';

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId })
        });
        
        const data = await response.json();

        if (data.success) {
            status.textContent = 'ACCESS GRANTED';
            
            socket.emit('register_user', userId);
            
            const userData = data.userData;
            document.getElementById('sbUser').textContent = userData.username.toUpperCase();
            document.getElementById('sbRank').textContent = userData.rank;
            
            const dashName = document.getElementById('dashName');
            if (dashName) dashName.textContent = userData.displayName.toUpperCase();
            const dashId = document.getElementById('dashId');
            if (dashId) dashId.textContent = userData.id;
            const dashRank = document.getElementById('dashRank');
            if (dashRank) dashRank.textContent = userData.rank;
            const dashAvatar = document.getElementById('dashAvatar');
            if (dashAvatar && userData.avatar) dashAvatar.src = userData.avatar;

            const dashDepts = document.getElementById('dashDepts');
            if (dashDepts && userData.affiliations) {
                dashDepts.innerHTML = '';
                userData.affiliations.forEach(aff => {
                    const row = document.createElement('div');
                    row.className = 'dept-row';
                    row.innerHTML = `<div class="dept-name">${aff.groupName}</div><div class="dept-role">${aff.role} (Rank ${aff.rank})</div>`;
                    dashDepts.appendChild(row);
                });
            }

            if (userData.isObunto || userData.isHoltz) {
                const adminPanel = document.getElementById('admin-panel');
                if (adminPanel) adminPanel.classList.remove('hidden');
                
                const dockAdmin = document.getElementById('btnObuntoControl');
                if (dockAdmin) dockAdmin.classList.remove('hidden');
            }

            setTimeout(() => {
                document.getElementById('login-screen').classList.add('hidden');
                document.getElementById('desktop-screen').classList.remove('hidden');
                document.getElementById('desktop-screen').classList.add('active');
            }, 1000);

            return userData;
        } else {
            status.textContent = data.message || 'ACCESS DENIED';
            return null;
        }

    } catch (error) {
        console.error(error);
        status.textContent = 'CONNECTION ERROR';
        return null;
    }
}