const socket = io();
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
            document.getElementById('login-screen').classList.remove('active');
            document.getElementById('desktop-screen').classList.add('active');
            
            document.getElementById('profile-avatar').src = currentUser.avatar;
            document.getElementById('profile-name').innerText = currentUser.username;
            document.getElementById('profile-id').innerText = currentUser.id;
            document.getElementById('profile-rank-tag').innerText = currentUser.rank;
            
            socket.emit('user_login', currentUser);
            setInterval(() => {
                document.getElementById('clock').innerText = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
            }, 1000);
        } else {
            document.getElementById('loginStatus').innerText = "DENIED: " + data.message;
        }
    } catch(e) { document.getElementById('loginStatus').innerText = "SERVER ERROR"; }
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
            <div class="window animate-up" style="width:400px; margin: 20px auto;">
                <div class="win-header">
                    <span>PERSONNEL FILE // ${user.id}</span>
                    <img src="assets/button-close-17x17.png" style="cursor:pointer;" onclick="this.closest('.window').remove()">
                </div>
                <div class="win-body">
                    <div class="profile-card">
                        <div class="profile-img-box">
                            <img src="${user.avatar}" width="70">
                        </div>
                        <div class="profile-info">
                            <div><span class="tag">IDENTITY</span> <b>${user.username}</b></div>
                            <div>ID: ${user.id}</div>
                            <div>DEPT: ${user.dept}</div>
                            <div>RANK: <span style="font-weight:bold;">${user.rank}</span></div>
                        </div>
                    </div>
                    <div style="margin-top:15px; border-top:1px dashed #2b3323; padding-top:10px; font-size:10px; text-align:justify;">
                        NOTE: Employee is subject to standard surveillance protocols under TSC Regulation 14-B. Reporting mandatory for anomalies.
                    </div>
                </div>
            </div>
        `;
    } catch(e) { viewer.innerHTML = "ERROR: ID NOT FOUND"; }
}