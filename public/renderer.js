const socket = io();

document.getElementById('btnLogin').onclick = async () => {
    const userId = document.getElementById('inpId').value.trim();
    const usernameInput = document.getElementById('inpUser').value.trim();
    const status = document.getElementById('loginStatus');

    if (!userId || !usernameInput) return;

    status.innerText = "VERIFYING IDENTITY...";
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId, usernameInput })
        });
        const data = await res.json();

        if (data.success) {
            document.getElementById('login-screen').classList.remove('active');
            document.getElementById('desktop-screen').classList.add('active');
            renderProfile(data.userData);
        } else {
            status.innerText = "ACCESS DENIED: " + data.message;
        }
    } catch (e) {
        status.innerText = "MAINFRAME OFFLINE";
    }
};

function renderProfile(u) {
    document.getElementById('profileData').innerHTML = `
        <div style="display:flex; gap:15px;">
            <img src="${u.avatar}" style="width:80px; height:80px; border:2px solid #2b3323;">
            <div style="font-size:13px;">
                <p><b>USER:</b> ${u.username}</p>
                <p><b>DEPT:</b> ${u.department}</p>
                <p><b>RANK:</b> ${u.rank}</p>
                <p><b>CLR:</b> L-${u.clearance}</p>
            </div>
        </div>
    `;
}

socket.on('receive_mascot_msg', (data) => {
    const box = document.getElementById('obunto-popup');
    document.getElementById('obunto-face').src = `obunto/${data.mood}.png`;
    document.getElementById('obunto-text').innerText = data.text;
    box.classList.remove('hidden');
    setTimeout(() => box.classList.add('hidden'), 7000);
});

function toggleWin(id) {
    document.getElementById(`${id}-window`).classList.toggle('hidden');
}

function updateClock() {
    document.getElementById('clock').innerText = new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
}
setInterval(updateClock, 1000);