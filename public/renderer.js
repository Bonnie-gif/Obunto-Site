const ALLOWED_IDS=[11577231,11608337,17211380,16499790,16234200,34002295,33326090,32366471,13732985,12026669,12026513,12045419,12022092,12045972,11649027,11648519,14075418,12330631,33582862,33305632,32791677,15677533,15034756,14118897,35026445,14159717,34645650,14474303,34186581,16047906,15216498]
const TSC_ID=11577231
const ui={
search:document.getElementById("search"),
viewer:document.getElementById("paperContent"),
btnSearch:document.getElementById("btnSearch"),
btnRefresh:document.getElementById("btnRefresh"),
historyList:document.getElementById("historyList"),
dateDisplay:document.getElementById("dateDisplay")
}
let history=JSON.parse(localStorage.getItem("tsc_history")||"[]")
function updateClock(){
const c=document.getElementById("clock")
if(!c)return
const n=new Date()
c.textContent=n.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})
}
setInterval(updateClock,1000)
function speakObunto(text,mood){
const bubble=document.getElementById("obunto-bubble")
const img=document.getElementById("obunto-img")
const t=document.getElementById("obunto-text")
img.src=`/obunto/${mood}.png`
t.textContent=text
bubble.classList.remove("hidden")
setTimeout(()=>bubble.classList.add("hidden"),6000)
}
async function fetchJSON(url,opts){
if(window.electronAPI?.fetchData)return await window.electronAPI.fetchData(url,opts)
const r=await fetch(url,opts)
return await r.json()
}
async function resolveUserId(q){
if(!isNaN(q))return q
const r=await fetchJSON("https://users.roblox.com/v1/usernames/users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({usernames:[q],excludeBannedUsers:true})})
return r.data[0].id
}
async function searchAction(){
const q=ui.search.value.trim()
if(!q)return
ui.viewer.textContent="RETRIEVING DOSSIER..."
const id=await resolveUserId(q)
const profile=await fetchJSON(`https://users.roblox.com/v1/users/${id}`)
const groups=await fetchJSON(`https://groups.roblox.com/v2/users/${id}/groups/roles`)
history=history.filter(h=>h.id!==id)
history.unshift({id, name:profile.name})
history=history.slice(0,6)
localStorage.setItem("tsc_history",JSON.stringify(history))
renderHistory()
ui.viewer.innerHTML=`<h2>${profile.name}</h2><p>ID: ${profile.id}</p>`
if(Number(profile.id)===1947)speakObunto("Mascot control engaged.","smug")
}
function renderHistory(){
ui.historyList.innerHTML=""
history.forEach(h=>{
const d=document.createElement("div")
d.className="history-item"
d.textContent=`> ${h.name} (${h.id})`
d.onclick=()=>{ui.search.value=h.id;searchAction()}
ui.historyList.appendChild(d)
})
}
ui.btnSearch.onclick=searchAction
ui.btnRefresh.onclick=()=>searchAction()
ui.search.onkeydown=e=>{if(e.key==="Enter")searchAction()}
ui.dateDisplay.textContent=`DATE: ${(new Date().getFullYear()+16)}`
renderHistory()
updateClock()
