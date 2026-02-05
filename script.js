(function(){
'use strict';

var typeTexts = ["Misturando tintas...", "Afiando lápis...", "Ajustando luz...", "Preparando tela...", "Quase pronto!"];
var typeIndex = 0;
var charIndex = 0;
var isDeleting = false;
var loadProg = 0;

function typeWriter() {
    var el = document.getElementById('typewriterText');
    if (!el) return;
    var current = typeTexts[typeIndex];
    if (isDeleting) {
        el.textContent = current.substring(0, charIndex - 1);
        charIndex--;
    } else {
        el.textContent = current.substring(0, charIndex + 1);
        charIndex++;
    }
    var speed = isDeleting ? 30 : 80;
    if (!isDeleting && charIndex === current.length) {
        speed = 1500;
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        typeIndex = (typeIndex + 1) % typeTexts.length;
        speed = 300;
    }
    setTimeout(typeWriter, speed);
}

var loadTimer = setInterval(function(){
    loadProg += Math.random() * 6 + 2;
    if (loadProg > 100) loadProg = 100;
    var bar = document.getElementById('loadingBarFill');
    if (bar) bar.style.width = loadProg + '%';
    if (loadProg >= 100) {
        clearInterval(loadTimer);
        setTimeout(function(){
            var el = document.getElementById('loading');
            if (el) el.classList.add('hide');
            initAnimations();
            var d = new Date();
            var ds = document.getElementById('footerDate');
            if (ds) ds.innerHTML = "CHECKED<br>" + d.getDate() + '/' + (d.getMonth()+1) + '/' + d.getFullYear();
        }, 500);
    }
}, 120);

setTimeout(typeWriter, 500);

function createParticles() {
    var container = document.getElementById('particles');
    if (!container) return;
    for (var i = 0; i < 20; i++) {
        var p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDelay = Math.random() * 15 + 's';
        p.style.animationDuration = (15 + Math.random() * 10) + 's';
        container.appendChild(p);
    }
}
createParticles();

function initAnimations() {
    var els = document.querySelectorAll('[data-anim]');
    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
            }
        });
    }, { threshold: 0.1 });
    els.forEach(function(el) { observer.observe(el); });
}

window.addEventListener('scroll', function() {
    var btn = document.getElementById('backTop');
    if (btn) {
        if (window.scrollY > 400) btn.classList.add('show');
        else btn.classList.remove('show');
    }
});

window.scrollToTop = function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.toggleNightMode = function() {
    document.body.classList.toggle('night-mode');
    showToast(document.body.classList.contains('night-mode') ? 'Modo noturno ativado' : 'Modo claro ativado');
};

function showToast(msg, type) {
    var container = document.getElementById('toasts');
    if (!container) return;
    var toast = document.createElement('div');
    toast.className = 'toast' + (type ? ' ' + type : '');
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 3000);
}

var data = {
    banner: { small: "ARTIST NAME", main: "COMISSÕES", sub: "Ilustração & Design" },
    status: "ABERTO",
    welcome: { title: "Bem-vindo!", sub: "Meu espaço criativo", text: "Olá! Este é meu portfólio. Sinta-se à vontade para explorar meus trabalhos e conferir a tabela de preços." },
    promo: { title: "Aviso!", text: "Slots limitados para este mês! Peça já o seu." },
    links: { text: "Me siga nas redes!", items: [{ icon: "t", color: "red", url: "" }, { icon: "𝕏", color: "blue", url: "" }, { icon: "📷", color: "yellow", url: "" }] },
    tos: "<h3>Pagamento</h3><p>Aceito PIX e PayPal. Pagamento 50% adiantado.</p><h3>Prazos</h3><p>O prazo médio é de 1 a 2 semanas.</p><h3>Revisões</h3><p>Incluso até 2 revisões menores.</p>",
    prices: [{ name: "Sketch Rápido", price: "R$30" }, { name: "Icon Colorido", price: "R$50" }, { name: "Full Body", price: "R$150" }],
    extras: [{ name: "Fundo Simples", price: "Grátis" }, { name: "Pet Adicional", price: "+R$20" }],
    gallery: [{ title: "", data: "" }, { title: "", data: "" }, { title: "", data: "" }, { title: "", data: "" }],
    footer: "Obrigado pela visita!"
};

function $(id) { return document.getElementById(id); }

