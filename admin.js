const SUPABASE_URL = 'https://lfwzjyiaqdngbcecaouu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_oCgYlTOm2NGBNZ7YhpMi2w_I7E2V_Fn';
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

let gamesAdmin = [];
let playersAdmin = [];

document.addEventListener('DOMContentLoaded', () => {
    initAdminAuth();
});

function initAdminAuth() {
    const lockForm = document.getElementById('admin-lock-form');
    const lockEmail = document.getElementById('admin-lock-email');
    const lockInput = document.getElementById('admin-lock-input');
    const errorEl = document.getElementById('admin-lock-error');
    if (!lockForm) return;
    if (!supabaseClient) {
        if (errorEl) errorEl.textContent = 'Falha ao carregar Supabase. Atualize a pagina.';
        return;
    }

    supabaseClient.auth.getSession().then(({ data }) => {
        if (data?.session) {
            unlock();
        }
    });

    lockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (errorEl) errorEl.textContent = '';
        const email = lockEmail.value.trim();
        const password = lockInput.value;
        if (!email || !password) {
            if (errorEl) errorEl.textContent = 'Informe e-mail e senha.';
            return;
        }
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
            if (errorEl) errorEl.textContent = error.message || 'Falha ao entrar. Verifique os dados.';
            console.error('Auth error:', error);
            return;
        }
        unlock();
    });
}

function unlock() {
    const lock = document.getElementById('admin-lock');
    const content = document.getElementById('admin-content');
    if (lock) lock.classList.add('hidden');
    if (content) content.classList.remove('hidden');
    initLogout();
    initRecomputeRatings();
    loadAdminData();
    initAddGameForm();
    initAddPlayerForm();
    initEditPlayerForm();
    initRemovePlayer();
}

function initLogout() {
    const btn = document.getElementById('admin-logout');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.reload();
    });
}

function initRecomputeRatings() {
    const btn = document.getElementById('recompute-ratings');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        const statusEl = document.getElementById('recompute-status');
        if (statusEl) statusEl.textContent = 'Recalculando ratings...';
        await recomputeRatingsAndUpdate();
        await loadAdminData();
        if (statusEl) statusEl.textContent = 'Ratings atualizados.';
    });
}

async function maybeAutoRecomputeRatings() {
    if (gamesAdmin.length === 0 || playersAdmin.length === 0) return;
    const hasAnyRating = playersAdmin.some(p => p.rating_linha !== null || p.rating_gk !== null);
    if (hasAnyRating) return;
    const statusEl = document.getElementById('recompute-status');
    if (statusEl) statusEl.textContent = 'Recalculando ratings iniciais...';
    await recomputeRatingsAndUpdate();
    await loadAdminData();
    if (statusEl) statusEl.textContent = 'Ratings iniciais calculados.';
}

async function loadAdminData() {
    const [{ data: games, error: gamesError }, { data: players, error: playersError }] = await Promise.all([
        supabaseClient.from('games').select('*').order('id', { ascending: true }),
        supabaseClient.from('players').select('*').order('nome', { ascending: true })
    ]);
    if (gamesError) console.error('Erro ao carregar jogos:', gamesError);
    if (playersError) console.error('Erro ao carregar jogadores:', playersError);
    gamesAdmin = Array.isArray(games) ? games : [];
    playersAdmin = Array.isArray(players) ? players : [];
    rebuildPlayerOptionsAdmin();
    rebuildRemovePlayerOptions();
    rebuildEditPlayerOptions();
    maybeAutoRecomputeRatings();
}

function rebuildPlayerOptionsAdmin() {
    const names = playersAdmin.map(p => p.nome).sort();
    fillSelect('add-gk-cinza', names);
    fillSelect('add-gk-branco', names);
    fillSelect('add-line-cinza', names, true);
    fillSelect('add-line-branco', names, true);
}

function rebuildRemovePlayerOptions() {
    const select = document.getElementById('remove-player-select');
    if (!select) return;
    select.innerHTML = playersAdmin
        .map(p => `<option value="${p.id}">${p.nome}</option>`)
        .join('');
}

