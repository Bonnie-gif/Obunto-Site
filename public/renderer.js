const socket = io();

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
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('desktop-screen').style.display = 'flex';
            
            document.getElementById('profile-avatar').src = data.userData.avatar;
            document.getElementById('profile-name').innerText = data.userData.username;
            document.getElementById('profile-id').innerText = data.userData.id;
            document.getElementById('profile-rank-tag').innerText = data.userData.rank;
            
            socket.emit('user_login', data.userData);
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

async function searchUser() {
    const id = document.getElementById('search').value.trim();
    if(!id) return;
    const viewer = document.getElementById('paperContent');
    viewer.innerHTML = "SEARCHING DATABASE...";

    try {
        const res = await fetch(`/api/search/${id}`);
        const user = await res.json();

        viewer.innerHTML = `
            <div class="window animate-up" style="width:420px; margin: 20px auto;">
                <div class="win-header">
                    <span>PERSONNEL FILE // ${user.id}</span>
                    <img src="assets/button-close-17x17.png" style="cursor:pointer;" onclick="this.closest('.window').remove()">
                </div>
                <div class="win-body">
                    <div class="profile-card">
                        <div class="profile-img-box">
                            <img src="${user.avatar}" width="70">
                        </div>
                        <div class="profile-info" style="flex:1;">
                            <div style="margin-bottom:8px;"><span class="tag">IDENTITY</span> <b style="font-size:14px;">${user.username}</b></div>
                            <div><b>ID:</b> ${user.id}</div>
                            <div><b>DEPT:</b> ${user.dept}</div>
                            <div><b>RANK:</b> <span style="font-weight:bold; color:#2b3323;">${user.rank}</span></div>
                        </div>
                    </div>
                    <div style="margin-top:15px; border-top:1px dashed #2b3323; padding-top:10px; font-size:9px; text-align:justify; opacity:0.8;">
                        NOTE: Employee is subject to standard surveillance protocols under TSC Regulation 14-B. Reporting mandatory for anomalies.
                    </div>
                </div>
            </div>
        `;
    } catch(e) { viewer.innerHTML = "ERROR: ID NOT FOUND"; }
}