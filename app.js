// --- PADRONIZAÇÃO DE NOMES (usar \uXXXX para acentos) ---
const NAME_MAPPING = {
    'gesse': 'Gesse', 'gess\u00e9': 'Gesse', 'gess\u0178': 'Gess\u00e9', 'gess\u00bf': 'Gess\u00e9',
    'poritnho': 'Portinho', 'porto': 'Portinho', 'portinho': 'Portinho',
    'bihain': 'Bihain', 'ivan': 'Ivan', 'duda': 'Duda',
    'patrick': 'Patric', 'patric': 'Patric',
    'oda': 'Odacir', 'odacir': 'Odacir',
    'devid': 'Deivid', 'deivid': 'Deivid',
    'assi': 'Assis', 'assis': 'Assis',
    'justi': 'Gabriel J', 'gabriel j': 'Gabriel J',
    'iuri': 'Iuri', '\u00eduri': 'Iuri',
    'admar': 'Admar', 'dudu': 'Dudu', 'gabriel': 'Gabriel',
    'pablo': 'Pablo', 'daniel': 'Daniel', 'alex': 'Alex',
    'anderson g': 'Anderson G', 'aderson': 'Aderson', 'everson': 'Everson',
    'joao': 'Jo\u00e3o', 'jo\u00e3o': 'Jo\u00e3o', 'jo\u01dco': 'Jo\u00e3o',
    'cacapava': 'Ca\u00e7apava', 'ca\u00e7apava': 'Ca\u00e7apava', 'ca\ufffd\ufffdapava': 'Ca\u00e7apava',
    'eliezer': 'Eliezer',
    'nando': 'Nando', 'dionata': 'Dionata', 'saimon': 'Saimon',
    'luciano': 'Luciano', 'brum': 'Brum', 'guilherme': 'Guilherme',
    'lacoste': 'Lacoste', 'edu': 'Edu', 'melita': 'Melita',
    'michel': 'Michel', 'raul': 'Raul', 'edevaldo': 'Edevaldo',
    'paulinho': 'Paulinho', 'natan': 'Natan', 'vinicius': 'Vin\u00edcius',
    'leonel': 'Leonel', 'luan': 'Luan', 'vitor': 'Vitor',
    'mauricio': 'Maur\u00edcio', 'maur\u00edcio': 'Maur\u00edcio',
    'rodrigo': 'Rodrigo', 'maicon': 'Maicon',
    'pastel': 'Pastel', 'lauro': 'Lauro', 'santiago': 'Santiago',
    'daniel goleiro': 'Daniel Goleiro',
    'avila': '\u00c1vila', '\u00e1vila': '\u00c1vila', '\ufffd\ufffdvila': '\u00c1vila', '\ufffdvila': '\u00c1vila',
    'elder': 'Elder',
    'sandro': 'Sandro'
};

const SUPABASE_URL = 'https://lfwzjyiaqdngbcecaouu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_oCgYlTOm2NGBNZ7YhpMi2w_I7E2V_Fn';
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
const DEFAULT_FILTER_START_SETTING_KEY = 'default_filter_start_date';

function standardize(name) {
    if (!name) return 'Desconhecido';
    const lower = name.toString().trim().toLowerCase();
    return NAME_MAPPING[lower] || name.charAt(0).toUpperCase() + name.slice(1);
}

function parseBrDateToTime(value) {
    if (!value || typeof value !== 'string') return Number.NaN;
    const parts = value.split('/');
    if (parts.length !== 3) return Number.NaN;
    const [dd, mm, yyyy] = parts.map(Number);
    return Date.UTC(yyyy, mm - 1, dd);
}

function parseIsoDateToTime(value) {
    if (!value || typeof value !== 'string') return Number.NaN;
    const parts = value.split('-');
    if (parts.length !== 3) return Number.NaN;
    const [yyyy, mm, dd] = parts.map(Number);
    return Date.UTC(yyyy, mm - 1, dd);
}

function getDefaultStartIndex(values) {
    const targetTime = parseIsoDateToTime(defaultFilterStartDate);
    if (!Number.isFinite(targetTime)) return 0;
    const idx = values.findIndex(value => parseBrDateToTime(value) >= targetTime);
    if (idx >= 0) return idx;
    return Math.max(values.length - 1, 0);
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function compareByName(a, b) {
    return String(a.name || a).localeCompare(String(b.name || b), 'pt-BR');
}

function getResultPoints(result) {
    return result === 'V' ? 3 : (result === 'E' ? 1 : 0);
}

function getResultLabel(result) {
    if (result === 'V') return 'Vitória';
    if (result === 'E') return 'Empate';
    return 'Derrota';
}

function formatPct(value) {
    return `${value.toFixed(1)}%`;
}

function getRecordText(wins, draws, losses) {
    return `${wins}V / ${draws}E / ${losses}D`;
}

function getRankingMinimums() {
    return {
        overall: 1,
        line: 1,
        gk: 1
    };
}

// --- ESTADO GLOBAL ---
let originalGames = [];
let dateValues = [];
let playerOptions = [];
let playerProfiles = [];
let playerProfileMap = {};
let playerStats = {};
let dashboardStats = null;
let gkGlobalAvg = 0;
let defaultFilterStartDate = '';
const TEAM_PICKER_EXCLUDE = new Set([
    'Leonel',
    'Anderson G',
    'Daniel Goleiro',
    'Edevaldo',
    'Luciano',
    'Maicon',
    'Maur\u00edcio',
    'Natan',
    'Raul',
    'Sandro',
    'Vitor'
]);
const teamPickerState = { cinza: [], branco: [], gkCinza: '', gkBranco: '' };
const teamPickerSelection = { cinza: null, branco: null };

function setTeamPickerPlayersVisible(isVisible) {
    const playersSection = document.getElementById('team-picker-all-players');
    if (!playersSection) return;
    playersSection.classList.toggle('hidden', !isVisible);
}

function setTeamPickerWhatsAppEnabled(isEnabled) {
    const btn = document.getElementById('team-picker-whatsapp');
    if (!btn) return;
    btn.disabled = !isEnabled;
}

document.addEventListener('DOMContentLoaded', () => {
    initTeamPicker();
    initPlayerModal();
    initPlayerCompare();
    loadFromSupabase();
});

async function loadFromSupabase() {
    try {
        if (!supabaseClient) throw new Error('Supabase não carregou.');
        const [{ data: games, error: gamesError }, { data: profiles, error: profilesError }, { data: setting, error: settingError }] = await Promise.all([
            supabaseClient.from('games').select('*').order('id', { ascending: true }),
            supabaseClient.from('players').select('*').order('nome', { ascending: true }),
            supabaseClient.from('app_settings').select('value').eq('key', DEFAULT_FILTER_START_SETTING_KEY).maybeSingle()
        ]);
        if (gamesError) throw gamesError;
        if (profilesError) throw profilesError;
        originalGames = Array.isArray(games) ? games : [];
        if (settingError) {
            console.warn('Configuração global do filtro indisponível:', settingError);
            defaultFilterStartDate = '';
        } else {
            defaultFilterStartDate = setting && /^\d{4}-\d{2}-\d{2}$/.test(setting.value) ? setting.value : '';
        }
        setPlayerProfiles(profiles || []);
        rebuildPlayerStats(originalGames);
        rebuildPlayerOptions(originalGames);
        initDateFilter();
        initAddGameForm();
        applyFilter();
        const lastUpdate = document.getElementById('last-update');
        if (lastUpdate) lastUpdate.textContent = `Dados carregados (${originalGames.length} jogos)`;
    } catch (err) {
        console.error('Erro ao carregar dados:', err);
        const lastUpdate = document.getElementById('last-update');
        if (lastUpdate) lastUpdate.textContent = 'Erro ao carregar dados (ver console)';
    }
}

// --- FILTRO DE DATA (SLIDERS) ---
function initDateFilter() {
    const ordered = [...originalGames].sort((a, b) => a.id - b.id);
    dateValues = [];
    ordered.forEach(g => { if (!dateValues.includes(g.data)) dateValues.push(g.data); });

    const startRange = document.getElementById('filter-start-range');
    const endRange = document.getElementById('filter-end-range');
    const startLabel = document.getElementById('filter-start-label');
    const endLabel = document.getElementById('filter-end-label');

    const maxIdx = Math.max(dateValues.length - 1, 0);
    const defaultStartIdx = getDefaultStartIndex(dateValues);
    startRange.min = 0; startRange.max = maxIdx; startRange.value = defaultStartIdx;
    endRange.min = 0; endRange.max = maxIdx; endRange.value = maxIdx;

    const updateLabels = () => {
        startLabel.textContent = dateValues[startRange.value] || '-';
        endLabel.textContent = dateValues[endRange.value] || '-';
    };
    const updateTrackFill = () => {
        const max = maxIdx || 1;
        const p1 = (parseInt(startRange.value,10) / max) * 100;
        const p2 = (parseInt(endRange.value,10) / max) * 100;
        const gradient = `linear-gradient(90deg, #e2e8f0 0%, #e2e8f0 ${p1}%, #bfdbfe ${p1}%, #bfdbfe ${p2}%, #e2e8f0 ${p2}%, #e2e8f0 100%)`;
        startRange.style.background = gradient;
        endRange.style.background = gradient;
    };
    updateLabels();
    updateTrackFill();

    const onInput = () => {
        if (parseInt(startRange.value, 10) > parseInt(endRange.value, 10)) {
            startRange.value = endRange.value;
        }
        updateLabels();
        updateTrackFill();
        applyFilter();
    };
    startRange.addEventListener('input', onInput);
    endRange.addEventListener('input', onInput);
}

function rebuildPlayerOptions(games) {
    const set = new Set();
    if (playerProfiles.length > 0) {
        playerProfiles.forEach(p => set.add(standardize(p.nome)));
    } else {
        games.forEach(g => {
            set.add(standardize(g.cinza.goleiro));
            set.add(standardize(g.branco.goleiro));
            g.cinza.linha.forEach(n => set.add(standardize(n)));
            g.branco.linha.forEach(n => set.add(standardize(n)));
        });
    }
    playerOptions = Array.from(set).sort();
    const renderSelect = (id, multiple=false) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = playerOptions.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
        if (multiple) {
            el.setAttribute('multiple', 'multiple');
        }
    };
    renderSelect('add-gk-cinza');
    renderSelect('add-gk-branco');
    renderSelect('add-line-cinza', true);
    renderSelect('add-line-branco', true);
    renderTeamPickerOptions();
}