function rebuildEditPlayerOptions() {
    const select = document.getElementById('edit-player-select');
    if (!select) return;
    select.innerHTML = playersAdmin
        .map(p => `<option value="${p.id}">${p.nome}</option>`)
        .join('');
    if (playersAdmin.length > 0) {
        select.value = playersAdmin[0].id;
        fillEditPlayerForm(playersAdmin[0]);
    }
}

function fillSelect(id, options, multiple = false) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = options.map(p => `<option value="${p}">${p}</option>`).join('');
    if (multiple) el.setAttribute('multiple', 'multiple');
}

function initAddGameForm() {
    const form = document.getElementById('add-game-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const statusEl = document.getElementById('add-game-status');
        if (statusEl) statusEl.textContent = '';
        const dateVal = document.getElementById('add-date').value;
        const scoreC = parseInt(document.getElementById('add-score-cinza').value, 10) || 0;
        const scoreB = parseInt(document.getElementById('add-score-branco').value, 10) || 0;
        const gkC = document.getElementById('add-gk-cinza').value;
        const gkB = document.getElementById('add-gk-branco').value;
        const lineC = Array.from(document.getElementById('add-line-cinza').selectedOptions).map(o => o.value);
        const lineB = Array.from(document.getElementById('add-line-branco').selectedOptions).map(o => o.value);

        if (!dateVal || lineC.length === 0 || lineB.length === 0) {
            if (statusEl) statusEl.textContent = 'Preencha data e selecione pelo menos um jogador em cada linha.';
            return;
        }

        const [yyyy, mm, dd] = dateVal.split('-');
        const dataFmt = `${dd}/${mm}/${yyyy}`;
        const newGame = {
            data: dataFmt,
            cinza: { goleiro: gkC, linha: lineC },
            branco: { goleiro: gkB, linha: lineB },
            placar: { cinza: scoreC, branco: scoreB }
        };

        const { error } = await supabaseClient.from('games').insert(newGame);
        if (error) {
            if (statusEl) statusEl.textContent = 'Erro ao salvar jogo.';
            console.error(error);
            return;
        }
        await loadAdminData();
        await recomputeRatingsAndUpdate();
        if (statusEl) statusEl.textContent = 'Jogo salvo e ratings atualizados.';
        form.reset();
    });
}

function calculateInitialRating(phys, tech, tactic) {
    const weighted = (tech * 0.45) + (phys * 0.35) + (tactic * 0.20);
    return Math.max(0, Math.min(10, (weighted / 5) * 10));
}

