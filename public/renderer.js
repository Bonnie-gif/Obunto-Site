const ALLOWED_IDS=[11577231,11608337,17211380,16499790,16234200,34002295,33326090,32366471,13732985,12026669,12026513,12045419,12022092,12045972,11649027,11648519,14075418,12330631,33582862,33305632,32791677,15677533,15034756,14118897,35026445,14159717,34645650,14474303,34186581,16047906,15216498]
const TSC_ID=11577231
const SCREENS={boot3:document.getElementById("boot-3"),boot2:document.getElementById("boot-2"),login:document.getElementById("login-screen"),desktop:document.getElementById("desktop-screen")}
const UI={
search:document.getElementById("search"),
btnSearch:document.getElementById("btnSearch"),
btnRefresh:document.getElementById("btnRefresh"),
historyList:document.getElementById("historyList"),
dateDisplay:document.getElementById("dateDisplay"),
paperContent:document.getElementById("paperContent"),
btnUnfreeze:document.getElementById("btnUnfreeze"),
btnLogin:document.getElementById("btnLogin"),
inpId:document.getElementById("inpId"),
profileClose:document.getElementById("closeProfile")
}
let searchHistory=JSON.parse(localStorage.getItem("tsc_history")||"[]")
function showScreen(name){
Object.values(SCREENS).forEach(el=>{if(!el) return; el.classList.add("hidden"); el.classList.remove("active")})
const el=SCREENS[name]
if(!el) return
el.classList.remove("hidden")
el.classList.add("active")
}
function updateClock(){
const c=document.getElementById("clock")
if(!c) return
const n=new Date()
c.textContent=n.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})
}
setInterval(updateClock,1000)
function speakObunto(text,mood){
const bubble=document.getElementById("obunto-bubble")
const img=document.getElementById("obunto-img")
const txt=document.getElementById("obunto-text")
if(!bubble||!img||!txt) return
img.src=`/obunto/${mood||"normal"}.png`
txt.textContent=text
bubble.classList.remove("hidden")
setTimeout(()=>{bubble.classList.add("hidden")},5000)
}
async function fetchJSON(url,opts){
try{
if(window.electronAPI?.fetchData) return await window.electronAPI.fetchData(url,opts)
const r=await fetch(url,opts)
if(!r.ok) return null
return await r.json()
}catch(e){
return null
}
}
async function resolveUserId(query){
if(!query) return null
const clean=String(query).trim()
if(clean==="") return null
if(/^\d+$/.test(clean)) return clean
const payload={usernames:[clean],excludeBannedUsers:true}
const r=await fetchJSON("https://users.roblox.com/v1/usernames/users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)})
if(r && Array.isArray(r.data) && r.data.length) return String(r.data[0].id)
const r2=await fetchJSON("https://users.roblox.com/v1/users/search?keyword="+encodeURIComponent(clean)+"&limit=1")
if(r2 && Array.isArray(r2.data) && r2.data.length) return String(r2.data[0].id)
return null
}
function renderHistory(){
if(!UI.historyList) return
UI.historyList.innerHTML=""
searchHistory.forEach(entry=>{
const row=document.createElement("div")
row.className="history-item"
row.textContent=`> ${entry.name} (${entry.id})`
row.onclick=()=>{if(UI.search) UI.search.value=entry.id; searchAction()}
UI.historyList.appendChild(row)
})
}
function safeSetText(sel,text){
const el=document.querySelector(sel)
if(el) el.textContent=text
}
async function getHeadshot(userId){
try{
const url=`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`
const data=await fetchJSON(url)
if(data && Array.isArray(data.data) && data.data[0] && data.data[0].imageUrl) return data.data[0].imageUrl
}catch(e){}
return null
}
async function createDossier(profile,groups,avatarUrl){
const id=profile?.id||"UNKNOWN"
const name=profile?.name||"UNKNOWN"
const display=profile?.displayName||""
const savedNote=localStorage.getItem("note_"+id) || ""
const affiliations=(Array.isArray(groups)?groups.map(g=>g.group?.name||"").filter(Boolean):[]).slice(0,6)
const html=[]
html.push('<div class="form-header" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">')
html.push('<div>')
html.push('<div style="font-weight:900;font-size:16px">PERSONNEL DOSSIER</div>')
html.push('<div style="font-size:12px;color:var(--ink-dim)">THUNDER SCIENTIFIC CORPORATION</div>')
html.push('</div>')
html.push('<div style="text-align:right;font-family:monospace;font-size:12px">REF: TSC-'+String(id).slice(-6)+'</div>')
html.push('</div>')
html.push('<div style="display:flex;gap:18px">')
html.push('<div style="width:220px">')
html.push('<div style="width:200px;height:200px;background:#f4f7fb;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid rgba(0,0,0,.04)">')
html.push('<img src="'+(avatarUrl||'/assets/icon-large-owner_info-28x14.png')+'" style="width:100%;height:100%;object-fit:cover" onerror="this.src=\'/assets/icon-large-owner_info-28x14.png\'">')
html.push('</div>')
html.push('<div style="margin-top:12px;font-weight:900;font-size:18px">'+escapeHtml(name)+'</div>')
html.push('<div style="font-family:monospace;font-size:12px;color:var(--ink-dim)">AKA: '+escapeHtml(display)+'</div>')
html.push('</div>')
html.push('<div style="flex:1">')
html.push('<div style="margin-bottom:12px">REGISTRY ID: <b>'+escapeHtml(id)+'</b> &nbsp;•&nbsp; CLEARANCE: <b>C1</b></div>')
html.push('<div style="background:rgba(0,0,0,0.03);padding:12px;border-radius:8px;min-height:120px;font-family:monospace;color:var(--ink-dim)"><strong>AUTHORIZED GROUP AFFILIATIONS</strong><br><small>'+(affiliations.length?escapeHtml(affiliations.join(", ")):"No associations")+'</small></div>')
html.push('<div style="margin-top:12px">OPERATOR NOTES</div>')
html.push('<textarea class="note-input" placeholder="Add annotations..." style="width:100%;height:80px;margin-top:8px;padding:8px;border-radius:8px;border:1px solid rgba(0,0,0,.06)">'+escapeHtml(savedNote)+'</textarea>')
html.push('</div>')
html.push('</div>')
return html.join("")
}
function escapeHtml(s){
return String(s||"").replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]})
}
async function searchAction(){
try{
if(!UI.search) return
const q=UI.search.value.trim()
if(!q) return
if(UI.paperContent) UI.paperContent.textContent="RETRIEVING DOSSIER..."
const uid=await resolveUserId(q)
if(!uid){
if(UI.paperContent) UI.paperContent.innerHTML='<div style="color:#ef4444">USER NOT FOUND</div>'
speakObunto("Data retrieval failed.","bug")
return
}
const profile=await fetchJSON("https://users.roblox.com/v1/users/"+uid)
const groupsRes=await fetchJSON("https://groups.roblox.com/v2/users/"+uid+"/groups/roles")
const groups=(groupsRes && Array.isArray(groupsRes.data))?groupsRes.data:[]
const avatar=await getHeadshot(uid)
searchHistory=searchHistory.filter(h=>String(h.id)!==String(uid))
searchHistory.unshift({id:uid,name:profile?.name||uid})
if(searchHistory.length>8) searchHistory.length=8
localStorage.setItem("tsc_history",JSON.stringify(searchHistory))
renderHistory()
const dossier=await createDossier(profile,groups,avatar)
if(UI.paperContent) UI.paperContent.innerHTML=dossier
localStorage.setItem("tsc_paper_archive_v3",dossier)
localStorage.setItem("tsc_paper_user_v3",uid)
if(Number(profile?.id)===1947) speakObunto("Obunto: mascot control engaged.","smug")
}catch(e){
if(UI.paperContent) UI.paperContent.innerHTML='<div style="color:#ef4444">ERROR RETRIEVING DATA</div>'
speakObunto("Data retrieval failed.","bug")
}
}
function bootSequence(){
showScreen("boot3")
let progress=0
const step=setInterval(()=>{
progress+=10
const prog=document.getElementById("boot-progress")
if(prog) prog.textContent="["+Array(Math.floor(progress/10)).fill("■").join("")+Array(10-Math.floor(progress/10)).fill("□").join("")+"] "+progress+"%"
if(progress>=50){
showScreen("boot2")
}
if(progress>=100){
clearInterval(step)
setTimeout(()=>{showScreen("login")},200)
}
},120)
}
function initUI(){
if(UI.btnSearch) UI.btnSearch.addEventListener("click",searchAction)
if(UI.btnRefresh) UI.btnRefresh.addEventListener("click",()=>{const u=localStorage.getItem("tsc_paper_user_v3"); if(u && UI.search) { UI.search.value=u; searchAction() }})
if(UI.search) UI.search.addEventListener("keydown",e=>{if(e.key==="Enter") searchAction()})
if(UI.btnUnfreeze) UI.btnUnfreeze.addEventListener("click",()=>{speakObunto("System Reset requested.","werror")})
if(UI.btnLogin && UI.inpId) UI.btnLogin.addEventListener("click",()=>{const v=UI.inpId.value.trim(); if(v){ if(UI.search) UI.search.value=v; showScreen("desktop"); searchAction() }})
if(UI.profileClose) UI.profileClose.addEventListener("click",()=>{const win=document.getElementById("profile-window"); if(win) win.classList.add("hidden")})
renderHistory()
if(UI.dateDisplay) UI.dateDisplay.textContent="DATE: "+(new Date().getFullYear()+16)
}
document.addEventListener("DOMContentLoaded",()=>{
bootSequence()
initUI()
})