function setPlayerProfiles(profiles) {
    playerProfiles = Array.isArray(profiles) ? profiles : [];
    playerProfileMap = {};
    playerProfiles.forEach(p => {
        if (!p || !p.nome) return;
        const name = standardize(p.nome);
        const primaryPositions = Array.isArray(p.posicao) ? p.posicao : [];
        const secondaryRaw = p.posicao_secundaria ?? [];
        const secondaryPositions = Array.isArray(secondaryRaw)
            ? secondaryRaw
            : (secondaryRaw ? [secondaryRaw] : []);
        playerProfileMap[name] = {
            nome: name,
            posicao: [...primaryPositions, ...secondaryPositions],
            goleiro: Boolean(p.goleiro),
            rating_linha: p.rating_linha ?? null,
            rating_gk: p.rating_gk ?? null
        };
    });
}

function buildPlayerStatsFromGames(games) {
    const stats = {};
    let totalGkGoals = 0;
    let totalGkMatches = 0;
    const lineResults = {};

    const ensure = (name) => {
        const pName = standardize(name);
        if (!stats[pName]) {
            stats[pName] = { lineMatches: 0, linePoints: 0, gkMatches: 0, gkGoals: 0, lineWeightedMatches: 0, lineWeightedPoints: 0 };
        }
        return stats[pName];
    };

    const orderedGames = [...games].sort((a, b) => a.id - b.id);
    orderedGames.forEach(game => {
        const golsC = game.placar.cinza;
        const golsB = game.placar.branco;
        let resCinza, resBranco;
        if (golsC > golsB) { resCinza = 'V'; resBranco = 'D'; }
        else if (golsB > golsC) { resCinza = 'D'; resBranco = 'V'; }
        else { resCinza = 'E'; resBranco = 'E'; }

        const addLine = (name, result) => {
            const p = ensure(name);
            p.lineMatches++;
            if (result === 'V') p.linePoints += 3;
            if (result === 'E') p.linePoints += 1;
            const points = result === 'V' ? 3 : result === 'E' ? 1 : 0;
            const key = standardize(name);
            if (!lineResults[key]) lineResults[key] = [];
            lineResults[key].push(points);
        };
        const addGk = (name, goalsAgainst) => {
            const p = ensure(name);
            p.gkMatches++;
            p.gkGoals += goalsAgainst;
            totalGkMatches++;
            totalGkGoals += goalsAgainst;
        };

        addGk(game.cinza.goleiro, golsB);
        addGk(game.branco.goleiro, golsC);
        game.cinza.linha.forEach(n => addLine(n, resCinza));
        game.branco.linha.forEach(n => addLine(n, resBranco));
    });

    Object.keys(lineResults).forEach(name => {
        const results = lineResults[name];
        const p = ensure(name);
        const startWeighted = Math.max(0, results.length - 10);
        results.forEach((points, idx) => {
            const weight = idx >= startWeighted ? 1.2 : 1.0;
            p.lineWeightedPoints += points * weight;
            p.lineWeightedMatches += weight;
        });
    });

    const gkAvg = totalGkMatches > 0 ? (totalGkGoals / totalGkMatches) : 0;
    return { stats, gkAvg };
}

function rebuildPlayerStats(games) {
    const { stats, gkAvg } = buildPlayerStatsFromGames(games);
    playerStats = stats;
    gkGlobalAvg = gkAvg;
}

function initAddGameForm() {
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
        const dataFmt = `${dd}/${mm}/${yyyy}`;
        const nextId = Math.max(...originalGames.map(g => g.id), 0) + 1;

        const newGame = {
            id: nextId,
            data: dataFmt,
            cinza: { goleiro: gkC, linha: lineC },
            branco: { goleiro: gkB, linha: lineB },
            placar: { cinza: scoreC, branco: scoreB }
        };

        originalGames.push(newGame);
        rebuildPlayerStats(originalGames);
        rebuildPlayerOptions(originalGames);
        initDateFilter();
        applyFilter();
        statusEl.textContent = `Jogo ${nextId} adicionado (somente nesta sessão).`;
        form.reset();
    });
}

function calculateInitialRating(phys, tech, tactic) {
    const weighted = (tech * 0.45) + (phys * 0.35) + (tactic * 0.20);
    const normalized = Math.max(0, Math.min(10, (weighted / 5) * 10));
    return normalized;
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

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (statusEl) statusEl.textContent = '';
        const rawName = nameInput.value.trim();
        if (!rawName) {
            if (statusEl) statusEl.textContent = 'Informe o nome do atleta.';
            return;
        }

        const name = standardize(rawName);
        if (playerProfileMap[name]) {
            if (statusEl) statusEl.textContent = 'Esse atleta já existe na lista.';
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
            nome: name,
            posicao: [primary, ...secondaryFiltered],
            posicao_secundaria: secondaryFiltered,
            goleiro: Boolean(gkInput.checked),
            rating_linha: rating,
            rating_gk: null
        };

        playerProfiles.push(profile);
        playerProfileMap[name] = {
            nome: name,
            posicao: profile.posicao,
            goleiro: profile.goleiro,
            rating_linha: rating,
            rating_gk: null
        };

        playerOptions = Array.from(new Set([...playerOptions, name])).sort();
        renderTeamPickerOptions();
        nameInput.value = '';
        gkInput.checked = false;
        secondarySelect.querySelectorAll('option').forEach(opt => { opt.selected = false; });
        if (statusEl) statusEl.textContent = `Atleta ${name} adicionado nesta sessão.`;
    });
}

function updateTeamPickerCount() {
    const countEl = document.getElementById('team-picker-count');
    if (!countEl) return;
    const selected = document.querySelectorAll('input[name="team-player"]:checked').length;
    countEl.textContent = selected;
}

function clearTeamPickerSelection() {
    teamPickerSelection.cinza = null;
    teamPickerSelection.branco = null;
}

