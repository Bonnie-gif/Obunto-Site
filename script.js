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
        }, 500);
    }
}, 100);

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

function $(id) { return document.getElementById(id); }

function sanitize(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

var data = {};

function loadData() {
    fetch('/api/data')
        .then(function(response) { return response.json(); })
        .then(function(json) {
            data = json;
            render();
        })
        .catch(function(err) {
            console.error("Erro ao carregar dados:", err);
            showToast("Erro de conexão", "error");
        });
}

window.saveGlobal = function() {
    var btn = document.querySelector('#editorIndicator button');
    var originalText = btn.textContent;
    btn.textContent = "SALVANDO...";
    btn.disabled = true;

    fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(function(response) { return response.json(); })
    .then(function(result) {
        if (result.success) {
            showToast('SITE ATUALIZADO PARA TODOS! 🎉', 'success');
            toggleEditor();
        } else {
            showToast('Erro no servidor', 'error');
        }
    })
    .catch(function(err) {
        showToast('Erro de rede', 'error');
        console.error(err);
    })
    .finally(function() {
        btn.textContent = originalText;
        btn.disabled = false;
    });
};

function render() {
    if (!data.banner) return;

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
    if (data.links && data.links.items) {
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
}

function renderPrices() {
    var c = $('pricesList');
    if (!c) return;
    c.innerHTML = '';
    if (data.prices) {
        data.prices.forEach(function(p) {
            var d = document.createElement('div');
            d.className = 'menu-item';
            d.innerHTML = '<span class="menu-item-name">' + sanitize(p.name) + '</span><span class="menu-item-price">' + sanitize(p.price) + '</span>';
            c.appendChild(d);
        });
    }
}

function renderExtras() {
    var c = $('extrasList');
    if (!c) return;
    c.innerHTML = '';
    if (data.extras) {
        data.extras.forEach(function(e) {
            var d = document.createElement('div');
            d.className = 'menu-item';
            d.innerHTML = '<span class="menu-item-name">' + sanitize(e.name) + '</span><span class="menu-item-price">' + sanitize(e.price) + '</span>';
            c.appendChild(d);
        });
    }
}

function renderGallery() {
    var c = $('galleryGrid');
    if (!c) return;
    c.innerHTML = '';
    if (data.gallery) {
        data.gallery.forEach(function(g, i) {
            var d = document.createElement('div');
            d.className = 'gallery-slide';
            d.style.transform = 'rotate(' + ((Math.random() * 6) - 3) + 'deg)';
            d.onclick = function() { editGalleryItem(i); };
            
            var content = g.data 
                ? '<img src="' + g.data + '" onclick="if(!editorMode){event.stopPropagation();openLightbox(\'' + g.data + '\')}">'
                : '<div class="placeholder">ARTE ' + (i + 1) + '</div>';
                
            d.innerHTML = content + '<div class="gallery-caption">Fig. ' + (i + 1) + '</div>';
            c.appendChild(d);
        });
    }
}

var editorMode = false;
var keySeq = [];
var code = ['ArrowUp', 'ArrowDown', 'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown'];

document.addEventListener('keydown', function(e) {
    if (!editorMode) keySeq.push(e.key);
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
    if (ind) {
        if (editorMode) ind.classList.add('active');
        else ind.classList.remove('active');
    }
    showToast(editorMode ? 'Modo ADMIN ativado' : 'Modo visualização');
};

window.showPage = function(page) {
    document.querySelectorAll('.page-content').forEach(function(p) { p.classList.remove('active'); });
    document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
    var pg = $(page + 'Page');
    if (pg) pg.classList.add('active');
    var nav = document.querySelector('[data-page="' + page + '"]');
    if (nav) nav.classList.add('active');
    setTimeout(function() {
        var pageEl = document.getElementById(page + 'Page');
        if (pageEl) {
            pageEl.querySelectorAll('[data-anim]').forEach(function(el) {
                el.classList.add('show');
            });
        }
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
    return '<div style="border:2px solid #ccc;border-radius:6px;overflow:hidden"><div style="background:#eee;padding:5px"><button onclick="document.execCommand(\'bold\')"><b>B</b></button> <button onclick="document.execCommand(\'italic\')"><i>I</i></button></div><div id="' + id + '" contenteditable="true" style="padding:15px;min-height:100px;background:#fff;outline:none">' + content + '</div></div>';
}

window.editBanner = function(e) {
    if (!editorMode) return;
    e.stopPropagation();
    openModal('Banner', '<label>Nome Peq.</label><input class="modal-input" id="inBS" value="' + sanitize(data.banner.small) + '"><label>Título</label><input class="modal-input" id="inBM" value="' + sanitize(data.banner.main) + '"><label>Subtítulo</label><input class="modal-input" id="inBSub" value="' + sanitize(data.banner.sub) + '">', '<button class="modal-btn cancel" onclick="closeModal()">Cancelar</button><button class="modal-btn save" onclick="saveDataLocal(\'banner\')">Confirmar</button>');
};

window.editStatus = function(e) {
    if (!editorMode) return;
    e.stopPropagation();
    openModal('Status', '<label>Status</label><input class="modal-input" id="inStat" value="' + sanitize(data.status) + '">', '<button class="modal-btn cancel" onclick="closeModal()">Cancelar</button><button class="modal-btn save" onclick="saveDataLocal(\'status\')">Confirmar</button>');
};

window.editWelcome = function(e) {
    if (!editorMode) return;
    e.stopPropagation();
    openModal('Bem-vindo', '<label>Título</label><input class="modal-input" id="inWT" value="' + sanitize(data.welcome.title) + '"><label>Sub</label><input class="modal-input" id="inWS" value="' + sanitize(data.welcome.sub) + '"><label>Texto</label>' + richEditor('inWTxt', data.welcome.text), '<button class="modal-btn cancel" onclick="closeModal()">Cancelar</button><button class="modal-btn save" onclick="saveDataLocal(\'welcome\')">Confirmar</button>');
};

window.editPromo = function(e) {
    if (!editorMode) return;
    e.stopPropagation();
    openModal('Promoção', '<label>Título</label><input class="modal-input" id="inPT" value="' + sanitize(data.promo.title) + '"><label>Texto</label>' + richEditor('inPTxt', data.promo.text), '<button class="modal-btn cancel" onclick="closeModal()">Cancelar</button><button class="modal-btn save" onclick="saveDataLocal(\'promo\')">Confirmar</button>');
};

window.editTos = function(e) {
    if (!editorMode) return;
    e.stopPropagation();
    openModal('Termos', richEditor('inTos', data.tos), '<button class="modal-btn cancel" onclick="closeModal()">Cancelar</button><button class="modal-btn save" onclick="saveDataLocal(\'tos\')">Confirmar</button>');
};

window.saveDataLocal = function(type) {
    if (type === 'banner') {
        data.banner.small = $('inBS').value;
        data.banner.main = $('inBM').value;
        data.banner.sub = $('inBSub').value;
    }
    if (type === 'status') data.status = $('inStat').value;
    if (type === 'welcome') {
        data.welcome.title = $('inWT').value;
        data.welcome.sub = $('inWS').value;
        data.welcome.text = $('inWTxt').innerHTML;
    }
    if (type === 'promo') {
        data.promo.title = $('inPT').value;
        data.promo.text = $('inPTxt').innerHTML;
    }
    if (type === 'tos') data.tos = $('inTos').innerHTML;
    
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
    openModal('Redes Sociais', '<div class="modal-form-group"><label class="modal-label">Texto</label><input class="modal-input" id="inLT" value="' + sanitize(data.links.text) + '"></div><label class="modal-label">Lista de Links</label><div id="linksContainer">' + window.renderLinksModal() + '</div>', '<button class="modal-btn cancel" onclick="closeModal()">Cancelar</button><button class="modal-btn save" onclick="saveLinks()">Confirmar</button>');
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
    openModal('Preços', h, '<button class="modal-btn cancel" onclick="closeModal()">Cancelar</button><button class="modal-btn save" onclick="savePrices()">Confirmar</button>');
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
    render();
    closeModal();
};

window.rmPrice = function(i) {
    data.prices.splice(i, 1);
    render();
    closeModal();
};

window.addPrice = function() {
    data.prices.push({ name: "Novo Serviço", price: "R$0" });
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
    openModal('Extras', h, '<button class="modal-btn cancel" onclick="closeModal()">Cancelar</button><button class="modal-btn save" onclick="saveExtras()">Confirmar</button>');
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
    render();
    closeModal();
};

window.rmExtra = function(i) {
    data.extras.splice(i, 1);
    render();
    closeModal();
};

window.addExtra = function() {
    data.extras.push({ name: "Extra", price: "+R$0" });
    render();
};

window.editGalleryItem = function(i) {
    if (!editorMode) return;
    openModal('Galeria', '<input class="modal-input" type="file" onchange="previewGal(this)"><div id="gPrev" style="margin-top:10px;text-align:center">' + (data.gallery[i].data ? '<img src="' + data.gallery[i].data + '" style="max-width:100px">' : '') + '</div>', '<button class="modal-btn delete" onclick="data.gallery.splice(' + i + ',1);render();closeModal()">Excluir</button><button class="modal-btn save" onclick="saveGal(' + i + ')">Confirmar</button>');
};

window.addGalleryItem = function() {
    data.gallery.push({ title: "", data: "" });
    render();
};

window.previewGal = function(inp) {
    if (inp.files && inp.files[0]) {
        var r = new FileReader();
        r.onload = function(e) {
            $('gPrev').innerHTML = '<img src="' + e.target.result + '" style="max-width:100px">';
            $('gPrev').dataset.d = e.target.result;
        };
        r.readAsDataURL(inp.files[0]);
    }
};

window.saveGal = function(i) {
    if ($('gPrev').dataset.d) data.gallery[i].data = $('gPrev').dataset.d;
    render();
    closeModal();
};

window.openLightbox = function(src) {
    $('lightboxImg').src = src;
    $('lightbox').classList.add('show');
};

window.closeLightbox = function(e) {
    if (e.target.tagName !== 'IMG') $('lightbox').classList.remove('show');
};

loadData();

})();