function sanitize(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function loadData() {
    var s = localStorage.getItem('vintageSiteDatav3');
    if (s) {
        try {
            var parsed = JSON.parse(s);
            if (parsed && typeof parsed === 'object') data = parsed;
        } catch(e) {}
    }
    render();
}

function saveData() {
    try {
        localStorage.setItem('vintageSiteDatav3', JSON.stringify(data));
        showToast('Salvo localmente! Use o botão SALVAR para copiar o código.', 'success');
    } catch(e) {
        showToast('Erro ao salvar', 'error');
    }
}

window.exportCode = function() {
    var c = "var data = " + JSON.stringify(data, null, 4) + ";";
    navigator.clipboard.writeText(c).then(function() {
        alert("CÓDIGO COPIADO COM SUCESSO!\n\n1. Abra o arquivo 'script.js' no seu VS Code.\n2. Apague a parte antiga onde diz 'var data = ...'\n3. Cole este novo código.\n4. Faça o Git Push para atualizar o site.");
    }, function() {
        alert("Erro ao copiar. Tente novamente.");
    });
};

function render() {
    if ($('statusValue')) $('statusValue').textContent = data.status;
    if ($('bannerSmall')) $('bannerSmall').textContent = data.banner.small;
    if ($('bannerMain')) $('bannerMain').textContent = data.banner.main;
    if ($('bannerSub')) $('bannerSub').textContent = data.banner.sub;
    if ($('welcomeTitle')) $('welcomeTitle').textContent = data.welcome.title;
    if ($('welcomeSub')) $('welcomeSub').textContent = data.welcome.sub;
    if ($('welcomeText')) $('welcomeText').innerHTML = data.welcome.text;
    if ($('promoTitle')) $('promoTitle').textContent = data.promo.title;
    if ($('promoText')) $('promoText').innerHTML = data.promo.text;
    if ($('linksText')) $('linksText').textContent = data.links.text;
    if ($('tosText')) $('tosText').innerHTML = data.tos;
    if ($('footerText')) $('footerText').textContent = data.footer;
    renderLinks();
    renderPrices();
    renderExtras();
    renderGallery();
}

function renderLinks() {
    var c = $('socialGrid');
    if (!c) return;
    c.innerHTML = '';
    data.links.items.forEach(function(l) {
        var a = document.createElement('a');
        a.className = 'social-btn ' + sanitize(l.color);
        a.href = l.url || '#';
        if (l.url) a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = l.icon;
        c.appendChild(a);
    });
}

function renderPrices() {
    var c = $('pricesList');
    if (!c) return;
    c.innerHTML = '';
    data.prices.forEach(function(p) {
        var d = document.createElement('div');
        d.className = 'menu-item';
        var n = document.createElement('span');
        n.className = 'menu-item-name';
        n.textContent = p.name;
        var pr = document.createElement('span');
        pr.className = 'menu-item-price';
        pr.textContent = p.price;
        d.appendChild(n);
        d.appendChild(pr);
        c.appendChild(d);
    });
}

function renderExtras() {
    var c = $('extrasList');
    if (!c) return;
    c.innerHTML = '';
    data.extras.forEach(function(e) {
        var d = document.createElement('div');
        d.className = 'menu-item';
        var n = document.createElement('span');
        n.className = 'menu-item-name';
        n.textContent = e.name;
        var pr = document.createElement('span');
        pr.className = 'menu-item-price';
        pr.textContent = e.price;
        d.appendChild(n);
        d.appendChild(pr);
        c.appendChild(d);
    });
}

function renderGallery() {
    var c = $('galleryGrid');
    if (!c) return;
    c.innerHTML = '';
    data.gallery.forEach(function(g, i) {
        var rot = (Math.random() * 6) - 3;
        var slide = document.createElement('div');
        slide.className = 'gallery-slide';
        slide.style.transform = 'rotate(' + rot + 'deg)';
        slide.onclick = function() { editGalleryItem(i); };
        if (g.data) {
            var img = document.createElement('img');
            img.src = g.data;
            img.onclick = function(e) {
                if (!editorMode) {
                    e.stopPropagation();
                    openLightbox(g.data);
                }
            };
            slide.appendChild(img);
        } else {
            var ph = document.createElement('div');
            ph.className = 'placeholder';
            ph.textContent = 'ARTE ' + (i + 1);
            slide.appendChild(ph);
        }
        var cap = document.createElement('div');
        cap.className = 'gallery-caption';
        cap.textContent = 'Fig. ' + (i + 1);
        slide.appendChild(cap);
        c.appendChild(slide);
    });
}

function openLightbox(src) {
    var lb = $('lightbox');
    var img = $('lightboxImg');
    if (lb && img) {
        img.src = src;
        lb.classList.add('show');
    }
}

window.closeLightbox = function(e) {
    if (e && e.target.tagName === 'IMG') return;
    var lb = $('lightbox');
    if (lb) lb.classList.remove('show');
};

var editorMode = false;
var keySeq = [];
var code = ['ArrowUp', 'ArrowDown', 'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown'];

document.addEventListener('keydown', function(e) {
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) || (e.ctrlKey && ['U', 'S', 'P'].includes(e.key))) {
        e.preventDefault();
        return false;
    }
    keySeq.push(e.key);
    if (keySeq.length > 6) keySeq.shift();
    if (keySeq.join(',') === code.join(',')) {
        toggleEditor();
        keySeq = [];
    }
});