function initAddPlayerForm() {
    const form = document.getElementById('add-player-form');
    if (!form) return;

    const nameInput = document.getElementById('add-player-name');
    const primarySelect = document.getElementById('add-player-pos-primary');
    const secondarySelect = document.getElementById('add-player-pos-secondary');
    const gkInput = document.getElementById('add-player-gk');
    const physSelect = document.getElementById('add-player-phys');
    const techSelect = document.getElementById('add-player-tech');
    const tacticSelect = document.getElementById('add-player-tactic');
    const ratingPreview = document.getElementById('add-player-rating-preview');
    const statusEl = document.getElementById('add-player-status');

    const updatePreview = () => {
        const phys = parseInt(physSelect.value, 10) || 1;
        const tech = parseInt(techSelect.value, 10) || 1;
        const tactic = parseInt(tacticSelect.value, 10) || 1;
        const rating = calculateInitialRating(phys, tech, tactic);
        ratingPreview.textContent = rating.toFixed(1);
    };
    [physSelect, techSelect, tacticSelect].forEach(select => {
        select.addEventListener('change', updatePreview);
    });
    updatePreview();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (statusEl) statusEl.textContent = '';
        const rawName = nameInput.value.trim();
        if (!rawName) {
            if (statusEl) statusEl.textContent = 'Informe o nome do atleta.';
            return;
        }
        if (playersAdmin.some(p => p.nome.toLowerCase() === rawName.toLowerCase())) {
            if (statusEl) statusEl.textContent = 'Esse atleta ja existe.';
            return;
        }

        const primary = primarySelect.value;
        const secondary = Array.from(secondarySelect.selectedOptions).map(o => o.value).filter(Boolean);
        const secondaryFiltered = secondary.filter(pos => pos !== primary);
        const phys = parseInt(physSelect.value, 10) || 1;
        const tech = parseInt(techSelect.value, 10) || 1;
        const tactic = parseInt(tacticSelect.value, 10) || 1;
        const rating = parseFloat(calculateInitialRating(phys, tech, tactic).toFixed(1));

        const profile = {
            nome: rawName,
            posicao: [primary, ...secondaryFiltered],
            posicao_secundaria: secondaryFiltered,
            goleiro: Boolean(gkInput.checked),
            rating_linha: rating,
            rating_gk: null
        };

        const { error } = await supabaseClient.from('players').insert(profile);
        if (error) {
            if (statusEl) statusEl.textContent = 'Erro ao salvar atleta.';
            console.error(error);
            return;
        }
        await loadAdminData();
        if (statusEl) statusEl.textContent = `Atleta ${rawName} adicionado.`;
        nameInput.value = '';
        gkInput.checked = false;
        secondarySelect.querySelectorAll('option').forEach(opt => { opt.selected = false; });
        updatePreview();
    });
}

function initRemovePlayer() {
    const btn = document.getElementById('remove-player-btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        const statusEl = document.getElementById('remove-player-status');
        if (statusEl) statusEl.textContent = '';
        const select = document.getElementById('remove-player-select');
        const id = select?.value;
        if (!id) return;
        const { error } = await supabaseClient.from('players').delete().eq('id', id);
        if (error) {
            if (statusEl) statusEl.textContent = 'Erro ao remover atleta.';
            console.error(error);
            return;
        }
        await loadAdminData();
        if (statusEl) statusEl.textContent = 'Atleta removido.';
    });
}

function fillEditPlayerForm(player) {
    const nameInput = document.getElementById('edit-player-name');
    const primarySelect = document.getElementById('edit-player-pos-primary');
    const secondarySelect = document.getElementById('edit-player-pos-secondary');
    const gkInput = document.getElementById('edit-player-gk');
    const ratingLine = document.getElementById('edit-player-rating-line');
    const ratingGk = document.getElementById('edit-player-rating-gk');
    if (!player) return;

    const primary = Array.isArray(player.posicao) && player.posicao.length > 0 ? player.posicao[0] : 'meio';
    const secondary = Array.isArray(player.posicao_secundaria) ? player.posicao_secundaria : [];
    nameInput.value = player.nome || '';
    primarySelect.value = primary;
    secondarySelect.querySelectorAll('option').forEach(opt => {
        opt.selected = secondary.includes(opt.value);
    });
    gkInput.checked = Boolean(player.goleiro);
    ratingLine.value = player.rating_linha ?? '';
    ratingGk.value = player.rating_gk ?? '';
}