function renderTeamPickerPlaceholder() {
    teamPickerState.cinza = [];
    teamPickerState.branco = [];
    teamPickerState.gkCinza = '';
    teamPickerState.gkBranco = '';
    clearTeamPickerSelection();
    setTeamPickerPlayersVisible(true);
    setTeamPickerWhatsAppEnabled(false);
    const results = document.getElementById('team-draw-results');
    if (!results) return;
    results.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
            <div class="border border-slate-200 rounded-lg p-4">
                <p class="text-sm font-semibold text-slate-700 mb-2">Time Cinza</p>
                <div class="team-pitch team-pitch--cinza">
                    <p class="team-pitch-empty">Aguardando sorteio.</p>
                </div>
            </div>
            <div class="flex justify-center">
                <button id="team-picker-swap" type="button" class="bg-slate-200 text-slate-600 text-xs font-semibold px-2.5 py-1.5 rounded hover:bg-slate-300" disabled>&harr;</button>
            </div>
            <div class="border border-slate-200 rounded-lg p-4">
                <p class="text-sm font-semibold text-slate-700 mb-2">Time Branco</p>
                <div class="team-pitch team-pitch--branco">
                    <p class="team-pitch-empty">Aguardando sorteio.</p>
                </div>
            </div>
        </div>
    `;
}

function renderTeamPickerOptions() {
    const gkCinza = document.getElementById('team-gk-cinza');
    const gkBranco = document.getElementById('team-gk-branco');
    const list = document.getElementById('team-player-list');
    if (!gkCinza || !gkBranco || !list) return;

    const currentCinza = gkCinza.value;
    const currentBranco = gkBranco.value;
    const teamPickerOptions = playerOptions.filter(p => !TEAM_PICKER_EXCLUDE.has(p));
    const optionsHtml = teamPickerOptions.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');

    gkCinza.innerHTML = optionsHtml;
    gkBranco.innerHTML = optionsHtml;
    if (currentCinza) gkCinza.value = currentCinza;
    if (currentBranco) gkBranco.value = currentBranco;

    list.innerHTML = teamPickerOptions.map((p, idx) => `
        <label class="flex items-center justify-between gap-2 text-xs bg-white border border-slate-200 rounded px-2 py-1">
            <span class="flex items-center gap-2">
                <input id="team-player-${idx}" type="checkbox" name="team-player" value="${escapeHtml(p)}" class="rounded border-slate-300">
                <span>${escapeHtml(p)}</span>
            </span>
            <span class="player-rating" title="Rating de linha: combina hist&oacute;rico de pontos por jogo e peso maior para jogos recentes." style="${getRatingStyle(p)}">R ${formatLineRating(p)}</span>
        </label>
    `).join('');

    list.querySelectorAll('input[name="team-player"]').forEach(input => {
        input.addEventListener('change', updateTeamPickerCount);
    });
    updateTeamPickerCount();
}

function renderTeamPickerResults() {
    const results = document.getElementById('team-draw-results');
    if (!results) return;

    if (teamPickerState.cinza.length === 0 && teamPickerState.branco.length === 0) {
        renderTeamPickerPlaceholder();
        return;
    }

    const renderChip = (team, name, label) => {
        const isSelected = teamPickerSelection[team] === name;
        const base = team === 'cinza' ? 'team-chip team-chip--cinza' : 'team-chip team-chip--branco';
        const selected = isSelected ? 'team-chip--selected' : '';
        const badge = getPositionBadgeInfo(name);
        const badgeHtml = badge ? `<span class="team-chip-badge ${badge.className}">${badge.code}</span>` : '';
        return `<button type="button" data-team="${team}" data-player="${escapeHtml(name)}" class="${base} ${selected}">${escapeHtml(label)}${badgeHtml}</button>`;
    };

    const renderPitch = (team, label, gkName, players) => `
        <div class="border border-slate-200 rounded-lg p-4">
            <p class="text-sm font-semibold text-slate-700 mb-2">${escapeHtml(label)}</p>
            <div class="team-pitch team-pitch--${team}">
                <div class="team-pitch-goal">
                    <span class="team-chip team-chip--gk">1 - ${escapeHtml(gkName)}<span class="team-chip-badge team-chip-badge--gk">GL</span></span>
                </div>
                <div class="team-pitch-line">
                    ${sortPlayersByPosition(players).map((p, idx) => renderChip(team, p, `${idx + 2} - ${p}`)).join('')}
                </div>
            </div>
        </div>
    `;

    results.innerHTML = `
        <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
                ${renderPitch('cinza', 'Time Cinza', teamPickerState.gkCinza, teamPickerState.cinza)}
                <div class="flex justify-center">
                    <button id="team-picker-swap" type="button" class="bg-slate-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded hover:bg-slate-800">&harr;</button>
                </div>
                ${renderPitch('branco', 'Time Branco', teamPickerState.gkBranco, teamPickerState.branco)}
            </div>
            ${renderTeamBalanceAnalysis()}
        </div>
    `;
}

function buildWhatsAppMessage() {
    const formatPlayer = (name, number, isGk = false) => {
        const badge = getPositionBadgeInfo(name, isGk);
        const suffix = badge ? ` (${badge.code})` : '';
        return `${number} - ${name}${suffix}`;
    };
    const cinzaList = [
        formatPlayer(teamPickerState.gkCinza, 1, true),
        ...sortPlayersByPosition(teamPickerState.cinza).map((p, idx) => formatPlayer(p, idx + 2))
    ];
    const brancoList = [
        formatPlayer(teamPickerState.gkBranco, 1, true),
        ...sortPlayersByPosition(teamPickerState.branco).map((p, idx) => formatPlayer(p, idx + 2))
    ];

    return [
        'Atenção às cores dos uniformes e ordem de substituição:',
        '',
        `Time cinza: ${'\u{1F3F4}'.repeat(4)}`,
        ...cinzaList,
        '',
        `Time Branco: ${'\u{1F3F3}\u{FE0F}'.repeat(4)}`,
        ...brancoList
    ].join('\n');
}

function normalizePosition(pos) {
    if (!pos) return '';
    const lower = pos.toString().trim().toLowerCase();
    if (lower.startsWith('def')) return 'defesa';
    if (lower.startsWith('mei')) return 'meio';
    if (lower.startsWith('ata')) return 'ataque';
    return '';
}

function getPlayerPositions(name) {
    const profile = playerProfileMap[name];
    if (!profile) return [];
    const positions = Array.isArray(profile.posicao)
        ? profile.posicao.map(normalizePosition).filter(Boolean)
        : [];
    return positions;
}

function getPrimaryPosition(name) {
    const positions = getPlayerPositions(name);
    return positions[0] || 'meio';
}

function sortPlayersByPosition(players) {
    const order = { defesa: 0, meio: 1, ataque: 2 };
    return [...players].sort((a, b) => {
        const posA = getPrimaryPosition(a);
        const posB = getPrimaryPosition(b);
        if (order[posA] !== order[posB]) return order[posA] - order[posB];
        return a.localeCompare(b);
    });
}

function getPositionBadgeInfo(name, isGk = false) {
    if (isGk) return { code: 'GL', className: 'team-chip-badge--gk' };
    const profile = playerProfileMap[name];
    if (!profile) return null;
    const pos = getPlayerPositions(name)[0];
    if (!pos) return null;
    if (pos === 'defesa') return { code: 'DF', className: 'team-chip-badge--defesa' };
    if (pos === 'meio') return { code: 'MC', className: 'team-chip-badge--meio' };
    if (pos === 'ataque') return { code: 'AT', className: 'team-chip-badge--ataque' };
    return null;
}

function getLineRating(name) {
    const profile = playerProfileMap[name];
    if (profile && typeof profile.rating_linha === 'number') {
        return profile.rating_linha;
    }
    const stats = playerStats[name];
    if (!stats || stats.lineWeightedMatches === 0) return 0;
    const ppg = stats.lineWeightedPoints / stats.lineWeightedMatches;
    return Math.min(10, (ppg / 3) * 10);
}

function getGoalkeeperRating(name) {
    const profile = playerProfileMap[name];
    if (profile && typeof profile.rating_gk === 'number') {
        return profile.rating_gk;
    }
    const stats = playerStats[name];
    if (!stats || stats.gkMatches === 0) return null;
    return Math.max(0, Math.min(10, 10 - (stats.gkGoals / stats.gkMatches)));
}

function formatLineRating(name) {
    const rating = getLineRating(name);
    return Number.isFinite(rating) ? rating.toFixed(1) : '0.0';
}

function getRatingStyle(name) {
    const rating = Math.max(0, Math.min(10, getLineRating(name)));
    const hue = Math.round((rating / 10) * 120);
    const bg = `hsl(${hue}, 70%, 85%)`;
    const border = `hsl(${hue}, 70%, 45%)`;
    const text = `hsl(${hue}, 60%, 25%)`;
    return `background:${bg};border-color:${border};color:${text};`;
}

function getTeamPositionCounts(players) {
    return players.reduce((acc, name) => {
        const pos = getPrimaryPosition(name);
        acc[pos] = (acc[pos] || 0) + 1;
        return acc;
    }, { defesa: 0, meio: 0, ataque: 0 });
}

function getTeamLineAverage(players) {
    if (players.length === 0) return 0;
    return players.reduce((sum, name) => sum + getLineRating(name), 0) / players.length;
}

function renderTeamAnalysisItem(label, players, gkName) {
    const counts = getTeamPositionCounts(players);
    const avg = getTeamLineAverage(players);
    const gkRatingValue = getGoalkeeperRating(gkName);
    const gkRating = gkRatingValue === null ? '-' : gkRatingValue.toFixed(1);
    return `
        <div class="bg-white border border-slate-200 rounded-lg p-3">
            <div class="flex items-start justify-between gap-3">
                <div>
                    <p class="text-xs uppercase text-slate-500 font-semibold">${escapeHtml(label)}</p>
                    <p class="text-lg font-bold text-slate-800 mt-1">${avg.toFixed(1)}</p>
                    <p class="text-xs text-slate-500">Rating médio de linha</p>
                </div>
                <div class="text-right">
                    <p class="text-xs text-slate-500">Goleiro</p>
                    <p class="text-sm font-semibold text-slate-800">${escapeHtml(gkName || '-')}</p>
                    <p class="text-xs text-slate-500">GK ${gkRating}</p>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                <div class="bg-blue-50 text-blue-800 rounded px-2 py-1">DF ${counts.defesa || 0}</div>
                <div class="bg-emerald-50 text-emerald-800 rounded px-2 py-1">MC ${counts.meio || 0}</div>
                <div class="bg-red-50 text-red-800 rounded px-2 py-1">AT ${counts.ataque || 0}</div>
            </div>
        </div>
    `;
}

function getTeamBalanceAlerts() {
    const avgCinza = getTeamLineAverage(teamPickerState.cinza);
    const avgBranco = getTeamLineAverage(teamPickerState.branco);
    const diff = Math.abs(avgCinza - avgBranco);
    const countsCinza = getTeamPositionCounts(teamPickerState.cinza);
    const countsBranco = getTeamPositionCounts(teamPickerState.branco);
    const alerts = [];

    if (diff >= 1.0) alerts.push(`Diferença de rating alta: ${diff.toFixed(1)} ponto.`);
    else if (diff >= 0.5) alerts.push(`Diferença moderada de rating: ${diff.toFixed(1)} ponto.`);
    else alerts.push(`Times bem equilibrados no rating: diferença ${diff.toFixed(1)}.`);

    [['Time Cinza', countsCinza], ['Time Branco', countsBranco]].forEach(([label, counts]) => {
        if ((counts.defesa || 0) === 0) alerts.push(`${label} está sem defensor.`);
        if ((counts.meio || 0) === 0) alerts.push(`${label} está sem jogador de meio.`);
        if ((counts.ataque || 0) === 0) alerts.push(`${label} está sem atacante.`);
    });

    return alerts;
}

function renderTeamBalanceAnalysis() {
    const alerts = getTeamBalanceAlerts();
    return `
        <div class="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div class="flex flex-col gap-1 mb-3">
                <p class="text-sm font-bold text-slate-800">Análise do próximo jogo</p>
                <p class="text-xs text-slate-500">Força média, distribuição de posições e alertas de equilíbrio.</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${renderTeamAnalysisItem('Time Cinza', teamPickerState.cinza, teamPickerState.gkCinza)}
                ${renderTeamAnalysisItem('Time Branco', teamPickerState.branco, teamPickerState.gkBranco)}
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
                ${alerts.map(alert => `<span class="text-xs bg-white border border-slate-200 rounded-full px-3 py-1 text-slate-700">${escapeHtml(alert)}</span>`).join('')}
            </div>
        </div>
    `;
}

function buildPositionGroups(linePool) {
    const groups = { defesa: [], meio: [], ataque: [] };
    const counts = { defesa: 0, meio: 0, ataque: 0 };
    const missing = [];

    linePool.forEach(name => {
        const profile = playerProfileMap[name];
        let positions = profile?.posicao || [];
        positions = positions.map(normalizePosition).filter(Boolean);
        if (positions.length === 0) {
            positions = ['meio'];
            missing.push(name);
        }

        let chosen = positions[0];
        if (positions.length > 1) {
            chosen = positions.reduce((best, pos) => (counts[pos] < counts[best] ? pos : best), positions[0]);
        }

        counts[chosen] += 1;
        groups[chosen].push({ name, rating: getLineRating(name) });
    });

    return { groups, counts, missing };
}

function allocatePositionTargets(counts, requiredTotal) {
    const positions = ['defesa', 'meio', 'ataque'];
    const total = positions.reduce((sum, pos) => sum + counts[pos], 0);
    const targets = { defesa: 0, meio: 0, ataque: 0 };
    if (total === 0) return targets;

    let assigned = 0;
    const fractions = [];
    positions.forEach(pos => {
        const exact = (requiredTotal * counts[pos]) / total;
        let base = Math.floor(exact);
        base = Math.min(base, counts[pos]);
        targets[pos] = base;
        assigned += base;
        fractions.push({ pos, frac: exact - base });
    });

    let remaining = requiredTotal - assigned;
    fractions.sort((a, b) => b.frac - a.frac);
    for (const item of fractions) {
        if (remaining === 0) break;
        if (targets[item.pos] < counts[item.pos]) {
            targets[item.pos] += 1;
            remaining -= 1;
        }
    }

    while (remaining > 0) {
        const next = positions.find(pos => targets[pos] < counts[pos]);
        if (!next) break;
        targets[next] += 1;
        remaining -= 1;
    }

    return targets;
}

function pickPlayersByPosition(groups, requiredTotal) {
    const counts = {
        defesa: groups.defesa.length,
        meio: groups.meio.length,
        ataque: groups.ataque.length
    };
    const targets = allocatePositionTargets(counts, requiredTotal);
    const selected = { defesa: [], meio: [], ataque: [] };
    ['defesa', 'meio', 'ataque'].forEach(pos => {
        const pool = shuffleArray([...groups[pos]]);
        selected[pos] = pool.slice(0, targets[pos]);
    });
    return selected;
}

function snakeAssign(players, targetA, targetB) {
    const teamA = [];
    const teamB = [];
    const sorted = [...players].sort((a, b) => b.rating - a.rating);

    sorted.forEach((p, idx) => {
        const preferA = idx % 4 === 0 || idx % 4 === 3;
        if (preferA) {
            if (teamA.length < targetA) teamA.push(p);
            else if (teamB.length < targetB) teamB.push(p);
        } else {
            if (teamB.length < targetB) teamB.push(p);
            else if (teamA.length < targetA) teamA.push(p);
        }
    });

    return { teamA, teamB };
}

function getPreferredFormation(teamSize) {
    if (teamSize === 7) {
        return { defesa: 2, meio: 3, ataque: 2 };
    }
    return null;
}

function buildLinePlayers(linePool) {
    const missing = [];
    const players = linePool.map(name => {
        let positions = getPlayerPositions(name);
        if (positions.length === 0) {
            positions = ['meio'];
            missing.push(name);
        }
        return { name, rating: getLineRating(name), positions };
    });
    return { players, missing };
}

function assignPlayersToFormation(players, formation, attempts = 40) {
    const requiredTotal = Object.values(formation).reduce((sum, val) => sum + val, 0) * 2;
    if (players.length < requiredTotal) return null;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
        const need = { ...formation };
        Object.keys(need).forEach(pos => { need[pos] = need[pos] * 2; });
        const assigned = [];
        const shuffled = shuffleArray([...players]);

        for (const player of shuffled) {
            if (assigned.length === requiredTotal) break;
            const options = player.positions.filter(pos => need[pos] > 0);
            if (options.length === 0) continue;
            options.sort((a, b) => need[b] - need[a]);
            const chosen = options[0];
            need[chosen] -= 1;
            assigned.push({ ...player, pos: chosen });
        }

        const remaining = Object.values(need).some(val => val > 0);
        if (!remaining && assigned.length === requiredTotal) return assigned;
    }

    return null;
}

function splitTeamsByFormation(assigned, formation) {
    const grouped = { defesa: [], meio: [], ataque: [] };
    assigned.forEach(player => {
        if (grouped[player.pos]) grouped[player.pos].push(player);
    });

    const targets = {
        defesa: { a: formation.defesa, b: formation.defesa },
        meio: { a: formation.meio, b: formation.meio },
        ataque: { a: formation.ataque, b: formation.ataque }
    };

    const defense = snakeAssign(grouped.defesa, targets.defesa.a, targets.defesa.b);
    const midfield = snakeAssign(grouped.meio, targets.meio.a, targets.meio.b);
    const attack = snakeAssign(grouped.ataque, targets.ataque.a, targets.ataque.b);

    const teamCinza = [
        ...defense.teamA,
        ...midfield.teamA,
        ...attack.teamA
    ].map(p => p.name);
    const teamBranco = [
        ...defense.teamB,
        ...midfield.teamB,
        ...attack.teamB
    ].map(p => p.name);

    return { teamCinza, teamBranco };
}

function canMeetTeamFormation(players, formation, attempts = 30) {
    const requiredTotal = Object.values(formation).reduce((sum, val) => sum + val, 0);
    if (players.length !== requiredTotal) return false;
    const teamPlayers = players.map(name => {
        const positions = getPlayerPositions(name);
        return { name, positions: positions.length > 0 ? positions : ['meio'] };
    });

    for (let attempt = 0; attempt < attempts; attempt += 1) {
        const need = { ...formation };
        const shuffled = shuffleArray([...teamPlayers]);
        let assigned = 0;

        for (const player of shuffled) {
            const options = player.positions.filter(pos => need[pos] > 0);
            if (options.length === 0) continue;
            options.sort((a, b) => need[b] - need[a]);
            const chosen = options[0];
            need[chosen] -= 1;
            assigned += 1;
        }

        const remaining = Object.values(need).some(val => val > 0);
        if (!remaining && assigned === requiredTotal) return true;
    }

    return false;
}

function balanceLineTeamsWithFormation(linePool, teamSize) {
    const formation = getPreferredFormation(teamSize);
    if (!formation) return null;

    const requiredTotal = teamSize * 2;
    if (linePool.length < requiredTotal) {
        return { error: `Selecione pelo menos ${requiredTotal} jogadores de linha (al\u00e9m dos goleiros).` };
    }

    const { players, missing } = buildLinePlayers(linePool);
    const assigned = assignPlayersToFormation(players, formation);
    if (!assigned) return null;

    const split = splitTeamsByFormation(assigned, formation);
    return { teamCinza: split.teamCinza, teamBranco: split.teamBranco, missing };
}

function sumTeamRating(team) {
    return team.reduce((sum, name) => sum + getLineRating(name), 0);
}

function buildTeamsByRatingThenAdjust(linePool, teamSize, maxDiff) {
    const requiredTotal = teamSize * 2;
    if (linePool.length < requiredTotal) {
        return { error: `Selecione pelo menos ${requiredTotal} jogadores de linha (al\u00e9m dos goleiros).` };
    }

    const chosen = shuffleArray([...linePool]).slice(0, requiredTotal);
    const { players, missing } = buildLinePlayers(chosen);
    const seeded = snakeAssign(players, teamSize, teamSize);
    let teamCinza = seeded.teamA.map(p => p.name);
    let teamBranco = seeded.teamB.map(p => p.name);

    const formation = getPreferredFormation(teamSize);
    let formationOk = null;
    if (formation && Object.keys(playerProfileMap).length > 0) {
        const adjusted = adjustTeamsForFormation(teamCinza, teamBranco, formation, maxDiff);
        teamCinza = adjusted.teamCinza;
        teamBranco = adjusted.teamBranco;
        formationOk = canMeetTeamFormation(teamCinza, formation) && canMeetTeamFormation(teamBranco, formation);
    }

    return { teamCinza, teamBranco, missing, formationOk };
}

function findBestFormationSwap(teamA, teamB, formation, maxDiff) {
    let best = null;
    for (let i = 0; i < teamA.length; i += 1) {
        for (let j = 0; j < teamB.length; j += 1) {
            const nextA = [...teamA];
            const nextB = [...teamB];
            nextA[i] = teamB[j];
            nextB[j] = teamA[i];
            if (!canMeetTeamFormation(nextA, formation) || !canMeetTeamFormation(nextB, formation)) continue;
            const diff = Math.abs(sumTeamRating(nextA) - sumTeamRating(nextB));
            if (diff > maxDiff) continue;
            if (!best || diff < best.diff) {
                best = { teamCinza: nextA, teamBranco: nextB, diff };
            }
        }
    }
    return best;
}

function adjustTeamsForFormation(teamA, teamB, formation, maxDiff) {
    const initialOk = canMeetTeamFormation(teamA, formation) && canMeetTeamFormation(teamB, formation);
    if (initialOk) return { teamCinza: teamA, teamBranco: teamB };

    const direct = findBestFormationSwap(teamA, teamB, formation, maxDiff);
    if (direct) return direct;

    let best = null;
    for (let i = 0; i < teamA.length; i += 1) {
        for (let j = 0; j < teamB.length; j += 1) {
            const tempA = [...teamA];
            const tempB = [...teamB];
            tempA[i] = teamB[j];
            tempB[j] = teamA[i];
            const candidate = findBestFormationSwap(tempA, tempB, formation, maxDiff);
            if (!candidate) continue;
            if (!best || candidate.diff < best.diff) {
                best = candidate;
            }
        }
    }

    return best || { teamCinza: teamA, teamBranco: teamB };
}

function balanceLineTeams(linePool, teamSize) {
    const requiredTotal = teamSize * 2;
    if (linePool.length < requiredTotal) {
        return { error: `Selecione pelo menos ${requiredTotal} jogadores de linha (al\u00e9m dos goleiros).` };
    }

    const { groups, missing } = buildPositionGroups(linePool);
    const selectedGroups = linePool.length > requiredTotal
        ? pickPlayersByPosition(groups, requiredTotal)
        : groups;

    const positions = ['defesa', 'meio', 'ataque'];
    const targets = {};
    let sumA = 0;
    const oddPositions = [];
    positions.forEach(pos => {
        const count = selectedGroups[pos].length;
        const baseA = Math.floor(count / 2);
        targets[pos] = { a: baseA, b: count - baseA };
        sumA += baseA;
        if (count % 2 === 1) oddPositions.push(pos);
    });

    let remainingA = teamSize - sumA;
    shuffleArray([...oddPositions]).forEach(pos => {
        if (remainingA <= 0) return;
        targets[pos].a += 1;
        targets[pos].b -= 1;
        remainingA -= 1;
    });

    const defense = snakeAssign(selectedGroups.defesa, targets.defesa.a, targets.defesa.b);
    const midfield = snakeAssign(selectedGroups.meio, targets.meio.a, targets.meio.b);
    const attack = snakeAssign(selectedGroups.ataque, targets.ataque.a, targets.ataque.b);

    const teamCinza = [
        ...defense.teamA,
        ...midfield.teamA,
        ...attack.teamA
    ].map(p => p.name);
    const teamBranco = [
        ...defense.teamB,
        ...midfield.teamB,
        ...attack.teamB
    ].map(p => p.name);

    return { teamCinza, teamBranco, missing };
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function initTeamPicker() {
    const openBtn = document.getElementById('open-team-picker');
    const modal = document.getElementById('team-picker-modal');
    if (!openBtn || !modal) return;

    const overlay = document.getElementById('team-picker-overlay');
    const closeBtn = document.getElementById('team-picker-close');
    const shuffleBtn = document.getElementById('team-picker-shuffle');
    const whatsappBtn = document.getElementById('team-picker-whatsapp');
    const clearBtn = document.getElementById('team-picker-clear');
    const selectAllBtn = document.getElementById('team-picker-select-all');
    const unselectAllBtn = document.getElementById('team-picker-unselect-all');
    const statusEl = document.getElementById('team-picker-status');
    const results = document.getElementById('team-draw-results');

    const closeModal = () => {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    };
    const openModal = () => {
        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
        if (statusEl) statusEl.textContent = '';
        updateTeamPickerCount();
        const hasTeams = teamPickerState.cinza.length > 0 && teamPickerState.branco.length > 0;
        setTeamPickerPlayersVisible(!hasTeams);
        setTeamPickerWhatsAppEnabled(hasTeams);
    };

    openBtn.addEventListener('click', openModal);
    if (overlay) overlay.addEventListener('click', closeModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeModal();
        }
    });

    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            document.querySelectorAll('input[name="team-player"]').forEach(input => { input.checked = true; });
            updateTeamPickerCount();
        });
    }
    if (unselectAllBtn) {
        unselectAllBtn.addEventListener('click', () => {
            document.querySelectorAll('input[name="team-player"]').forEach(input => { input.checked = false; });
            updateTeamPickerCount();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            document.querySelectorAll('input[name="team-player"]').forEach(input => { input.checked = false; });
            const teamSizeInput = document.getElementById('team-size');
            if (teamSizeInput && !teamSizeInput.value) teamSizeInput.value = 7;
            if (statusEl) statusEl.textContent = '';
            updateTeamPickerCount();
            setTeamPickerPlayersVisible(true);
            setTeamPickerWhatsAppEnabled(false);
            renderTeamPickerPlaceholder();
        });
    }

    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', () => {
            if (teamPickerState.cinza.length === 0 || teamPickerState.branco.length === 0) return;
            const message = buildWhatsAppMessage();
            const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank', 'noopener');
        });
    }

    if (results) {
        results.addEventListener('click', (event) => {
            const swapButton = event.target.closest('#team-picker-swap');
            if (swapButton) {
                const a = teamPickerSelection.cinza;
                const b = teamPickerSelection.branco;
                if (!a || !b) {
                    if (statusEl) statusEl.textContent = 'Selecione um jogador de cada time para trocar.';
                    return;
                }
                const idxCinza = teamPickerState.cinza.indexOf(a);
                const idxBranco = teamPickerState.branco.indexOf(b);
                if (idxCinza === -1 || idxBranco === -1) {
                    if (statusEl) statusEl.textContent = 'Não foi possível localizar os jogadores selecionados.';
                    return;
                }
                const teamSize = teamPickerState.cinza.length;
                const formation = getPreferredFormation(teamSize);
                if (formation && Object.keys(playerProfileMap).length > 0) {
                    const nextCinza = [...teamPickerState.cinza];
                    const nextBranco = [...teamPickerState.branco];
                    nextCinza[idxCinza] = b;
                    nextBranco[idxBranco] = a;
                    const okCinza = canMeetTeamFormation(nextCinza, formation);
                    const okBranco = canMeetTeamFormation(nextBranco, formation);
                    if (!okCinza || !okBranco) {
                        if (statusEl) statusEl.textContent = 'Troca não mantém a formação 2-3-2.';
                        return;
                    }
                }
                teamPickerState.cinza[idxCinza] = b;
                teamPickerState.branco[idxBranco] = a;
                clearTeamPickerSelection();
                renderTeamPickerResults();
                if (statusEl) statusEl.textContent = 'Jogadores trocados com sucesso.';
                return;
            }

            const button = event.target.closest('[data-team][data-player]');
            if (!button) return;
            const team = button.getAttribute('data-team');
            const name = button.getAttribute('data-player');
            if (!team || !name) return;
            if (teamPickerSelection[team] === name) {
                teamPickerSelection[team] = null;
            } else {
                teamPickerSelection[team] = name;
            }
            renderTeamPickerResults();
        });
    }

    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => {
            const teamSize = parseInt(document.getElementById('team-size').value, 10);
            const gkCinza = document.getElementById('team-gk-cinza').value;
            const gkBranco = document.getElementById('team-gk-branco').value;

            if (!gkCinza || !gkBranco) {
                if (statusEl) statusEl.textContent = 'Selecione os dois goleiros.';
                return;
            }
            if (gkCinza === gkBranco) {
                if (statusEl) statusEl.textContent = 'Os goleiros precisam ser diferentes.';
                return;
            }
            if (!teamSize || teamSize < 1) {
                if (statusEl) statusEl.textContent = 'Informe quantos jogadores de linha por time.';
                return;
            }

            const selected = Array.from(document.querySelectorAll('input[name="team-player"]:checked')).map(input => input.value);
            const linePool = selected.filter(name => name !== gkCinza && name !== gkBranco);

            let teamCinza = [];
            let teamBranco = [];
            let missingPos = [];
            let formationOk = null;

            if (Object.keys(playerProfileMap).length === 0) {
                const required = teamSize * 2;
                if (linePool.length < required) {
                    if (statusEl) statusEl.textContent = `Selecione pelo menos ${required} jogadores de linha (al\u00e9m dos goleiros).`;
                    return;
                }
                const chosen = shuffleArray([...linePool]).slice(0, required);
                teamCinza = chosen.slice(0, teamSize);
                teamBranco = chosen.slice(teamSize, required);
            } else {
                const result = buildTeamsByRatingThenAdjust(linePool, teamSize, 2);
                if (result.error) {
                    if (statusEl) statusEl.textContent = result.error;
                    return;
                }
                teamCinza = result.teamCinza;
                teamBranco = result.teamBranco;
                missingPos = result.missing || [];
                formationOk = result.formationOk;
            }

            teamPickerState.cinza = teamCinza;
            teamPickerState.branco = teamBranco;
            teamPickerState.gkCinza = gkCinza;
            teamPickerState.gkBranco = gkBranco;
            clearTeamPickerSelection();
            setTeamPickerPlayersVisible(false);
            setTeamPickerWhatsAppEnabled(true);
            renderTeamPickerResults();

            if (statusEl) {
                const required = teamSize * 2;
                const extraInfo = linePool.length > required
                    ? ` Sobram ${linePool.length - required} jogadores fora do sorteio.`
                    : '';
                const missingInfo = missingPos.length > 0
                    ? ` Posição pendente para: ${missingPos.join(', ')}.`
                    : '';
                const formationInfo = formationOk === false
                    ? ' Formação 2-3-2 não foi possível manter com equilíbrio.'
                    : '';
                statusEl.textContent = `Times sorteados com sucesso.${extraInfo}${missingInfo}${formationInfo}`;
            }
        });
    }
}

function applyFilter() {
    const startIdx = parseInt(document.getElementById('filter-start-range').value, 10) || 0;
    const endIdx = parseInt(document.getElementById('filter-end-range').value, 10) || (dateValues.length - 1);

    const filtered = originalGames.filter(g => {
        const idx = dateValues.indexOf(g.data);
        return idx >= startIdx && idx <= endIdx;
    });

    const info = document.getElementById('filter-info');
    if (startIdx !== 0 || endIdx !== dateValues.length - 1) {
        info.textContent = `Mostrando ${filtered.length} de ${originalGames.length} jogos`;
    } else {
        info.textContent = 'Mostrando todos os jogos';
    }

    processData(filtered);
}

// --- PROCESSAMENTO E RENDERIZAÇÃO ---
function createEmptyPlayerStats(name) {
    return {
        name,
        matches: 0, wins: 0, losses: 0, draws: 0, points: 0,
        gkMatches: 0, gkGoals: 0, gkWorst: 0, gkWins: 0, gkDraws: 0, gkLosses: 0, gkPoints: 0, gkLastDate: '',
        lineMatches: 0, linePoints: 0,
        lastResults: [],
        history: [],
        currentUnbeaten: 0, bestUnbeaten: 0,
        currentWin: 0, bestWin: 0,
        currentNoWin: 0
    };
}

function buildDashboardStats(games) {
    const orderedGames = [...games].sort((a, b) => a.id - b.id);
    const players = {};
    const teamStats = { cinza: { w:0, l:0, d:0, g:0 }, branco: { w:0, l:0, d:0, g:0 } };
    const duos = {};
    let totalGoals = 0;
    let maxGoalsGame = { val: 0, desc: '' };
    let maxDiffGame = { val: 0, desc: '' };

    orderedGames.forEach(game => {
        const golsC = game.placar.cinza;
        const golsB = game.placar.branco;
        const totalGameGoals = golsC + golsB;
        const diff = Math.abs(golsC - golsB);

        totalGoals += totalGameGoals;
        if (totalGameGoals > maxGoalsGame.val) maxGoalsGame = { val: totalGameGoals, desc: `${game.data} (${golsC}x${golsB})` };
        if (diff > maxDiffGame.val) maxDiffGame = { val: diff, desc: `${game.data} (${Math.max(golsC, golsB)}x${Math.min(golsC, golsB)})` };

        let resCinza, resBranco;
        if (golsC > golsB) { resCinza = 'V'; resBranco = 'D'; teamStats.cinza.w++; teamStats.branco.l++; }
        else if (golsB > golsC) { resCinza = 'D'; resBranco = 'V'; teamStats.cinza.l++; teamStats.branco.w++; }
        else { resCinza = 'E'; resBranco = 'E'; teamStats.cinza.d++; teamStats.branco.d++; }

        teamStats.cinza.g += golsC;
        teamStats.branco.g += golsB;

        const processPlayer = (name, team, pos, result, gp, gc) => {
            const pName = standardize(name);
            if (!players[pName]) players[pName] = createEmptyPlayerStats(pName);

            const p = players[pName];
            p.matches++;
            p.points += getResultPoints(result);
            if (result === 'V') p.wins++;
            if (result === 'D') p.losses++;
            if (result === 'E') p.draws++;
            p.lastResults.push(result);
            p.history.push({
                id: game.id,
                date: game.data,
                team,
                pos,
                result,
                points: getResultPoints(result),
                score: `${golsC}x${golsB}`,
                goalsFor: gp,
                goalsAgainst: gc
            });

            if (result === 'V' || result === 'E') {
                p.currentUnbeaten++;
                if (p.currentUnbeaten > p.bestUnbeaten) p.bestUnbeaten = p.currentUnbeaten;
            } else {
                p.currentUnbeaten = 0;
            }
            if (result === 'V') {
                p.currentWin++;
                if (p.currentWin > p.bestWin) p.bestWin = p.currentWin;
            } else {
                p.currentWin = 0;
            }
            p.currentNoWin = result !== 'V' ? p.currentNoWin + 1 : 0;

            if (pos === 'Goleiro') {
                p.gkMatches++;
                p.gkGoals += gc;
                if (gc > p.gkWorst) p.gkWorst = gc;
                if (result === 'V') p.gkWins++;
                if (result === 'E') p.gkDraws++;
                if (result === 'D') p.gkLosses++;
                p.gkPoints += getResultPoints(result);
                p.gkLastDate = game.data;
            } else {
                p.lineMatches++;
                p.linePoints += getResultPoints(result);
            }
        };

        const processDuos = (lineArray, result) => {
            const stdNames = lineArray.map(n => standardize(n)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
            const pts = getResultPoints(result);
            for (let i = 0; i < stdNames.length; i++) {
                for (let j = i + 1; j < stdNames.length; j++) {
                    const key = `${stdNames[i]} + ${stdNames[j]}`;
                    if (!duos[key]) duos[key] = { games: 0, points: 0 };
                    duos[key].games++;
                    duos[key].points += pts;
                }
            }
        };

        processPlayer(game.cinza.goleiro, 'Cinza', 'Goleiro', resCinza, golsC, golsB);
        game.cinza.linha.forEach(p => processPlayer(p, 'Cinza', 'Linha', resCinza, golsC, golsB));
        processDuos(game.cinza.linha, resCinza);

        processPlayer(game.branco.goleiro, 'Branco', 'Goleiro', resBranco, golsB, golsC);
        game.branco.linha.forEach(p => processPlayer(p, 'Branco', 'Linha', resBranco, golsB, golsC));
        processDuos(game.branco.linha, resBranco);
    });

    const playersArr = Object.values(players);
    return { orderedGames, players, playersArr, teamStats, totalGoals, maxGoalsGame, maxDiffGame, duos };
}

function getOverallRanking(playersArr) {
    return [...playersArr].sort((a,b) => b.points - a.points || b.wins - a.wins || compareByName(a, b));
}

function getGoalkeeperRanking(playersArr, minMatches = 1) {
    return playersArr
        .filter(p => p.gkMatches >= minMatches)
        .sort((a,b) => {
            const avgA = a.gkGoals / a.gkMatches;
            const avgB = b.gkGoals / b.gkMatches;
            return b.gkPoints - a.gkPoints || avgA - avgB || compareByName(a, b);
        });
}

function getPlayerCurrentFormText(player) {
    const last = player.lastResults[player.lastResults.length - 1];
    if (last === 'V') {
        return player.currentWin > 1 ? `${player.currentWin} vitórias seguidas` : 'Ganhou a última';
    }
    if (last === 'D') return 'Perdeu a última';
    if (last === 'E') {
        return player.currentUnbeaten > 1 ? `Invicto há ${player.currentUnbeaten} jogos` : 'Empatou a última';
    }
    return 'Forma recente neutra';
}

function renderRecentForm(results, limit = 5) {
    const last = results.slice(-limit);
    if (last.length === 0) return '';
    const dots = last.map(r => {
        const color = r === 'V' ? 'bg-green-500' : (r === 'E' ? 'bg-slate-400' : 'bg-red-500');
        return `<span class="inline-block h-2.5 w-2.5 rounded-full ${color}"></span>`;
    }).join('');
    const detail = last.map(getResultLabel).join(', ');
    return `
        <div class="flex flex-col gap-1" title="Últimos ${last.length}: ${escapeHtml(detail)}">
            <div class="flex items-center gap-1">${dots}</div>
        </div>
    `;
}

function initPlayerModal() {
    const modal = document.getElementById('player-modal');
    const overlay = document.getElementById('player-modal-overlay');
    const closeBtn = document.getElementById('player-modal-close');
    if (!modal) return;

    const close = () => modal.classList.add('hidden');
    if (overlay) overlay.addEventListener('click', close);
    if (closeBtn) closeBtn.addEventListener('click', close);

    document.addEventListener('click', (event) => {
        const btn = event.target.closest('.player-detail-link');
        if (!btn) return;
        showPlayerModal(btn.dataset.player);
    });
}

function renderModalKpi(label, value) {
    return `
        <div class="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p class="text-xs uppercase text-slate-500 font-semibold">${label}</p>
            <p class="text-lg font-bold text-slate-800 mt-1">${value}</p>
        </div>
    `;
}

function renderPerformanceBar(label, value, detail, colorClass = 'bg-blue-600') {
    const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
    return `
        <div>
            <div class="flex items-center justify-between gap-3 mb-1">
                <span class="text-xs font-semibold text-slate-600">${escapeHtml(label)}</span>
                <span class="text-xs font-bold text-slate-800">${Number.isFinite(value) ? formatPct(value) : '-'}</span>
            </div>
            <div class="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div class="h-full ${colorClass}" style="width:${safeValue}%"></div>
            </div>
            <p class="text-xs text-slate-500 mt-1">${escapeHtml(detail)}</p>
        </div>
    `;
}

function countHistoryByRole(history, role) {
    return history.filter(item => item.pos === role).reduce((acc, item) => {
        if (item.result === 'V') acc.wins++;
        if (item.result === 'E') acc.draws++;
        if (item.result === 'D') acc.losses++;
        acc.points += item.points;
        acc.matches++;
        return acc;
    }, { matches: 0, wins: 0, draws: 0, losses: 0, points: 0 });
}

function showPlayerModal(name) {
    if (!dashboardStats || !name) return;
    const player = dashboardStats.players[name];
    if (!player) return;

    const modal = document.getElementById('player-modal');
    const title = document.getElementById('player-modal-title');
    const summary = document.getElementById('player-modal-summary');
    const kpis = document.getElementById('player-modal-kpis');
    const chart = document.getElementById('player-modal-chart');
    const insights = document.getElementById('player-modal-insights');
    if (!modal || !title || !summary || !kpis || !chart || !insights) return;

    const linePpg = player.lineMatches > 0 ? (player.linePoints / player.lineMatches).toFixed(2) : '-';
    const gkAvg = player.gkMatches > 0 ? (player.gkGoals / player.gkMatches).toFixed(2) : '-';
    const totalPct = player.matches > 0 ? (player.points / (player.matches * 3)) * 100 : 0;
    const linePct = player.lineMatches > 0 ? (player.linePoints / (player.lineMatches * 3)) * 100 : Number.NaN;
    const gkPct = player.gkMatches > 0 ? (player.gkPoints / (player.gkMatches * 3)) * 100 : Number.NaN;
    const lineRating = formatLineRating(player.name);
    const gkRatingValue = getGoalkeeperRating(player.name);
    const gkRating = gkRatingValue === null ? '-' : gkRatingValue.toFixed(1);
    const lastGame = player.history[player.history.length - 1];
    const lineRecord = countHistoryByRole(player.history, 'Linha');
    const gkRecord = countHistoryByRole(player.history, 'Goleiro');
    const rankingPosition = getOverallRanking(dashboardStats.playersArr).findIndex(p => p.name === player.name) + 1;

    title.textContent = player.name;
    summary.textContent = `${player.matches} jogos no período selecionado. ${player.wins}V / ${player.draws}E / ${player.losses}D.`;
    kpis.innerHTML = [
        renderModalKpi('Ranking geral', rankingPosition > 0 ? `#${rankingPosition}` : '-'),
        renderModalKpi('Aproveitamento', formatPct(totalPct)),
        renderModalKpi('Rating linha', lineRating),
        renderModalKpi('Rating goleiro', gkRating),
        renderModalKpi('Última atuação', lastGame ? lastGame.date : '-')
    ].join('');
    chart.innerHTML = [
        renderPerformanceBar('Geral', totalPct, `${getRecordText(player.wins, player.draws, player.losses)} em ${player.matches} jogos`, 'bg-blue-600'),
        renderPerformanceBar('Linha', linePct, lineRecord.matches > 0 ? `${linePpg} PPG em ${lineRecord.matches} jogos` : 'Sem jogos como linha no período', 'bg-emerald-600'),
        renderPerformanceBar('Goleiro', gkPct, gkRecord.matches > 0 ? `${getRecordText(gkRecord.wins, gkRecord.draws, gkRecord.losses)}. Média sofrida: ${gkAvg}` : 'Sem jogos como goleiro no período', 'bg-amber-500')
    ].join('');
    insights.innerHTML = [
        `<div class="bg-slate-50 border border-slate-200 rounded-lg p-3"><p class="text-xs uppercase text-slate-500 font-semibold">Fase atual</p><p class="font-bold text-slate-800 mt-1">${escapeHtml(getPlayerCurrentFormText(player))}</p></div>`,
        `<div class="bg-slate-50 border border-slate-200 rounded-lg p-3"><p class="text-xs uppercase text-slate-500 font-semibold">Melhor sequência</p><p class="text-slate-700 mt-1">Melhor sequência de vitórias: <strong>${player.bestWin}</strong>.</p></div>`,
        `<div class="bg-slate-50 border border-slate-200 rounded-lg p-3"><p class="text-xs uppercase text-slate-500 font-semibold">Últimos 10</p><div class="mt-2">${renderRecentForm(player.lastResults, 10)}</div></div>`,
        `<div class="bg-slate-50 border border-slate-200 rounded-lg p-3"><p class="text-xs uppercase text-slate-500 font-semibold">Uso</p><p class="text-slate-700 mt-1">${player.lineMatches} jogos na linha e ${player.gkMatches} como goleiro.</p></div>`
    ].join('');
    modal.classList.remove('hidden');
}