window.toggleEditor = function() {
    editorMode = !editorMode;
    document.body.classList.toggle('editor-active', editorMode);
    var ind = $('editorIndicator');
    if (ind) ind.classList.toggle('active', editorMode);
    showToast(editorMode ? 'Modo editor ativado' : 'Modo visualização');
};

window.showPage = function(page) {
    document.querySelectorAll('.page-content').forEach(function(p) { p.classList.remove('active'); });
    document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
    var pg = $(page + 'Page');
    if (pg) pg.classList.add('active');
    var nav = document.querySelector('[data-page="' + page + '"]');
    if (nav) nav.classList.add('active');
    setTimeout(function() {
        document.querySelectorAll('#' + page + 'Page [data-anim]').forEach(function(el) {
            el.classList.add('show');
        });
    }, 100);
};

function openModal(title, content, buttons) {
    $('modalTitle').textContent = title;
    $('modalContent').innerHTML = content;
    $('modalButtons').innerHTML = buttons;
    $('modalOverlay').classList.add('active');
}

window.closeModal = function() {
    $('modalOverlay').classList.remove('active');
};

$('modalOverlay').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

function richEditor(id, content) {
    return '<div style="border:2px solid #ccc;border-radius:6px;overflow:hidden"><div style="background:#eee;padding:8px;border-bottom:1px solid #ccc;display:flex;gap:5px"><button type="button" onclick="document.execCommand(\'bold\')" style="padding:5px 10px;font-weight:bold;border:1px solid #ccc;border-radius:3px;background:#fff;cursor:pointer">B</button><button type="button" onclick="document.execCommand(\'italic\')" style="padding:5px 10px;font-style:italic;border:1px solid #ccc;border-radius:3px;background:#fff;cursor:pointer">I</button><button type="button" onclick="document.execCommand(\'insertUnorderedList\')" style="padding:5px 10px;border:1px solid #ccc;border-radius:3px;background:#fff;cursor:pointer">• Lista</button></div><div id="' + id + '" contenteditable="true" style="padding:15px;min-height:100px;background:#fff;outline:none;cursor:text">' + content + '</div></div>';
}

window.editBanner = function(e) {
    if (!editorMode) return;
    e.stopPropagation();
    openModal('Banner',
        '<div class="modal-form-group"><label class="modal-label">Nome Pequeno</label><input class="modal-input" id="inBS" value="' + sanitize(data.banner.small) + '"></div>' +
        '<div class="modal-form-group"><label class="modal-label">Título Principal</label><input class="modal-input" id="inBM" value="' + sanitize(data.banner.main) + '"></div>' +
        '<div class="modal-form-group"><label class="modal-label">Subtítulo</label><input class="modal-input" id="inBSub" value="' + sanitize(data.banner.sub) + '"></div>',
        '<button class="modal-btn cancel" onclick="closeModal()">Cancelar</button><button class="modal-btn save" onclick="saveBanner()">Salvar</button>'
    );
};

window.saveBanner = function() {
    data.banner.small = $('inBS').value;
    data.banner.main = $('inBM').value;
    data.banner.sub = $('inBSub').value;
    saveData();
    render();
    closeModal();
};

window.editStatus = function(e) {
    if (!editorMode) return;
    e.stopPropagation();
    openModal('Status',
        '<div class="modal-form-group"><label class="modal-label">Status</label><input class="modal-input" id="inStat" value="' + sanitize(data.status) + '"></div>',
        '<button class="modal-btn cancel" onclick="closeModal()">Cancelar</button><button class="modal-btn save" onclick="saveStatus()">Salvar</button>'
    );
};

window.saveStatus = function() {
    data.status = $('inStat').value;
    saveData();
    render();
    closeModal();
};