function initEditPlayerForm() {
    const form = document.getElementById('edit-player-form');
    const select = document.getElementById('edit-player-select');
    if (!form || !select) return;

    select.addEventListener('change', () => {
        const player = playersAdmin.find(p => p.id === select.value);
        if (player) fillEditPlayerForm(player);
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const statusEl = document.getElementById('edit-player-status');
        if (statusEl) statusEl.textContent = '';
        const id = select.value;
        const nameInput = document.getElementById('edit-player-name');
        const primarySelect = document.getElementById('edit-player-pos-primary');
        const secondarySelect = document.getElementById('edit-player-pos-secondary');
        const gkInput = document.getElementById('edit-player-gk');
        const ratingLine = document.getElementById('edit-player-rating-line');
        const ratingGk = document.getElementById('edit-player-rating-gk');

        const nome = nameInput.value.trim();
        if (!nome) {
            if (statusEl) statusEl.textContent = 'Informe o nome do atleta.';
            return;
        }
        const primary = primarySelect.value;
        const secondary = Array.from(secondarySelect.selectedOptions).map(o => o.value).filter(Boolean);
        const secondaryFiltered = secondary.filter(pos => pos !== primary);
        const ratingLineVal = ratingLine.value !== '' ? parseFloat(ratingLine.value) : null;
        const ratingGkVal = ratingGk.value !== '' ? parseFloat(ratingGk.value) : null;

        const update = {
            nome,
            posicao: [primary, ...secondaryFiltered],
            posicao_secundaria: secondaryFiltered,
            goleiro: Boolean(gkInput.checked),
            rating_linha: ratingLineVal,
            rating_gk: ratingGkVal
        };

        const { error } = await supabaseClient.from('players').update(update).eq('id', id);
        if (error) {
            if (statusEl) statusEl.textContent = 'Erro ao salvar alteracoes.';
            console.error(error);
            return;
        }
        await loadAdminData();
        if (statusEl) statusEl.textContent = 'Atleta atualizado.';
    });
}

async function recomputeRatingsAndUpdate() {
    const { data: games, error: gamesError } = await supabaseClient.from('games').select('*').order('id', { ascending: true });
    const { data: players, error: playersError } = await supabaseClient.from('players').select('*');
    if (gamesError || playersError) return;
    const lineResults = {};
    const gkResults = {};

    (games || []).forEach(game => {
        const golsC = game.placar?.cinza ?? 0;
        const golsB = game.placar?.branco ?? 0;
        let resCinza, resBranco;
        if (golsC > golsB) { resCinza = 3; resBranco = 0; }
        else if (golsB > golsC) { resCinza = 0; resBranco = 3; }
        else { resCinza = 1; resBranco = 1; }

        const addLine = (name, points) => {
            if (!lineResults[name]) lineResults[name] = [];
            lineResults[name].push(points);
        };
        (game.cinza?.linha || []).forEach(n => addLine(n, resCinza));
        (game.branco?.linha || []).forEach(n => addLine(n, resBranco));

        const addGk = (name, goalsAgainst) => {
            if (!name) return;
            if (!gkResults[name]) gkResults[name] = [];
            gkResults[name].push(goalsAgainst);
        };
        addGk(game.cinza?.goleiro, golsB);
        addGk(game.branco?.goleiro, golsC);
    });

    const updates = [];
    (players || []).forEach(player => {
        const results = lineResults[player.nome] || [];
        if (results.length === 0) return;
        const startWeighted = Math.max(0, results.length - 10);
        let weightedPoints = 0;
        let weightedMatches = 0;
        results.forEach((points, idx) => {
            const weight = idx >= startWeighted ? 1.2 : 1.0;
            weightedPoints += points * weight;
            weightedMatches += weight;
        });
        if (weightedMatches === 0) return;
        const ppg = weightedPoints / weightedMatches;
        const rating = Math.min(10, (ppg / 3) * 10);
        updates.push({ id: player.id, rating_linha: parseFloat(rating.toFixed(1)) });
    });

    (players || []).forEach(player => {
        const gkList = gkResults[player.nome] || [];
        if (gkList.length === 0) return;
        const avgAgainst = gkList.reduce((sum, val) => sum + val, 0) / gkList.length;
        const ratingGk = Math.max(0, Math.min(10, 10 - avgAgainst));
        const existing = updates.find(u => u.id === player.id);
        if (existing) {
            existing.rating_gk = parseFloat(ratingGk.toFixed(1));
        } else {
            updates.push({ id: player.id, rating_gk: parseFloat(ratingGk.toFixed(1)) });
        }
    });

    for (const update of updates) {
        const payload = {};
        if (typeof update.rating_linha === 'number') payload.rating_linha = update.rating_linha;
        if (typeof update.rating_gk === 'number') payload.rating_gk = update.rating_gk;
        await supabaseClient.from('players').update(payload).eq('id', update.id);
    }
}