function initPlayerCompare() {
    ['compare-player-a', 'compare-player-b'].forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        select.addEventListener('change', renderPlayerComparison);
    });
}

function rebuildPlayerCompareOptions(playersArr) {
    const selectA = document.getElementById('compare-player-a');
    const selectB = document.getElementById('compare-player-b');
    if (!selectA || !selectB) return;
    const names = playersArr.map(p => p.name).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const html = names.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
    const oldA = selectA.value;
    const oldB = selectB.value;
    selectA.innerHTML = html;
    selectB.innerHTML = html;
    if (names.includes(oldA)) selectA.value = oldA;
    if (names.includes(oldB)) selectB.value = oldB;
    if (!selectB.value && names.length > 1) selectB.value = names[1];
    if (selectA.value === selectB.value && names.length > 1) {
        selectB.value = names.find(name => name !== selectA.value) || names[0];
    }
}

function getPlayerCompareMetrics(player) {
    const overallPct = player.matches > 0 ? (player.points / (player.matches * 3)) * 100 : 0;
    const linePct = player.lineMatches > 0 ? (player.linePoints / (player.lineMatches * 3)) * 100 : Number.NaN;
    const gkPct = player.gkMatches > 0 ? (player.gkPoints / (player.gkMatches * 3)) * 100 : Number.NaN;
    const gkAvg = player.gkMatches > 0 ? (player.gkGoals / player.gkMatches).toFixed(2) : '-';
    return { overallPct, linePct, gkPct, gkAvg };
}

function renderCompareCard(player) {
    if (!player) return '<div class="text-sm text-slate-500">Selecione um jogador.</div>';
    const metrics = getPlayerCompareMetrics(player);
    return `
        <div class="border border-slate-200 rounded-lg p-4">
            <div class="flex items-start justify-between gap-3 mb-3">
                <div>
                    <h4 class="font-bold text-slate-800">${escapeHtml(player.name)}</h4>
                    <p class="text-xs text-slate-500">${getRecordText(player.wins, player.draws, player.losses)} em ${player.matches} jogos</p>
                </div>
                <button type="button" class="player-detail-link text-xs" data-player="${escapeHtml(player.name)}">Abrir ficha</button>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
                <div class="bg-slate-50 rounded p-2"><span class="block text-xs text-slate-500">Aproveitamento</span><strong>${formatPct(metrics.overallPct)}</strong></div>
                <div class="bg-slate-50 rounded p-2"><span class="block text-xs text-slate-500">Pontos</span><strong>${player.points}</strong></div>
                <div class="bg-slate-50 rounded p-2"><span class="block text-xs text-slate-500">Linha</span><strong>${Number.isFinite(metrics.linePct) ? formatPct(metrics.linePct) : '-'}</strong></div>
                <div class="bg-slate-50 rounded p-2"><span class="block text-xs text-slate-500">Goleiro</span><strong>${Number.isFinite(metrics.gkPct) ? formatPct(metrics.gkPct) : '-'}</strong></div>
                <div class="bg-slate-50 rounded p-2"><span class="block text-xs text-slate-500">Rating linha</span><strong>${formatLineRating(player.name)}</strong></div>
                <div class="bg-slate-50 rounded p-2"><span class="block text-xs text-slate-500">Média sofrida</span><strong>${metrics.gkAvg}</strong></div>
            </div>
            <div class="mt-3">${renderRecentForm(player.lastResults)}</div>
        </div>
    `;
}

function renderPlayerComparison() {
    if (!dashboardStats) return;
    const container = document.getElementById('player-compare-results');
    const selectA = document.getElementById('compare-player-a');
    const selectB = document.getElementById('compare-player-b');
    if (!container || !selectA || !selectB) return;
    const playerA = dashboardStats.players[selectA.value];
    const playerB = dashboardStats.players[selectB.value];
    container.innerHTML = `${renderCompareCard(playerA)}${renderCompareCard(playerB)}`;
}

function processData(games) {
    if (!Array.isArray(games) || games.length === 0) {
        dashboardStats = null;
        document.getElementById('kpis-container').innerHTML = '<p class="text-sm text-slate-500">Nenhum jogo no período selecionado.</p>';
        document.getElementById('team-stats-container').innerHTML = '';
        document.getElementById('ranking-body').innerHTML = '';
        document.getElementById('gk-body').innerHTML = '';
        document.getElementById('duo-body').innerHTML = '';
        document.getElementById('duo-worst-body').innerHTML = '';
        document.getElementById('game-select').innerHTML = '';
        document.getElementById('game-score').innerHTML = '<p class="text-sm text-slate-500">Nenhum jogo disponível para exibir.</p>';
        document.getElementById('streaks-container').innerHTML = '';
        document.getElementById('player-compare-results').innerHTML = '';
        return;
    }

    dashboardStats = buildDashboardStats(games);
    const { orderedGames, players, playersArr, teamStats, totalGoals, maxGoalsGame, maxDiffGame, duos } = dashboardStats;
    const minimums = getRankingMinimums();
    rebuildPlayerCompareOptions(playersArr);

    // KPIs
    document.getElementById('kpis-container').innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h4 class="text-xs font-bold text-slate-400 uppercase">Jogos</h4>
            <p class="text-3xl font-bold text-slate-800 mt-1">${games.length}</p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h4 class="text-xs font-bold text-slate-400 uppercase">Total Gols</h4>
            <p class="text-3xl font-bold text-blue-600 mt-1">${totalGoals}</p>
            <p class="text-xs text-slate-500 mt-1">M\u00e9dia: ${(totalGoals/games.length).toFixed(2)}</p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h4 class="text-xs font-bold text-slate-400 uppercase">Jogo + Movimentado</h4>
            <p class="text-xl font-bold text-slate-800 mt-1">${maxGoalsGame.val} Gols</p>
            <p class="text-xs text-slate-500 mt-1">${escapeHtml(maxGoalsGame.desc)}</p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h4 class="text-xs font-bold text-slate-400 uppercase">Maior Goleada</h4>
            <p class="text-xl font-bold text-slate-800 mt-1">${maxDiffGame.val} Gols Dif.</p>
            <p class="text-xs text-slate-500 mt-1">${escapeHtml(maxDiffGame.desc)}</p>
        </div>
    `;
    document.getElementById('last-update').innerText = `Atualizado: ${new Date().toLocaleDateString()}`;

    // Times
    document.getElementById('team-stats-container').innerHTML = `
        <div class="flex justify-between items-center bg-slate-50 p-3 rounded mb-2">
            <span class="font-bold flex items-center gap-2"><span class="inline-block h-3 w-3 rounded-full bg-slate-700"></span>Cinza</span>
            <span class="text-sm">${teamStats.cinza.w}V - ${teamStats.cinza.l}D - ${teamStats.cinza.d}E (${teamStats.cinza.g} Gols)</span>
        </div>
        <div class="flex justify-between items-center bg-white border border-slate-200 p-3 rounded">
            <span class="font-bold flex items-center gap-2"><span class="inline-block h-3 w-3 rounded-full bg-amber-400 border border-amber-500"></span>Branco</span>
            <span class="text-sm">${teamStats.branco.w}V - ${teamStats.branco.l}D - ${teamStats.branco.d}E (${teamStats.branco.g} Gols)</span>
        </div>
    `;

    // Ranking
    const sortedRanking = getOverallRanking(playersArr);
    document.getElementById('ranking-body').innerHTML = sortedRanking.map(p => `
        <tr class="hover:bg-slate-50 transition">
            <td class="px-6 py-3 whitespace-nowrap font-medium text-slate-700">
                <button type="button" class="player-detail-link" data-player="${escapeHtml(p.name)}">${escapeHtml(p.name)}</button>
            </td>
            <td class="px-6 py-3 whitespace-nowrap text-slate-500">${p.matches}</td>
            <td class="px-6 py-3 whitespace-nowrap text-green-600 font-bold">${p.wins}</td>
            <td class="px-6 py-3 whitespace-nowrap text-red-500">${p.losses}</td>
            <td class="px-6 py-3 whitespace-nowrap text-blue-500">${p.draws}</td>
            <td class="px-6 py-3 whitespace-nowrap text-slate-900 font-bold text-lg">${p.points}</td>
            <td class="px-6 py-3 whitespace-nowrap text-slate-500">${formatPct((p.points / (p.matches * 3)) * 100)}</td>
            <td class="px-6 py-3 whitespace-nowrap text-slate-500">
                ${renderRecentForm(p.lastResults)}
            </td>
        </tr>
    `).join('');

    // Goleiros
    const gkArr = getGoalkeeperRanking(playersArr, minimums.gk);
    document.getElementById('gk-body').innerHTML = gkArr.map((p, idx) => {
        const media = (p.gkGoals / p.gkMatches).toFixed(2);
        const aproveitamento = formatPct((p.gkPoints / (p.gkMatches * 3)) * 100);
        return `
        <tr class="hover:bg-slate-50">
            <td class="px-4 py-2 font-bold text-slate-700">${idx + 1}</td>
            <td class="px-4 py-2 font-medium">
                <button type="button" class="player-detail-link" data-player="${escapeHtml(p.name)}">${escapeHtml(p.name)}</button>
            </td>
            <td class="px-4 py-2 font-bold text-blue-600">${p.gkPoints}</td>
            <td class="px-4 py-2 text-xs text-slate-500">${aproveitamento}</td>
            <td class="px-4 py-2">${p.gkMatches}</td>
            <td class="px-4 py-2">${p.gkGoals}</td>
            <td class="px-4 py-2">${p.gkWins}V / ${p.gkDraws}E / ${p.gkLosses}D</td>
            <td class="px-4 py-2 font-bold">${media}</td>
            <td class="px-4 py-2 text-slate-500">${p.gkLastDate || '-'}</td>
        </tr>
    `;
    }).join('');

    renderPlayerComparison();

    // Duplas
    const duoBase = Object.entries(duos)
        .map(([name, stats]) => ({ name, ...stats, ppg: stats.points/stats.games }))
        .filter(d => d.games >= 4);
    const bestDuos = [...duoBase].sort((a,b) => b.ppg - a.ppg).slice(0, 5);
    const worstDuos = [...duoBase].sort((a,b) => a.ppg - b.ppg).slice(0, 5);

    document.getElementById('duo-body').innerHTML = bestDuos.map(d => `
        <tr>
            <td class="px-6 py-3 font-medium text-slate-700">${escapeHtml(d.name)}</td>
            <td class="px-6 py-3 text-slate-500">${d.games}</td>
            <td class="px-6 py-3 font-bold text-green-600">${d.ppg.toFixed(2)}</td>
        </tr>
    `).join('');
    document.getElementById('duo-worst-body').innerHTML = worstDuos.map(d => `
        <tr>
            <td class="px-6 py-3 font-medium text-slate-700">${escapeHtml(d.name)}</td>
            <td class="px-6 py-3 text-slate-500">${d.games}</td>
            <td class="px-6 py-3 font-bold text-red-600">${d.ppg.toFixed(2)}</td>
        </tr>
    `).join('');

    // Últimos jogos
    const gamesById = [...orderedGames];
    const gameSelect = document.getElementById('game-select');
    gameSelect.innerHTML = gamesById.slice().reverse().map(g => `<option value="${g.id}">Jogo ${g.id} - ${escapeHtml(g.data)} (${g.placar.cinza}x${g.placar.branco})</option>`).join('');

    const renderTeamCard = (team, label, colors) => `
        <div class="rounded-lg p-4 border" style="background:${colors.bg}; border-color:${colors.border};">
            <div class="flex items-center justify-between mb-2">
                <p class="text-sm font-semibold" style="color:${colors.text};">${label}</p>
                <span class="text-xs bg-white px-2 py-1 rounded border" style="color:${colors.text}; border-color:${colors.border};">Goleiro: ${escapeHtml(standardize(team.goleiro))}</span>
            </div>
            <p class="text-xs uppercase mb-1" style="color:${colors.muted};">Linha</p>
            <div class="flex flex-wrap gap-2 text-sm">
                ${team.linha.map(p => `<span class="px-2 py-1 bg-white border rounded" style="border-color:${colors.border};">${escapeHtml(standardize(p))}</span>`).join('')}
            </div>
        </div>
    `;

    const renderGame = (game) => {
        document.getElementById('game-score').innerHTML = `
            <div class="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p class="text-xs uppercase text-slate-500">Jogo ${game.id} - ${escapeHtml(game.data)}</p>
                <p class="text-2xl font-bold text-slate-800 my-2"><span class="text-slate-500">Cinza</span> ${game.placar.cinza} x ${game.placar.branco} <span class="text-amber-600">Branco</span></p>
                <p class="text-sm text-slate-500">Resultado mais recente</p>
            </div>
            ${renderTeamCard(game.cinza, 'Time Cinza', { bg:'#f8fafc', border:'#cbd5e1', text:'#0f172a', muted:'#64748b' })}
            ${renderTeamCard(game.branco, 'Time Branco', { bg:'#fff7ed', border:'#fbbf24', text:'#92400e', muted:'#b45309' })}
        `;
    };

    renderGame(gamesById[gamesById.length - 1]);
    gameSelect.addEventListener('change', (e) => {
        const selected = gamesById.find(g => g.id === parseInt(e.target.value, 10));
        if (selected) renderGame(selected);
    });

    // Streaks
    const unbeatenLeader = playersArr.reduce((best, p) => p.bestUnbeaten > (best?.bestUnbeaten || 0) ? p : best, null);
    const winLeader = playersArr.reduce((best, p) => p.bestWin > (best?.bestWin || 0) ? p : best, null);
    const droughtLeader = playersArr
        .reduce((best, p) => {
            if (!best || p.currentNoWin > best.currentNoWin) return p;
            if (p.currentNoWin === best.currentNoWin && p.name.localeCompare(best.name, 'pt-BR') < 0) return p;
            return best;
        }, null);

    document.getElementById('streaks-container').innerHTML = `
        <div class="bg-white border border-slate-200 rounded-lg p-4">
            <p class="text-xs uppercase text-slate-500 font-semibold">Maior Invencibilidade</p>
            <p class="text-lg font-bold text-slate-800 mt-1">${unbeatenLeader ? escapeHtml(unbeatenLeader.name) : '-'}</p>
            <p class="text-sm text-slate-500">${unbeatenLeader ? `${unbeatenLeader.bestUnbeaten} jogos sem perder` : 'Sem dados'}</p>
        </div>
        <div class="bg-white border border-slate-200 rounded-lg p-4">
            <p class="text-xs uppercase text-slate-500 font-semibold">Maior Sequ\u00eancia de Vit\u00f3rias</p>
            <p class="text-lg font-bold text-slate-800 mt-1">${winLeader ? escapeHtml(winLeader.name) : '-'}</p>
            <p class="text-sm text-slate-500">${winLeader ? `${winLeader.bestWin} vit\u00f3rias seguidas` : 'Sem dados'}</p>
        </div>
        <div class="bg-white border border-slate-200 rounded-lg p-4">
            <p class="text-xs uppercase text-slate-500 font-semibold">Seca de Vit\u00f3rias</p>
            <p class="text-lg font-bold text-slate-800 mt-1">${droughtLeader ? escapeHtml(droughtLeader.name) : '-'}</p>
            <p class="text-sm text-slate-500">${droughtLeader ? `${droughtLeader.currentNoWin} jogos sem vencer` : 'Sem dados'}</p>
        </div>
    `;
}

// Ordenação de tabelas
function sortTable(tableId, colIndex) {
    const table = document.getElementById(tableId);
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const isAsc = table.getAttribute('data-order') === 'asc';
    const parseSortValue = (text) => {
        const clean = text.trim().replace('%','');
        const brDate = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (brDate) {
            const [, dd, mm, yyyy] = brDate;
            return Number(`${yyyy}${mm}${dd}`);
        }
        const numeric = Number(clean.replace(',', '.'));
        return Number.isFinite(numeric) && clean !== '' ? numeric : clean;
    };
    
    rows.sort((a, b) => {
        const valA = parseSortValue(a.cells[colIndex].innerText);
        const valB = parseSortValue(b.cells[colIndex].innerText);
        if (typeof valA === 'number' && typeof valB === 'number') {
            return isAsc ? valA - valB : valB - valA;
        }
        return isAsc
            ? String(valA).localeCompare(String(valB), undefined, {numeric: true})
            : String(valB).localeCompare(String(valA), undefined, {numeric: true});
    });

    table.setAttribute('data-order', isAsc ? 'desc' : 'asc');
    tbody.append(...rows);
}
