var loadingMessages = ["Misturando tintas...", "Afiando lápis...", "Ajustando luz...", "Finalizando..."];
var loadProg = 0;
var loadTimer = setInterval(function(){
    loadProg += Math.random() * 8;
    if(loadProg > 100) loadProg = 100;
    var bar = document.getElementById('loadingBarFill');
    if(bar) bar.style.width = loadProg + '%';
    if(loadProg >= 100) {
        clearInterval(loadTimer);
        setTimeout(function(){
            var el = document.getElementById('loading');
            if(el) el.classList.add('fade-out');
            
            var d = new Date();
            var dateStr = d.getDate() + '/' + (d.getMonth()+1) + '/' + d.getFullYear();
            var fs = document.getElementById('footerDate');
            if(fs) fs.innerHTML = "CHECKED<br>" + dateStr;
            
            // Tenta iniciar a música se estiver configurada (navegadores bloqueiam autoplay sem clique, então depende da interação)
            renderMusic();
        }, 600);
    }
}, 150);

document.addEventListener('mousemove', function(e) {
    if(Math.random() > 0.5) return;
    var dot = document.createElement('div');
    dot.className = 'ink-dot';
    dot.style.left = e.pageX + 'px';
    dot.style.top = e.pageY + 'px';
    document.body.appendChild(dot);
    setTimeout(function() { dot.remove(); }, 1000);
});

function toggleNightMode() {
    document.body.classList.toggle('night-mode');
}

