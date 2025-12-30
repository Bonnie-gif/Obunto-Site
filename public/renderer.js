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

            if (currentUser.isObunto) {
                showObunto("Welcome, special user. Systems ready.", "Smug");
            }
        } else {
            document.getElementById('loginStatus').innerText = "DENIED: " + data.message;
        }
    } catch (e) {
        document.getElementById('loginStatus').innerText = "ERROR";
    }
}

function showObunto(message, mood) {
    document.getElementById('obunto-img').src = `/obunto/${mood}.png`;
    document.getElementById('obunto-text').innerText = message;
    document.getElementById('obunto-bubble').classList.remove('hidden');
    setTimeout(() => document.getElementById('obunto-bubble').classList.add('hidden'), 6000);
}

function updateClock() {
    document.getElementById('clock').innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Drag janelas
let isDragging = false;
let currentX, currentY, initialX, initialY;
const windows = document.querySelectorAll('.window-newton');
windows.forEach(win => {
    const header = win.querySelector('.win-header');
    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        initialX = e.clientX - win.offsetLeft;
        initialY = e.clientY - win.offsetTop;
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
    });
});

function drag(e) {
    if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        windows[0].style.left = `${currentX}px`;
        windows[0].style.top = `${currentY}px`;
    }
}

function stopDrag() {
    isDragging = false;
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);
}

document.getElementById('btnLogin').addEventListener('click', login);