window.editWelcome = function(e) {
    if (!editorMode) return;
    e.stopPropagation();
    openModal('Bem-vindo',
        '<div class="modal-form-group"><label class="modal-label">Título</label><input class="modal-input" id="inWT" value="' + sanitize(data.welcome.title) + '"></div>' +
        '<div class="modal-form-group"><label class="modal-label">Subtítulo</label><input class="modal-input" id="inWS" value="' + sanitize(data.welcome.sub) + '"></div>' +
        '<label class="modal-label">Texto</label>' + richEditor('inWTxt', data.welcome.text),
        '<button class="modal-btn cancel" onclick="closeModal()">Cancelar</button><button class="modal-btn save" onclick="saveWelcome()">Salvar</button>'
    );
};

window.saveWelcome = function() {
    data.welcome.title = $('inWT').value;
    data.welcome.sub = $('inWS').value;
    data.welcome.text = $('inWTxt').innerHTML;
    saveData();
    render();
    closeModal();
};

window.editPromo = function(e) {
    if (!editorMode) return;
    e.stopPropagation();
    openModal('Promoção',
        '<div class="modal-form-group"><label class="modal-label">Título</label><input class="modal-input" id="inPT" value="' + sanitize(data.promo.title) + '"></div>' +
        '<label class="modal-label">Texto</label>' + richEditor('inPTxt', data.promo.text),
        '<button class="modal-btn cancel" onclick="closeModal()">Cancelar</button><button class="modal-btn save" onclick="savePromo()">Salvar</button>'
    );
};

window.savePromo = function() {
    data.promo.title = $('inPT').value;
    data.promo.text = $('inPTxt').innerHTML;
    saveData();
    render();
    closeModal();
};

window.editLinks = function(e) {
    if (!editorMode) return;
    e.stopPropagation();
    window.renderLinksModal = function() {
        var h = '<div class="modal-links-list">';
        data.links.items.forEach(function(l, i) {
            h += '<div class="modal-link-item">' +
                '<input class="modal-link-icon" id="lIcon' + i + '" value="' + sanitize(l.icon) + '">' +
                '<select class="modal-link-select" id="lColor' + i + '">' +
                '<option value="red"' + (l.color === 'red' ? ' selected' : '') + '>Vermelho</option>' +
                '<option value="blue"' + (l.color === 'blue' ? ' selected' : '') + '>Azul</option>' +
                '<option value="yellow"' + (l.color === 'yellow' ? ' selected' : '') + '>Amarelo</option>' +
                '<option value="black"' + (l.color === 'black' ? ' selected' : '') + '>Preto</option>' +
                '<option value="white"' + (l.color === 'white' ? ' selected' : '') + '>Branco</option>' +
                '</select>' +
                '<input class="modal-link-url" id="lUrl' + i + '" value="' + sanitize(l.url) + '" placeholder="https://...">' +
                '<button class="modal-btn-remove" onclick="rmLink(' + i + ')">✕</button>' +
                '</div>';
        });
        h += '</div><button class="modal-add-link-btn" onclick="addLink()">+ Adicionar Rede</button>';
        return h;
    };
    openModal('Redes Sociais',
        '<div class="modal-form-group"><label class="modal-label">Texto</label><input class="modal-input" id="inLT" value="' + sanitize(data.links.text) + '"></div>' +
        '<label class="modal-label">Lista de Links</label><div id="linksContainer">' + window.renderLinksModal() + '</div>',
        '<button class="modal-btn cancel" onclick="closeModal()">Cancelar</button><button class="modal-btn save" onclick="saveLinks()">Salvar</button>'
    );
};

window.addLink = function() {
    updateLinksTemp();
    data.links.items.push({ icon: "?", color: "red", url: "" });
    $('linksContainer').innerHTML = window.renderLinksModal();
};

window.rmLink = function(i) {
    updateLinksTemp();
    data.links.items.splice(i, 1);
    $('linksContainer').innerHTML = window.renderLinksModal();
};

function updateLinksTemp() {
    for (var i = 0; i < data.links.items.length; i++) {
        var ico = $('lIcon' + i);
        var col = $('lColor' + i);
        var url = $('lUrl' + i);
        if (ico && col && url) {
            data.links.items[i].icon = ico.value;
            data.links.items[i].color = col.value;
            data.links.items[i].url = url.value;
        }
    }
}

window.saveLinks = function() {
    data.links.text = $('inLT').value;
    updateLinksTemp();
    saveData();
    render();
    closeModal();
};

window.editPrices = function(e) {
    if (!editorMode) return;
    e.stopPropagation();
    var h = '<div class="modal-links-list">';
    data.prices.forEach(function(p, i) {
        h += '<div class="modal-link-item"><input class="modal-link-url" id="pN' + i + '" value="' + sanitize(p.name) + '" placeholder="Nome"><input style="width:100px" class="modal-link-icon" id="pP' + i + '" value="' + sanitize(p.price) + '" placeholder="Preço"><button class="modal-btn-remove" onclick="rmPrice(' + i + ')">✕</button></div>';
    });
    h += '</div>';
    openModal('Preços', h, '<button class="modal-btn cancel" onclick="closeModal()">Cancelar</button><button class="modal-btn save" onclick="savePrices()">Salvar</button>');
};

