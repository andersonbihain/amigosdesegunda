// Carrega jogos e nomes para o formulário
let gamesAdmin = [];
let playerOptionsAdmin = [];
const ADMIN_PASSWORD = 'mudeseusenhaaqui'; // troque aqui a senha

document.addEventListener('DOMContentLoaded', () => {
    initLock();
});

function initLock() {
    const lockForm = document.getElementById('admin-lock-form');
    const lockInput = document.getElementById('admin-lock-input');
    const errorEl = document.getElementById('admin-lock-error');
    const stored = sessionStorage.getItem('admin_unlocked');
    if (stored === '1') {
        unlock();
        return;
    }
    lockForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (lockInput.value === ADMIN_PASSWORD) {
            sessionStorage.setItem('admin_unlocked', '1');
            unlock();
        } else {
            errorEl.textContent = 'Senha incorreta.';
        }
    });
}

function unlock() {
    const lock = document.getElementById('admin-lock');
    const content = document.getElementById('admin-content');
    if (lock) lock.classList.add('hidden');
    if (content) content.classList.remove('hidden');
    loadGamesAdmin();
}

function loadGamesAdmin() {
    fetch('games.json')
        .then(res => res.json())
        .then(data => {
            gamesAdmin = data;
            rebuildPlayerOptionsAdmin(data);
            initFormAdmin();
        })
        .catch(err => console.error('Erro ao carregar jogos:', err));
}

function standardizeAdmin(name) {
    if (!name) return 'Desconhecido';
    return name.toString().trim();
}

function rebuildPlayerOptionsAdmin(games) {
    const set = new Set();
    games.forEach(g => {
        set.add(standardizeAdmin(g.cinza.goleiro));
        set.add(standardizeAdmin(g.branco.goleiro));
        g.cinza.linha.forEach(n => set.add(standardizeAdmin(n)));
        g.branco.linha.forEach(n => set.add(standardizeAdmin(n)));
    });
    playerOptionsAdmin = Array.from(set).sort();
    fillSelect('add-gk-cinza');
    fillSelect('add-gk-branco');
    fillSelect('add-line-cinza', true);
    fillSelect('add-line-branco', true);
}

function fillSelect(id, multiple=false) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = playerOptionsAdmin.map(p => `<option value="${p}">${p}</option>`).join('');
    if (multiple) el.setAttribute('multiple', 'multiple');
}

function initFormAdmin() {
    const form = document.getElementById('add-game-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const statusEl = document.getElementById('add-game-status');
        const dateVal = document.getElementById('add-date').value;
        const scoreC = parseInt(document.getElementById('add-score-cinza').value, 10) || 0;
        const scoreB = parseInt(document.getElementById('add-score-branco').value, 10) || 0;
        const gkC = document.getElementById('add-gk-cinza').value;
        const gkB = document.getElementById('add-gk-branco').value;
        const lineC = Array.from(document.getElementById('add-line-cinza').selectedOptions).map(o => o.value);
        const lineB = Array.from(document.getElementById('add-line-branco').selectedOptions).map(o => o.value);

        if (!dateVal || lineC.length === 0 || lineB.length === 0) {
            statusEl.textContent = 'Preencha data e selecione pelo menos um jogador em cada linha.';
            return;
        }

        const [yyyy, mm, dd] = dateVal.split('-');
        const dataFmt = `${dd}/${mm}`;
        const nextId = Math.max(...gamesAdmin.map(g => g.id), 0) + 1;

        const newGame = {
            id: nextId,
            data: dataFmt,
            cinza: { goleiro: gkC, linha: lineC },
            branco: { goleiro: gkB, linha: lineB },
            placar: { cinza: scoreC, branco: scoreB }
        };

        gamesAdmin.push(newGame);
        rebuildPlayerOptionsAdmin(gamesAdmin);
        renderPreview(newGame);
        statusEl.textContent = `Jogo ${nextId} criado (não persiste no arquivo). Copie o JSON abaixo para salvar.`;
        form.reset();
    });
}

function renderPreview(game) {
    const previewEl = document.getElementById('json-preview');
    if (!previewEl) return;
    previewEl.textContent = JSON.stringify(game, null, 2);
}