// DADOS DO SITE (Incluindo Música Agora)
var data = {
    banner: { small: "ARTIST NAME", main: "COMISSÕES", sub: "Ilustração & Design" },
    status: "ABERTO",
    music: { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" }, // Música padrão de exemplo
    welcome: { 
        title: "Bem-vindo!", 
        sub: "Meu espaço criativo", 
        text: "Olá! Este é meu portfólio. Sinta-se à vontade para explorar meus trabalhos e conferir a tabela de preços ao lado." 
    },
    promo: { title: "Aviso!", text: "Slots limitados para este mês! Peça já o seu." },
    links: { text: "Me siga nas redes!", items: [ { icon: "t", color: "red", url: "" }, { icon: "𝕏", color: "blue", url: "" }, { icon: "📷", color: "yellow", url: "" } ] },
    tos: "<h3>Pagamento</h3><p>Aceito PIX e PayPal. Pagamento 50% adiantado.</p><h3>Prazos</h3><p>O prazo médio é de 1 a 2 semanas.</p>",
    prices: [ { name: "Sketch Rápido", price: "R$30" }, { name: "Icon Colorido", price: "R$50" }, { name: "Full Body", price: "R$150" } ],
    extras: [ { name: "Fundo Simples", price: "Grátis" }, { name: "Pet Adicional", price: "+R$20" } ],
    gallery: [ { title: "", data: "" }, { title: "", data: "" }, { title: "", data: "" }, { title: "", data: "" } ],
    footer: "Obrigado pela visita!"
};

function $(id) { return document.getElementById(id); }
// Mudei a versão do 'vintageSiteDatav19' para resetar e pegar a estrutura nova com música
function loadData() { var s = localStorage.getItem('vintageSiteDatav19'); if(s) try { data = JSON.parse(s); } catch(e){} render(); }
function saveData() { localStorage.setItem('vintageSiteDatav19', JSON.stringify(data)); }

function safeHTML(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function render() {
    if($('statusValue')) $('statusValue').textContent = data.status;
    if($('bannerSmall')) $('bannerSmall').textContent = data.banner.small;
    if($('bannerMain')) $('bannerMain').textContent = data.banner.main;
    if($('bannerSub')) $('bannerSub').textContent = data.banner.sub;
    
    if($('welcomeTitle')) $('welcomeTitle').textContent = data.welcome.title;
    if($('welcomeSub')) $('welcomeSub').textContent = data.welcome.sub;
    if($('welcomeText')) $('welcomeText').innerHTML = data.welcome.text; 
    
    if($('promoTitle')) $('promoTitle').textContent = data.promo.title;
    if($('promoText')) $('promoText').innerHTML = data.promo.text; 
    
    if($('linksText')) $('linksText').textContent = data.links.text;
    if($('tosText')) $('tosText').innerHTML = data.tos; 
    if($('footerText')) $('footerText').textContent = data.footer;
    
    renderLinks(); 
    renderPrices(); 
    renderExtras(); 
    renderGallery();
    renderMusic(); // Atualiza a fonte da música
}

// --- Lógica do Player de Música ---
var isPlaying = false;

function renderMusic() {
    var audio = $('audioPlayer');
    // Só atualiza o src se mudou, para não reiniciar a música se estiver tocando
    if(audio && data.music && audio.getAttribute('src') !== data.music.url) {
        audio.src = data.music.url;
        audio.load();
    }
}

function toggleMusic() {
    var audio = $('audioPlayer');
    var container = document.querySelector('.music-player-container');
    
    if (!audio) return;

    if (isPlaying) {
        audio.pause();
        container.classList.remove('is-playing');
        isPlaying = false;
    } else {
        audio.play().then(() => {
            container.classList.add('is-playing');
            isPlaying = true;
        }).catch(e => {
            alert("Erro ao tocar: link inválido ou bloqueado pelo navegador.");
            console.error(e);
        });
    }
}

function editMusic(e) {
    if(!editorMode) return;
    e.stopPropagation();
    openModal('Música do Vinil', 
        '<div class="modal-form-group"><label class="modal-label">Link do MP3 (URL direta)</label><input class="modal-input" id="inMusicUrl" value="'+(data.music ? data.music.url : '')+'" placeholder="https://exemplo.com/musica.mp3"></div><p style="font-size:12px;color:#666">Dica: Use links diretos de arquivos .mp3 para funcionar melhor.</p>', 
        '<button class="modal-btn cancel" onclick="closeModal()">Cancelar</button><button class="modal-btn save" onclick="saveMusic()">Salvar</button>'
    );
}

function saveMusic() {
    if(!data.music) data.music = {};
    data.music.url = $('inMusicUrl').value;
    saveData();
    render(); // Isso vai chamar renderMusic()
    closeModal();
    // Reseta player
    var container = document.querySelector('.music-player-container');
    container.classList.remove('is-playing');
    isPlaying = false;
}

// --- Resto das funções de renderização ---

function renderLinks() {
    var container = $('socialGrid'); 
    if(!container) return;
    container.innerHTML = ''; 
    data.links.items.forEach(function(l) {
        var a = document.createElement('a');
        var safeUrl = '#';
        try { var urlObj = new URL(l.url); if(['http:', 'https:', 'mailto:'].includes(urlObj.protocol)) { safeUrl = l.url; } } catch(e) { }
        a.href = safeUrl; if(safeUrl !== '#') { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
        a.className = 'social-btn ' + (l.color || ''); a.textContent = l.icon || '?'; container.appendChild(a);
    });
}

function renderPrices() { 
    var container = $('pricesList'); if(!container) return; container.innerHTML = '';
    data.prices.forEach(function(p){ var div = document.createElement('div'); div.className = 'menu-item'; var nameSpan = document.createElement('span'); nameSpan.className = 'menu-item-name'; nameSpan.textContent = p.name; var priceSpan = document.createElement('span'); priceSpan.className = 'menu-item-price'; priceSpan.textContent = p.price; div.appendChild(nameSpan); div.appendChild(priceSpan); container.appendChild(div); }); 
}

function renderExtras() { 
    var container = $('extrasList'); if(!container) return; container.innerHTML = '';
    data.extras.forEach(function(e){ var div = document.createElement('div'); div.className = 'menu-item'; var nameSpan = document.createElement('span'); nameSpan.className = 'menu-item-name'; nameSpan.textContent = e.name; var priceSpan = document.createElement('span'); priceSpan.className = 'menu-item-price'; priceSpan.textContent = e.price; div.appendChild(nameSpan); div.appendChild(priceSpan); container.appendChild(div); }); 
}

function renderGallery() { 
    var container = $('galleryGrid'); if(!container) return; container.innerHTML = '';
    data.gallery.forEach(function(g, i){ 
        var rot = (Math.random() * 6) - 3; var slide = document.createElement('div'); slide.className = 'gallery-slide'; slide.style.transform = 'rotate('+rot+'deg)'; slide.onclick = function() { editGalleryItem(i); };
        if(g.data) { var img = document.createElement('img'); img.src = g.data; slide.appendChild(img); } else { var ph = document.createElement('div'); ph.className = 'placeholder'; ph.textContent = 'ARTE ' + (i+1); slide.appendChild(ph); }
        var cap = document.createElement('div'); cap.className = 'gallery-caption'; cap.textContent = 'Fig. ' + (i+1); slide.appendChild(cap); container.appendChild(slide);
    }); 
}

var editorMode = false;
var keySeq = [];
var code = ['ArrowUp','ArrowDown','ArrowUp','ArrowUp','ArrowDown','ArrowDown'];
document.addEventListener('keydown', function(e){ keySeq.push(e.key); if(keySeq.length > 6) keySeq.shift(); if(keySeq.join(',') === code.join(',')) toggleEditor(); });

function toggleEditor() {
    editorMode = !editorMode;
    document.body.classList.toggle('editor-active', editorMode);
    var ind = $('editorIndicator');
    if(ind) ind.classList.toggle('active', editorMode);
}

function showPage(page) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    var p = $(page+'Page'); if(p) p.classList.add('active');
    var n = document.querySelector('[data-page="'+page+'"]'); if(n) n.classList.add('active');
}

function openModal(title, contentHTML, buttonsHTML) {
    $('modalTitle').textContent = title; $('modalContent').innerHTML = contentHTML; $('modalButtons').innerHTML = buttonsHTML; $('modalOverlay').classList.add('active');
}
function closeModal() { $('modalOverlay').classList.remove('active'); }
$('modalOverlay').addEventListener('click', function(e){ if(e.target === this) closeModal(); });

function richEditor(id, content) {
    return '<div style="border:1px solid #ccc;border-radius:4px;margin-bottom:10px"><div style="background:#eee;padding:5px;border-bottom:1px solid #ccc"><button onclick="document.execCommand(\'bold\')"><b>B</b></button> <button onclick="document.execCommand(\'italic\')"><i>I</i></button></div><div id="'+id+'" contenteditable="true" style="padding:10px;min-height:80px;background:#fff">'+content+'</div></div>';
}

function editBanner(e) { if(!editorMode)return; e.stopPropagation(); openModal('Banner', '<div class="modal-form-group"><label class="modal-label">Nome Pequeno</label><input class="modal-input" id="inBS" value="'+data.banner.small+'"></div><div class="modal-form-group"><label class="modal-label">Título Principal</label><input class="modal-input" id="inBM" value="'+data.banner.main+'"></div><div class="modal-form-group"><label class="modal-label">Subtítulo</label><input class="modal-input" id="inBSub" value="'+data.banner.sub+'"></div>', '<button class="modal-btn cancel" onclick="closeModal()">Cancelar</button><button class="modal-btn save" onclick="saveBanner()">Salvar</button>'); }
function saveBanner() { data.banner.small=$('inBS').value; data.banner.main=$('inBM').value; data.banner.sub=$('inBSub').value; saveData(); render(); closeModal(); }

function editStatus(e) { if(!editorMode)return; e.stopPropagation(); openModal('Status', '<div class="modal-form-group"><label class="modal-label">Status</label><input class="modal-input" id="inStat" value="'+data.status+'"></div>', '<button class="modal-btn cancel" onclick="closeModal()">Cancelar</button><button class="modal-btn save" onclick="saveStatus()">Salvar</button>'); }
function saveStatus() { data.status=$('inStat').value; saveData(); render(); closeModal(); }

function editWelcome(e) { if(!editorMode)return; e.stopPropagation(); openModal('Bem-vindo', '<div class="modal-form-group"><label class="modal-label">Título</label><input class="modal-input" id="inWT" value="'+data.welcome.title+'"></div><div class="modal-form-group"><label class="modal-label">Subtítulo</label><input class="modal-input" id="inWS" value="'+data.welcome.sub+'"></div><label class="modal-label">Texto</label>'+richEditor('inWTxt', data.welcome.text), '<button class="modal-btn cancel" onclick="closeModal()">Cancelar</button><button class="modal-btn save" onclick="saveWelcome()">Salvar</button>'); }
function saveWelcome() { data.welcome.title=$('inWT').value; data.welcome.sub=$('inWS').value; data.welcome.text= $('inWTxt').innerHTML; saveData(); render(); closeModal(); }

function editPromo(e) { if(!editorMode)return; e.stopPropagation(); openModal('Promoção', '<div class="modal-form-group"><label class="modal-label">Título</label><input class="modal-input" id="inPT" value="'+data.promo.title+'"></div><label class="modal-label">Texto</label>'+richEditor('inPTxt', data.promo.text), '<button class="modal-btn cancel" onclick="closeModal()">Cancelar</button><button class="modal-btn save" onclick="savePromo()">Salvar</button>'); }
function savePromo() { data.promo.title=$('inPT').value; data.promo.text= $('inPTxt').innerHTML; saveData(); render(); closeModal(); }

function editLinks(e) { if(!editorMode) return; e.stopPropagation(); window.renderLinksModalList = function() { var html = '<div class="modal-links-list">'; data.links.items.forEach(function(link, index){ html += '<div class="modal-link-item"><input class="modal-link-icon" id="lIcon'+index+'" value="'+link.icon+'"><select class="modal-link-select" id="lColor'+index+'"><option value="red" '+(link.color==='red'?'selected':'')+'>Vermelho</option><option value="blue" '+(link.color==='blue'?'selected':'')+'>Azul</option><option value="yellow" '+(link.color==='yellow'?'selected':'')+'>Amarelo</option><option value="black" '+(link.color==='black'?'selected':'')+'>Preto</option><option value="white" '+(link.color==='white'?'selected':'')+'>Branco</option></select><input class="modal-link-url" id="lUrl'+index+'" value="'+link.url+'"><button class="modal-btn-remove" onclick="removeLinkItem('+index+')">X</button></div>'; }); html += '</div><button class="modal-add-link-btn" onclick="addLinkItem()">+ Adicionar Rede</button>'; return html; }; openModal('Redes Sociais', '<div class="modal-form-group"><label class="modal-label">Texto</label><input class="modal-input" id="inLinksText" value="'+data.links.text+'"></div><label class="modal-label">Lista de Links</label><div id="linksListContainer">' + window.renderLinksModalList() + '</div>', '<button class="modal-btn cancel" onclick="closeModal()">Cancelar</button><button class="modal-btn save" onclick="saveLinks()">Salvar</button>'); }
window.addLinkItem = function() { updateLinksDataTemp(); data.links.items.push({ icon: "?", color: "red", url: "" }); $('linksListContainer').innerHTML = window.renderLinksModalList(); };
window.removeLinkItem = function(index) { updateLinksDataTemp(); data.links.items.splice(index, 1); $('linksListContainer').innerHTML = window.renderLinksModalList(); };
function updateLinksDataTemp() { var count = data.links.items.length; for(var i=0; i<count; i++) { var ico = $('lIcon'+i); var col = $('lColor'+i); var url = $('lUrl'+i); if(ico && col && url) { data.links.items[i].icon = ico.value; data.links.items[i].color = col.value; data.links.items[i].url = url.value; } } }
function saveLinks() { data.links.text = $('inLinksText').value; updateLinksDataTemp(); saveData(); render(); closeModal(); }

function editPrices(e) { if(!editorMode)return; e.stopPropagation(); var h = '<div class="modal-links-list">'; data.prices.forEach((p,i) => { h+='<div class="modal-link-item"><input class="modal-link-url" id="pN'+i+'" value="'+p.name+'"><input style="width:80px" class="modal-link-select" id="pP'+i+'" value="'+p.price+'"><button class="modal-btn-remove" onclick="rmPrice('+i+')">X</button></div>'; }); h += '</div>'; openModal('Preços', h, '<button class="modal-btn cancel" onclick="closeModal()">Cancelar</button><button class="modal-btn save" onclick="savePrices()">Salvar</button>'); }
function savePrices(){ data.prices.forEach((p,i)=>{ var n=$('pN'+i); var pr=$('pP'+i); if(n && pr) { p.name=n.value; p.price=pr.value; } }); saveData(); render(); closeModal(); }
window.rmPrice = function(i){ data.prices.splice(i,1); saveData(); render(); closeModal(); }
function addPrice(){ data.prices.push({name:"Novo Serviço",price:"R$0"}); saveData(); render(); }

function editExtras(e) { if(!editorMode)return; e.stopPropagation(); var h = '<div class="modal-links-list">'; data.extras.forEach((ex,i) => { h+='<div class="modal-link-item"><input class="modal-link-url" id="eN'+i+'" value="'+ex.name+'"><input style="width:80px" class="modal-link-select" id="eP'+i+'" value="'+ex.price+'"><button class="modal-btn-remove" onclick="rmExtra('+i+')">X</button></div>'; }); h += '</div>'; openModal('Extras', h, '<button class="modal-btn cancel" onclick="closeModal()">Cancelar</button><button class="modal-btn save" onclick="saveExtras()">Salvar</button>'); }
function saveExtras(){ data.extras.forEach((ex,i)=>{ var n=$('eN'+i); var pr=$('eP'+i); if(n && pr) { ex.name=n.value; ex.price=pr.value; } }); saveData(); render(); closeModal(); }
window.rmExtra = function(i){ data.extras.splice(i,1); saveData(); render(); closeModal(); }
function addExtra(){ data.extras.push({name:"Extra",price:"R$0"}); saveData(); render(); }

function editTos(e) { if(!editorMode)return; e.stopPropagation(); openModal('Termos', richEditor('inTos', data.tos), '<button class="modal-btn cancel" onclick="closeModal()">Cancelar</button><button class="modal-btn save" onclick="saveTos()">Salvar</button>'); }
function saveTos(){ data.tos = $('inTos').innerHTML; saveData(); render(); closeModal(); }

function editGalleryItem(i) { if(!editorMode) return; openModal('Editar Imagem', '<label class="modal-label">Selecionar arquivo</label><input class="modal-input" type="file" onchange="previewImg(this)"><div id="gPrev" style="margin-top:10px;text-align:center"></div>', '<button class="modal-btn delete" onclick="rmGal('+i+')">Excluir</button><button class="modal-btn cancel" onclick="closeModal()">Cancelar</button><button class="modal-btn save" onclick="saveGal('+i+')">Salvar</button>'); }
window.previewImg = function(inp){ if(inp.files[0]){ var file = inp.files[0]; if (!file.type.startsWith('image/')) { alert('Por favor, selecione apenas arquivos de imagem.'); inp.value = ''; return; } if (file.size > 2 * 1024 * 1024) { alert('A imagem é muito grande (Máximo 2MB).'); inp.value = ''; return; } var r=new FileReader(); r.onload=e=>{$('gPrev').innerHTML='<img src="'+e.target.result+'" style="max-width:100px">'; $('gPrev').dataset.d=e.target.result;}; r.readAsDataURL(file); } }
window.saveGal = function(i){ if($('gPrev').dataset.d) data.gallery[i].data = $('gPrev').dataset.d; saveData(); render(); closeModal(); }
window.rmGal = function(i){ data.gallery.splice(i,1); saveData(); render(); closeModal(); }
function addGalleryItem(){ data.gallery.push({title:"",data:""}); saveData(); render(); }

loadData();