window.savePrices = function() {
    data.prices.forEach(function(p, i) {
        var n = $('pN' + i);
        var pr = $('pP' + i);
        if (n && pr) {
            p.name = n.value;
            p.price = pr.value;
        }
    });
    saveData();
    render();
    closeModal();
};

window.rmPrice = function(i) {
    data.prices.splice(i, 1);
    saveData();
    render();
    closeModal();
};

window.addPrice = function() {
    data.prices.push({ name: "Novo Serviço", price: "R$0" });
    saveData();
    render();
};

window.editExtras = function(e) {
    if (!editorMode) return;
    e.stopPropagation();
    var h = '<div class="modal-links-list">';
    data.extras.forEach(function(ex, i) {
        h += '<div class="modal-link-item"><input class="modal-link-url" id="eN' + i + '" value="' + sanitize(ex.name) + '" placeholder="Nome"><input style="width:100px" class="modal-link-icon" id="eP' + i + '" value="' + sanitize(ex.price) + '" placeholder="Preço"><button class="modal-btn-remove" onclick="rmExtra(' + i + ')">✕</button></div>';
    });
    h += '</div>';
    openModal('Extras', h, '<button class="modal-btn cancel" onclick="closeModal()">Cancelar</button><button class="modal-btn save" onclick="saveExtras()">Salvar</button>');
};

window.saveExtras = function() {
    data.extras.forEach(function(ex, i) {
        var n = $('eN' + i);
        var pr = $('eP' + i);
        if (n && pr) {
            ex.name = n.value;
            ex.price = pr.value;
        }
    });
    saveData();
    render();
    closeModal();
};

window.rmExtra = function(i) {
    data.extras.splice(i, 1);
    saveData();
    render();
    closeModal();
};

window.addExtra = function() {
    data.extras.push({ name: "Extra", price: "+R$0" });
    saveData();
    render();
};

window.editTos = function(e) {
    if (!editorMode) return;
    e.stopPropagation();
    openModal('Termos de Uso', richEditor('inTos', data.tos), '<button class="modal-btn cancel" onclick="closeModal()">Cancelar</button><button class="modal-btn save" onclick="saveTos()">Salvar</button>');
};

window.saveTos = function() {
    data.tos = $('inTos').innerHTML;
    saveData();
    render();
    closeModal();
};

window.editGalleryItem = function(i) {
    if (!editorMode) return;
    var current = data.gallery[i] && data.gallery[i].data ? '<img src="' + data.gallery[i].data + '" style="max-width:150px;margin-top:10px;border-radius:4px">' : '';
    openModal('Editar Imagem',
        '<label class="modal-label">Selecionar arquivo (máx 2MB)</label>' +
        '<input class="modal-input" type="file" accept="image/*" onchange="previewGal(this)">' +
        '<div id="gPrev" style="margin-top:15px;text-align:center">' + current + '</div>',
        '<button class="modal-btn delete" onclick="rmGal(' + i + ')">Excluir</button><button class="modal-btn cancel" onclick="closeModal()">Cancelar</button><button class="modal-btn save" onclick="saveGal(' + i + ')">Salvar</button>'
    );
};

window.previewGal = function(inp) {
    if (inp.files && inp.files[0]) {
        var file = inp.files[0];
        if (!file.type.startsWith('image/')) {
            showToast('Selecione apenas imagens', 'error');
            inp.value = '';
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            showToast('Imagem muito grande (máx 2MB)', 'error');
            inp.value = '';
            return;
        }
        var r = new FileReader();
        r.onload = function(e) {
            $('gPrev').innerHTML = '<img src="' + e.target.result + '" style="max-width:150px;border-radius:4px">';
            $('gPrev').dataset.img = e.target.result;
        };
        r.readAsDataURL(file);
    }
};

window.saveGal = function(i) {
    var prev = $('gPrev');
    if (prev && prev.dataset.img) data.gallery[i].data = prev.dataset.img;
    saveData();
    render();
    closeModal();
};

window.rmGal = function(i) {
    data.gallery.splice(i, 1);
    saveData();
    render();
    closeModal();
};

window.addGalleryItem = function() {
    data.gallery.push({ title: "", data: "" });
    saveData();
    render();
};

document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
document.addEventListener('dragstart', function(e) { e.preventDefault(); });

loadData();

})();