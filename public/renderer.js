let currentUser = null;

async function login() {
    const id = document.getElementById('inpId').value.trim();
    if(!id) return;
    document.getElementById('loginStatus').innerText = "AUTHENTICATING...";
    
    try {
        const res = await fetch('/api/login', { 
            method:'POST', 
            headers:{'Content-Type':'application/json'}, 
            body:JSON.stringify({userId:id}) 
        });
        const data = await res.json();

        if(data.success) {
            currentUser = data.userData;
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('desktop-screen').style.display = 'flex';
            
            document.getElementById('userAvatar').src = currentUser.avatar;
            document.getElementById('userName').innerText = currentUser.username;
            document.getElementById('userId').innerText = currentUser.id;
            document.getElementById('userDept').innerText = currentUser.dept;
            document.getElementById('userRank').innerText = currentUser.rank;
            document.getElementById('idHeader').innerText = currentUser.id;
            
            updateClock();
            setInterval(updateClock, 1000);
        } else {
            document.getElementById('loginStatus').innerText = "DENIED: " + data.message;
        }
    } catch(e) { document.getElementById('loginStatus').innerText = "SERVER ERROR"; }
}

function updateClock() {
    document.getElementById('clock').innerText = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
}

function toggleWin(id) {
    const el = document.getElementById(id);
    el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'flex' : 'none';
}