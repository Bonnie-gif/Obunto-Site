const socket = io();
const moods = ["annoyed", "bug", "dizzy", "happy", "hollow", "normal", "panic", "sad", "sleeping", "Smug", "stare", "suspicious", "werror"];
let selectedMood = "normal";

window.onload = () => {
    updateClock();
    setInterval(updateClock, 1000);
    const grid = document.getElementById('moodGrid');
    if (grid) {
        moods.forEach(m => {
            const div = document.createElement('div');
            div.className = 'mood-item';
            div.innerHTML = `<img src="obunto/${m}.png" width="40">`;
            div.onclick = () => {
                selectedMood = m;
                document.querySelectorAll('.mood-item').forEach(i => i.classList.remove('selected'));
                div.classList.add('selected');
            };
            grid.appendChild(div);
        });
    }
};

document.getElementById('btnLogin').onclick = async () => {
    const userId = document.getElementById('inpId').value.trim();
    const username = document.getElementById('inpUser').value.trim();
    const status = document.getElementById('loginStatus');

    if (userId === "000" && username.toUpperCase() === "OBUNTO") {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('admin-screen').classList.add('active');
        return;
    }

    status.innerText = "AUTHENTICATING...";
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId, usernameInput: username })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('login-screen').classList.remove('active');
            document.getElementById('desktop-screen').classList.add('active');
            renderProfile(data.userData);
        } else {
            status.innerText = "ERR: " + data.message;
        }
    } catch (e) {
        status.innerText = "CONNECTION FAILED";
    }
};

function renderProfile(u) {
    document.getElementById('profileData').innerHTML = `
        <div style="display:flex; gap:20px; align-items:center;">
            <img src="${u.avatar}" style="width:100px; border:2px solid #2b3323;">
            <div style="font-size:14px;">
                <p><b>IDENTITY:</b> ${u.username}</p>
                <p><b>DEPT:</b> ${u.department}</p>
                <p><b>RANK:</b> ${u.rank}</p>
                <p><b>CLEARANCE:</b> LEVEL ${u.clearance}</p>
            </div>
        </div>
    `;
}

document.getElementById('btnSend')?.addEventListener('click', () => {
    const msg = document.getElementById('adminMsg').value;
    if (msg) {
        socket.emit('mascot_broadcast', { mood: selectedMood, text: msg });
        document.getElementById('adminMsg').value = "";
    }
});

socket.on('receive_mascot_msg', (data) => {
    const box = document.getElementById('obunto-popup');
    document.getElementById('obunto-face').src = `obunto/${data.mood}.png`;
    document.getElementById('obunto-text').innerText = data.text;
    box.classList.remove('hidden');
    setTimeout(() => box.classList.add('hidden'), 8000);
});

function toggleWin(id) {
    document.getElementById(`${id}-window`).classList.toggle('hidden');
}

function updateClock() {
    const el = document.getElementById('clock');
    if (el) el.innerText = new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
}