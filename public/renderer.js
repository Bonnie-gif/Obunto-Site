let currentUser = null;
const socket = io();

async function login() {
    const id = document.getElementById('inpId').value.trim();
    if (!id) return;
    document.getElementById('loginStatus').innerText = "AUTHENTICATING...";

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: id })
        });
        const data = await res.json();

        if (data.success) {
            currentUser = data.userData;

            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('desktop-screen').style.display = 'flex';

            document.getElementById('userAvatar').src = currentUser.avatar;
            document.getElementById('userName').innerText = currentUser.username.toUpperCase();
            document.getElementById('userId').innerText = currentUser.id;
            document.getElementById('userDept').innerText = currentUser.dept;
            document.getElementById('userRank').innerText = currentUser.rank;
            document.getElementById('userClearance').innerText = currentUser.clearance || "LEVEL 0";

            updateClock();
            setInterval(updateClock, 1000);

            // Obunto especial para ID 1947
            if (currentUser.isObunto || id === "1947") {
                setTimeout(() => {
                    document.getElementById('obunto-img').src = "obunto/smug.png";
                    document.getElementById('obunto-text').innerText = "Welcome back, master. Systems nominal.";
                    document.getElementById('obunto-bubble').classList.remove('hidden');
                    setTimeout(() => {
                        document.getElementById('obunto-bubble').classList.add('hidden');
                    }, 6000);
                }, 1000);
            }
        } else {
            document.getElementById('loginStatus').innerText = "DENIED: " + data.message;
        }
    } catch (e) {
        console.error(e);
        document.getElementById('loginStatus').innerText = "SERVER ERROR";
    }
}

document.getElementById('btnLogin').onclick = login;

function updateClock() {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('clock').innerText = time;
}