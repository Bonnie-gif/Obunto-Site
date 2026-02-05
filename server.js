const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 10000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(__dirname));

const defaultData = {
    banner: { small: "ARTIST NAME", main: "COMISSÕES", sub: "Ilustração & Design" },
    status: "ABERTO",
    welcome: { title: "Bem-vindo!", sub: "Meu espaço criativo", text: "Olá! Este é meu portfólio." },
    promo: { title: "Aviso!", text: "Slots limitados para este mês!" },
    links: { text: "Me siga nas redes!", items: [] },
    tos: "<h3>Termos</h3><p>Edite seus termos aqui.</p>",
    prices: [],
    extras: [],
    gallery: [],
    footer: "Obrigado pela visita!"
};

app.get('/api/data', (req, res) => {
    if (fs.existsSync(DATA_FILE)) {
        try {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            res.json(JSON.parse(data));
        } catch (e) {
            res.json(defaultData);
        }
    } else {
        res.json(defaultData);
    }
});

app.post('/api/save', (req, res) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 4));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {});