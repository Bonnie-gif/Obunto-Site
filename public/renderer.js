const SERVER_URL = "http://localhost:3000"; 
let socket;
let currentUser = null;
let selectedMood = 'normal';
const MOODS = ['normal', 'happy', 'annoyed', 'sad', 'bug', 'werror', 'stare', 'smug', 'suspicious', 'sleeping', 'panic', 'hollow', 'dizzy'];

window.onload = () => {
    socket = io(SERVER_URL);
    setTimeout(() => {
        document.getElementById('boot-1').classList.remove('active');
        document.getElementById('boot-2').classList.add('active');
        let w=0, bar=document.getElementById('boot-bar');
        let i=setInterval(()=>{ w+=5; bar.style.width=w+'%'; if(w>60) document.getElementById('net-stat').innerText="OK"; if(w>=100) { clearInterval(i); setTimeout(() => switchScreen('login-screen'), 500); } }, 80);
    }, 2500);
};

function switchScreen(id) {
    document.querySelectorAll('.full-screen').forEach(e => e.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function toggleWin(id) {
    const el = document.getElementById(id);
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

async function login() {
    const id = document.getElementById('inpId').value.trim();
    if(!id) return;
    const status = document.getElementById('loginStatus');
    status.innerText = "CONNECTING...";

    try {
        const res = await fetch(`${SERVER_URL}/api/login`, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({userId: id}) 
        });
        const data = await res.json();

        if (data.success) {
            currentUser = data.userData;
            if (currentUser.isAdmin) {
                switchScreen('admin-screen');
                initAdmin();
            } else {
                switchScreen('desktop-screen');
                document.getElementById('userAvatar').src = currentUser.avatar;
                document.getElementById('userName').innerText = currentUser.username;
                document.getElementById('userId').innerText = currentUser.id;
                document.getElementById('idHeader').innerText = currentUser.id;
                document.getElementById('userDept').innerText = currentUser.dept;
                document.getElementById('userRank').innerText = currentUser.rank;
                socket.emit('user_login', currentUser);
                initUser();
                toggleWin('win-profile');
            }
        } else {
            status.innerText = "DENIED: " + data.message;
        }
    } catch(e) {
        status.innerText = "SERVER ERROR";
    }
}

function initUser() {
    socket.on('receive_mascot', d => {
        const el = document.createElement('div'); el.className = 'mascot-overlay';
        el.innerHTML = `<div class="mascot-msg">${d.message}</div><img src="assets/obunto/${d.mood}.png" width="70" style="background:#c8d1c0; border:2px solid #2b3323;">`;
        document.body.appendChild(el); setTimeout(()=>el.remove(), 6000);
    });
    socket.on('force_disconnect', () => location.reload());
    socket.on('account_frozen', () => { alert("ID FROZEN"); location.reload(); });
    socket.on('account_deleted', () => { alert("ID DELETED"); location.reload(); });
    setInterval(()=>document.getElementById('clock').innerText=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),1000);
}

function initAdmin() {
    socket.emit('admin_login');
    socket.on('users_list', renderList);
    const g = document.getElementById('moodGrid');
    g.innerHTML = '';
    MOODS.forEach(m => {
        const d = document.createElement('div'); d.className = 'mood-item';
        d.innerHTML = `<img src="assets/obunto/${m}.png" title="${m}">`;
        d.onclick = () => { document.querySelectorAll('.mood-item').forEach(x=>x.style.background='transparent'); d.style.background='var(--border)'; selectedMood=m; };
        g.appendChild(d);
    });
}

function renderList(list) {
    const c = document.getElementById('userList');
    document.getElementById('userCount').innerText = list.length;
    c.innerHTML = '';
    list.forEach(u => {
        const d = document.createElement('div'); d.className = 'user-row';
        let st = u.frozen ? 'frz' : (u.online ? 'on' : 'off');
        d.innerHTML = `<div style="flex:1"><span class="status-dot ${st}"></span> <b>${u.username}</b> <span style="opacity:0.6; font-size:9px;">${u.dept}</span></div>
            <div style="display:flex; gap:5px;">
                ${u.online ? `<img src="assets/button-close-17x17.png" style="cursor:pointer" onclick="act('kick','${u.id}')">` : ''}
                <img src="assets/icon-tiny-lock-10x12.png" style="cursor:pointer" onclick="act('freeze','${u.id}')">
                <img src="assets/icon-small-delete-14x15.png" style="cursor:pointer" onclick="act('delete','${u.id}')"></div>`;
        c.appendChild(d);
    });
}

function act(a, id) { if(confirm(a.toUpperCase()+"?")) socket.emit('admin_'+a, id); }
function manualAction(a) { const id = document.getElementById('manualId').value.trim(); if(id) act(a, id); }
function refreshList() { socket.emit('admin_refresh'); }
function sendBc(type) { const msg = document.getElementById('bcMsg').value; if(msg) { socket.emit('admin_broadcast', { message:msg, type, target:document.getElementById('bcTarget').value, mood:selectedMood }); document.getElementById('bcMsg').value=''; }}