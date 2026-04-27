const SUPABASE_URL = 'https://lfwzjyiaqdngbcecaouu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_oCgYlTOm2NGBNZ7YhpMi2w_I7E2V_Fn';
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
const DEFAULT_FILTER_START_SETTING_KEY = 'default_filter_start_date';
const TEAM_DRAW_STORAGE_KEY = 'futstats_last_team_draw';

let gamesAdmin = [];
let playersAdmin = [];

async function getDefaultFilterStartDateSetting() {
    const { data, error } = await supabaseClient
        .from('app_settings')
        .select('key, value')
        .eq('key', DEFAULT_FILTER_START_SETTING_KEY)
        .maybeSingle();
    if (error) throw error;
    return data && /^\d{4}-\d{2}-\d{2}$/.test(data.value) ? data.value : '';
}

async function setDefaultFilterStartDateSetting(value) {
    if (!value) {
        const { error } = await supabaseClient.from('app_settings').delete().eq('key', DEFAULT_FILTER_START_SETTING_KEY);
        if (error) throw error;
        return;
    }

    const { data: existing, error: existingError } = await supabaseClient
        .from('app_settings')
        .select('key')
        .eq('key', DEFAULT_FILTER_START_SETTING_KEY)
        .maybeSingle();
    if (existingError) throw existingError;

    if (existing) {
        const { error } = await supabaseClient
            .from('app_settings')
            .update({ value, updated_at: new Date().toISOString() })
            .eq('key', DEFAULT_FILTER_START_SETTING_KEY);
        if (error) throw error;
        return;
    }

    const { error } = await supabaseClient
        .from('app_settings')
        .insert({ key: DEFAULT_FILTER_START_SETTING_KEY, value });
    if (error) throw error;
}

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
    initAdminActions();
    loadAdminData();
    initAddGameForm();
    initAddPlayerForm();
    initEditPlayerForm();
    initRemovePlayer();
    initRatingsViewer();
    initGameAudit();
    initExportData();
    initDefaultFilterSettings();
    initStoredTeamDraw();
}

function initLogout() {
    const btn = document.getElementById('admin-logout');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.reload();
    });
}

function initAdminActions() {
    const buttons = Array.from(document.querySelectorAll('.admin-action-btn'));
    const sections = Array.from(document.querySelectorAll('.admin-section'));
    if (buttons.length === 0 || sections.length === 0) return;

    const showSection = (id) => {
        sections.forEach(section => {
            section.classList.toggle('hidden', section.id !== id);
        });
        buttons.forEach(btn => {
            btn.classList.toggle('admin-action-btn--active', btn.dataset.adminSection === id);
        });
    };

    buttons.forEach(btn => {
        btn.addEventListener('click', () => showSection(btn.dataset.adminSection));
    });

    showSection(buttons[0].dataset.adminSection);
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

function initDefaultFilterSettings() {
    const form = document.getElementById('default-filter-form');
    const input = document.getElementById('default-filter-start-date');
    const clearBtn = document.getElementById('default-filter-clear');
    const currentEl = document.getElementById('default-filter-current');
    const statusEl = document.getElementById('default-filter-status');
    if (!form || !input || !currentEl || !statusEl) return;

    const refreshView = async () => {
        const stored = await getDefaultFilterStartDateSetting();
        input.value = stored;
        currentEl.textContent = stored
            ? `Filtro inicial atual: ${stored.split('-').reverse().join('/')}`
            : 'Filtro inicial atual: histórico completo';
    };

    refreshView().catch((err) => {
        console.error('Erro ao carregar filtro padrão:', err);
        statusEl.textContent = 'Não foi possível carregar o filtro padrão.';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        statusEl.textContent = '';
        const value = input.value;
        if (!value) {
            statusEl.textContent = 'Escolha uma data ou use limpar.';
            return;
        }
        try {
            await setDefaultFilterStartDateSetting(value);
            statusEl.textContent = 'Filtro inicial salvo. Recarregue o dashboard se ele já estiver aberto.';
            await refreshView();
        } catch (err) {
            console.error('Erro ao salvar filtro padrão:', err);
            statusEl.textContent = `Não foi possível salvar o filtro inicial. ${err.message || ''}`.trim();
        }
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            statusEl.textContent = '';
            try {
                await setDefaultFilterStartDateSetting('');
                statusEl.textContent = 'Filtro inicial removido. Recarregue o dashboard se ele já estiver aberto.';
                await refreshView();
            } catch (err) {
                console.error('Erro ao limpar filtro padrão:', err);
                statusEl.textContent = `Não foi possível limpar o filtro inicial. ${err.message || ''}`.trim();
            }
        });
    }
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
    renderRatingsViewer();
    rebuildGameAuditOptions();
    renderGameAudit();
    renderStoredTeamDrawPanel();
    maybeAutoRecomputeRatings();
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function toBrDate(isoDate) {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';
    const [yyyy, mm, dd] = isoDate.split('-');
    return `${dd}/${mm}/${yyyy}`;
}

function toIsoDate(brDate) {
    if (!brDate || !/^\d{2}\/\d{2}\/\d{4}$/.test(brDate)) return '';
    const [dd, mm, yyyy] = brDate.split('/');
    return `${yyyy}-${mm}-${dd}`;
}

function brDateToTime(brDate) {
    const iso = toIsoDate(brDate);
    if (!iso) return 0;
    return Date.parse(`${iso}T00:00:00Z`) || 0;
}

function getSelectedValues(id) {
    const el = document.getElementById(id);
    return el ? Array.from(el.selectedOptions).map(o => o.value) : [];
}

function validateGamePayload({ dateVal, gkC, gkB, lineC, lineB }) {
    if (!dateVal || lineC.length === 0 || lineB.length === 0) {
        return 'Preencha data e selecione pelo menos um jogador em cada linha.';
    }
    if (!gkC || !gkB) return 'Selecione os dois goleiros.';
    if (gkC === gkB) return 'Os goleiros precisam ser diferentes.';

    const lineSetC = new Set(lineC);
    const lineSetB = new Set(lineB);
    const repeatedLine = lineC.find(name => lineSetB.has(name));
    if (repeatedLine) return `${repeatedLine} esta nas duas linhas.`;
    if (lineSetC.has(gkC) || lineSetB.has(gkC)) return `${gkC} esta como goleiro e jogador de linha.`;
    if (lineSetC.has(gkB) || lineSetB.has(gkB)) return `${gkB} esta como goleiro e jogador de linha.`;
    return '';
}

function getGameWarnings(game) {
    const warnings = [];
    const lineC = game.cinza?.linha || [];
    const lineB = game.branco?.linha || [];
    const gkC = game.cinza?.goleiro || '';
    const gkB = game.branco?.goleiro || '';
    if (!game.data) warnings.push('sem data');
    if (!gkC || !gkB) warnings.push('goleiro faltando');
    if (gkC && gkB && gkC === gkB) warnings.push('goleiros iguais');
    if (lineC.length === 0 || lineB.length === 0) warnings.push('linha vazia');
    if (lineC.length !== lineB.length) warnings.push('times com tamanhos diferentes');
    const setC = new Set(lineC);
    const repeated = lineB.find(name => setC.has(name));
    if (repeated) warnings.push(`${repeated} nos dois times`);
    if (lineC.includes(gkC) || lineB.includes(gkC)) warnings.push(`${gkC} goleiro e linha`);
    if (lineC.includes(gkB) || lineB.includes(gkB)) warnings.push(`${gkB} goleiro e linha`);
    return warnings;
}

function formatRatingValue(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : '-';
}

function getRatingBadgeClass(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 'admin-rating-badge admin-rating-badge--empty';
    if (value >= 7) return 'admin-rating-badge admin-rating-badge--high';
    if (value >= 4) return 'admin-rating-badge admin-rating-badge--mid';
    return 'admin-rating-badge admin-rating-badge--low';
}

function formatPlayerPositions(player) {
    const positions = Array.isArray(player.posicao) && player.posicao.length > 0
        ? player.posicao
        : [];
    return positions.length > 0 ? positions.join(', ') : '-';
}

function initRatingsViewer() {
    const searchInput = document.getElementById('ratings-search');
    if (!searchInput) return;
    searchInput.addEventListener('input', renderRatingsViewer);
}

function renderRatingsViewer() {
    const tbody = document.getElementById('ratings-table-body');
    const summary = document.getElementById('ratings-summary');
    const empty = document.getElementById('ratings-empty');
    const searchInput = document.getElementById('ratings-search');
    if (!tbody || !summary || !empty) return;

    const query = (searchInput?.value || '').trim().toLowerCase();
    const filtered = [...playersAdmin]
        .filter(player => !query || String(player.nome || '').toLowerCase().includes(query))
        .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));

    const withLineRating = playersAdmin.filter(player => typeof player.rating_linha === 'number').length;
    const withGkRating = playersAdmin.filter(player => typeof player.rating_gk === 'number').length;
    summary.textContent = `${playersAdmin.length} atletas cadastrados. ${withLineRating} com rating de linha e ${withGkRating} com rating de goleiro.`;
    empty.classList.toggle('hidden', filtered.length > 0);

    tbody.innerHTML = filtered.map(player => `
        <tr class="hover:bg-slate-50">
            <td class="px-3 py-2 font-semibold text-slate-800">${escapeHtml(player.nome)}</td>
            <td class="px-3 py-2">
                <span class="${getRatingBadgeClass(player.rating_linha)}" title="Rating de linha: pontos por jogo com peso maior para jogos recentes.">${formatRatingValue(player.rating_linha)}</span>
            </td>
            <td class="px-3 py-2">
                <span class="${getRatingBadgeClass(player.rating_gk)}" title="Rating de goleiro: nota de 0 a 10 baseada na média de gols sofridos.">${formatRatingValue(player.rating_gk)}</span>
            </td>
            <td class="px-3 py-2 text-slate-600">${escapeHtml(formatPlayerPositions(player))}</td>
            <td class="px-3 py-2 text-slate-600">${player.goleiro ? 'Linha e goleiro' : 'Linha'}</td>
        </tr>
    `).join('');
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
        .map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.nome)}</option>`)
        .join('');
}

function rebuildEditPlayerOptions() {
    const select = document.getElementById('edit-player-select');
    if (!select) return;
    select.innerHTML = playersAdmin
        .map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.nome)}</option>`)
        .join('');
    if (playersAdmin.length > 0) {
        select.value = playersAdmin[0].id;
        fillEditPlayerForm(playersAdmin[0]);
    }
}

function fillSelect(id, options, multiple = false) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = options.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
    if (multiple) el.setAttribute('multiple', 'multiple');
}

function rebuildGameAuditOptions() {
    const names = playersAdmin.map(p => p.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    fillSelect('edit-gk-cinza', names);
    fillSelect('edit-gk-branco', names);
    fillSelect('edit-line-cinza', names, true);
    fillSelect('edit-line-branco', names, true);
}

function renderGameAudit() {
    const tbody = document.getElementById('game-audit-body');
    const searchInput = document.getElementById('game-audit-search');
    const sortSelect = document.getElementById('game-audit-sort');
    if (!tbody) return;
    const query = (searchInput?.value || '').trim().toLowerCase();
    const sortMode = sortSelect?.value || 'id-desc';
    const filtered = gamesAdmin
        .filter(game => {
            const haystack = [
                game.id,
                game.data,
                game.cinza?.goleiro,
                game.branco?.goleiro,
                ...(game.cinza?.linha || []),
                ...(game.branco?.linha || [])
            ].join(' ').toLowerCase();
            return !query || haystack.includes(query);
        })
        .slice();

    filtered.sort((a, b) => {
        if (sortMode === 'id-asc') return a.id - b.id;
        if (sortMode === 'date-desc') return brDateToTime(b.data) - brDateToTime(a.data) || b.id - a.id;
        if (sortMode === 'date-asc') return brDateToTime(a.data) - brDateToTime(b.data) || a.id - b.id;
        return b.id - a.id;
    });

    tbody.innerHTML = filtered.map(game => `
        ${(() => {
            const warnings = getGameWarnings(game);
            return `
        <tr class="hover:bg-slate-50 ${warnings.length > 0 ? 'bg-amber-50/50' : ''}">
            <td class="px-3 py-2 font-semibold text-slate-800">${game.id}</td>
            <td class="px-3 py-2">${escapeHtml(game.data)}</td>
            <td class="px-3 py-2">${game.placar?.cinza ?? 0} x ${game.placar?.branco ?? 0}</td>
            <td class="px-3 py-2 text-slate-600">${escapeHtml(game.cinza?.goleiro || '-')} / ${escapeHtml(game.branco?.goleiro || '-')}</td>
            <td class="px-3 py-2 text-slate-600">${game.cinza?.linha?.length || 0} x ${game.branco?.linha?.length || 0}</td>
            <td class="px-3 py-2 text-xs text-amber-700">${warnings.length > 0 ? escapeHtml(warnings.join('; ')) : '-'}</td>
            <td class="px-3 py-2">
                <div class="flex flex-wrap gap-2">
                    <button type="button" class="game-edit-btn text-xs font-semibold text-blue-700 hover:text-blue-900" data-game-id="${game.id}">Editar</button>
                    <button type="button" class="game-duplicate-btn text-xs font-semibold text-emerald-700 hover:text-emerald-900" data-game-id="${game.id}">Duplicar</button>
                    <button type="button" class="game-delete-btn text-xs font-semibold text-red-700 hover:text-red-900" data-game-id="${game.id}">Remover</button>
                </div>
            </td>
        </tr>
            `;
        })()}
    `).join('');
}

function fillMultiSelect(id, values) {
    const select = document.getElementById(id);
    if (!select) return;
    const set = new Set(values || []);
    Array.from(select.options).forEach(option => {
        option.selected = set.has(option.value);
    });
}

function openEditGame(game) {
    const form = document.getElementById('edit-game-form');
    const statusEl = document.getElementById('edit-game-status');
    if (!form || !game) return;
    form.classList.remove('hidden');
    if (statusEl) statusEl.textContent = '';
    document.getElementById('edit-game-title').textContent = `Editar jogo ${game.id}`;
    document.getElementById('edit-game-id').value = game.id;
    document.getElementById('edit-game-mode').value = 'edit';
    document.getElementById('edit-game-date').value = toIsoDate(game.data);
    document.getElementById('edit-score-cinza').value = game.placar?.cinza ?? 0;
    document.getElementById('edit-score-branco').value = game.placar?.branco ?? 0;
    document.getElementById('edit-gk-cinza').value = game.cinza?.goleiro || '';
    document.getElementById('edit-gk-branco').value = game.branco?.goleiro || '';
    fillMultiSelect('edit-line-cinza', game.cinza?.linha || []);
    fillMultiSelect('edit-line-branco', game.branco?.linha || []);
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openDuplicateGame(game) {
    openEditGame(game);
    const title = document.getElementById('edit-game-title');
    const idInput = document.getElementById('edit-game-id');
    const modeInput = document.getElementById('edit-game-mode');
    const statusEl = document.getElementById('edit-game-status');
    if (title) title.textContent = `Duplicar jogo ${game.id}`;
    if (idInput) idInput.value = '';
    if (modeInput) modeInput.value = 'duplicate';
    if (statusEl) statusEl.textContent = 'Ajuste a data e salve para criar um novo jogo.';
}

function closeEditGame() {
    const form = document.getElementById('edit-game-form');
    if (!form) return;
    form.classList.add('hidden');
    form.reset();
}

function initGameAudit() {
    const searchInput = document.getElementById('game-audit-search');
    const sortSelect = document.getElementById('game-audit-sort');
    const tbody = document.getElementById('game-audit-body');
    const form = document.getElementById('edit-game-form');
    const cancelBtn = document.getElementById('edit-game-cancel');
    if (searchInput) searchInput.addEventListener('input', renderGameAudit);
    if (sortSelect) sortSelect.addEventListener('change', renderGameAudit);
    if (cancelBtn) cancelBtn.addEventListener('click', closeEditGame);

    if (tbody) {
        tbody.addEventListener('click', async (event) => {
            const editBtn = event.target.closest('.game-edit-btn');
            const duplicateBtn = event.target.closest('.game-duplicate-btn');
            const deleteBtn = event.target.closest('.game-delete-btn');
            if (editBtn) {
                const game = gamesAdmin.find(g => String(g.id) === editBtn.dataset.gameId);
                openEditGame(game);
                return;
            }
            if (duplicateBtn) {
                const game = gamesAdmin.find(g => String(g.id) === duplicateBtn.dataset.gameId);
                if (game) openDuplicateGame(game);
                return;
            }
            if (deleteBtn) {
                const game = gamesAdmin.find(g => String(g.id) === deleteBtn.dataset.gameId);
                if (!game) return;
                const ok = window.confirm(`Remover o jogo ${game.id} de ${game.data}?`);
                if (!ok) return;
                const { error } = await supabaseClient.from('games').delete().eq('id', game.id);
                if (error) {
                    console.error(error);
                    return;
                }
                await recomputeRatingsAndUpdate();
                await loadAdminData();
                closeEditGame();
            }
        });
    }

    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const statusEl = document.getElementById('edit-game-status');
            if (statusEl) statusEl.textContent = '';
            const id = document.getElementById('edit-game-id').value;
            const mode = document.getElementById('edit-game-mode').value;
            const dateVal = document.getElementById('edit-game-date').value;
            const scoreC = parseInt(document.getElementById('edit-score-cinza').value, 10) || 0;
            const scoreB = parseInt(document.getElementById('edit-score-branco').value, 10) || 0;
            const gkC = document.getElementById('edit-gk-cinza').value;
            const gkB = document.getElementById('edit-gk-branco').value;
            const lineC = getSelectedValues('edit-line-cinza');
            const lineB = getSelectedValues('edit-line-branco');
            const validationError = validateGamePayload({ dateVal, gkC, gkB, lineC, lineB });
            if (validationError) {
                if (statusEl) statusEl.textContent = validationError;
                return;
            }
            const payload = {
                data: toBrDate(dateVal),
                cinza: { goleiro: gkC, linha: lineC },
                branco: { goleiro: gkB, linha: lineB },
                placar: { cinza: scoreC, branco: scoreB }
            };
            const request = mode === 'duplicate'
                ? supabaseClient.from('games').insert(payload)
                : supabaseClient.from('games').update(payload).eq('id', id);
            const { error } = await request;
            if (error) {
                if (statusEl) statusEl.textContent = 'Erro ao salvar jogo.';
                console.error(error);
                return;
            }
            await recomputeRatingsAndUpdate();
            await loadAdminData();
            if (statusEl) statusEl.textContent = mode === 'duplicate'
                ? 'Novo jogo criado e ratings recalculados.'
                : 'Jogo atualizado e ratings recalculados.';
        });
    }
}

function downloadTextFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function csvEscape(value) {
    const text = String(value ?? '');
    return /[",\r\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function gamesToCsv(games) {
    const rows = [['id', 'data', 'placar_cinza', 'placar_branco', 'goleiro_cinza', 'goleiro_branco', 'linha_cinza', 'linha_branco']];
    games.forEach(game => {
        rows.push([
            game.id,
            game.data,
            game.placar?.cinza ?? 0,
            game.placar?.branco ?? 0,
            game.cinza?.goleiro || '',
            game.branco?.goleiro || '',
            (game.cinza?.linha || []).join('|'),
            (game.branco?.linha || []).join('|')
        ]);
    });
    return rows.map(row => row.map(csvEscape).join(';')).join('\r\n');
}

function getStoredTeamDraw() {
    try {
        const raw = localStorage.getItem(TEAM_DRAW_STORAGE_KEY);
        if (!raw) return null;
        const draw = JSON.parse(raw);
        if (!draw?.cinza?.goleiro || !draw?.branco?.goleiro) return null;
        return {
            savedAt: draw.savedAt || '',
            cinza: {
                goleiro: draw.cinza.goleiro,
                linha: Array.isArray(draw.cinza.linha) ? draw.cinza.linha : []
            },
            branco: {
                goleiro: draw.branco.goleiro,
                linha: Array.isArray(draw.branco.linha) ? draw.branco.linha : []
            }
        };
    } catch (err) {
        console.warn('Sorteio salvo invalido:', err);
        return null;
    }
}

function formatStoredDrawTime(value) {
    if (!value) return 'data desconhecida';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'data desconhecida';
    return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function renderStoredTeamDrawPanel() {
    const panel = document.getElementById('stored-team-draw');
    const summary = document.getElementById('stored-team-draw-summary');
    if (!panel || !summary) return;
    const draw = getStoredTeamDraw();
    panel.classList.toggle('hidden', !draw);
    if (!draw) {
        summary.textContent = '';
        return;
    }
    summary.textContent = `Sorteio salvo em ${formatStoredDrawTime(draw.savedAt)}: ${draw.cinza.linha.length + 1} no Cinza e ${draw.branco.linha.length + 1} no Branco.`;
}

function selectValue(id, value) {
    const select = document.getElementById(id);
    if (!select) return;
    select.value = value || '';
}

function applyStoredTeamDrawToAddForm() {
    const draw = getStoredTeamDraw();
    const statusEl = document.getElementById('add-game-status');
    if (!draw) {
        if (statusEl) statusEl.textContent = 'Nenhum sorteio salvo para carregar.';
        renderStoredTeamDrawPanel();
        return;
    }
    selectValue('add-gk-cinza', draw.cinza.goleiro);
    selectValue('add-gk-branco', draw.branco.goleiro);
    fillMultiSelect('add-line-cinza', draw.cinza.linha);
    fillMultiSelect('add-line-branco', draw.branco.linha);
    if (statusEl) statusEl.textContent = 'Sorteio carregado. Revise os times, informe data e placar, depois salve.';
}

function clearStoredTeamDraw() {
    localStorage.removeItem(TEAM_DRAW_STORAGE_KEY);
    renderStoredTeamDrawPanel();
}

function initStoredTeamDraw() {
    const loadBtn = document.getElementById('load-stored-team-draw');
    const clearBtn = document.getElementById('clear-stored-team-draw');
    if (loadBtn) loadBtn.addEventListener('click', applyStoredTeamDrawToAddForm);
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            clearStoredTeamDraw();
            const statusEl = document.getElementById('add-game-status');
            if (statusEl) statusEl.textContent = 'Sorteio salvo removido.';
        });
    }
    renderStoredTeamDrawPanel();
}

function playersToCsv(players) {
    const rows = [['id', 'nome', 'posicao', 'posicao_secundaria', 'goleiro', 'rating_linha', 'rating_gk']];
    players.forEach(player => {
        rows.push([
            player.id,
            player.nome,
            (player.posicao || []).join('|'),
            (player.posicao_secundaria || []).join('|'),
            player.goleiro ? 'true' : 'false',
            player.rating_linha ?? '',
            player.rating_gk ?? ''
        ]);
    });
    return rows.map(row => row.map(csvEscape).join(';')).join('\r\n');
}

function initExportData() {
    const jsonBtn = document.getElementById('export-json');
    const gamesBtn = document.getElementById('export-games-csv');
    const playersBtn = document.getElementById('export-players-csv');
    const statusEl = document.getElementById('export-status');
    const stamp = () => new Date().toISOString().slice(0, 10);

    if (jsonBtn) {
        jsonBtn.addEventListener('click', () => {
            const payload = { exported_at: new Date().toISOString(), games: gamesAdmin, players: playersAdmin };
            downloadTextFile(`futstats-backup-${stamp()}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
            if (statusEl) statusEl.textContent = 'Backup JSON gerado.';
        });
    }
    if (gamesBtn) {
        gamesBtn.addEventListener('click', () => {
            downloadTextFile(`futstats-jogos-${stamp()}.csv`, gamesToCsv(gamesAdmin), 'text/csv;charset=utf-8');
            if (statusEl) statusEl.textContent = 'CSV de jogos gerado.';
        });
    }
    if (playersBtn) {
        playersBtn.addEventListener('click', () => {
            downloadTextFile(`futstats-atletas-${stamp()}.csv`, playersToCsv(playersAdmin), 'text/csv;charset=utf-8');
            if (statusEl) statusEl.textContent = 'CSV de atletas gerado.';
        });
    }
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
        const lineC = getSelectedValues('add-line-cinza');
        const lineB = getSelectedValues('add-line-branco');

        const validationError = validateGamePayload({ dateVal, gkC, gkB, lineC, lineB });
        if (validationError) {
            if (statusEl) statusEl.textContent = validationError;
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
        await recomputeRatingsAndUpdate();
        await loadAdminData();
        if (statusEl) statusEl.textContent = 'Jogo salvo e ratings atualizados.';
        clearStoredTeamDraw();
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
            if (statusEl) statusEl.textContent = 'Esse atleta já existe.';
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
        if ((ratingLineVal !== null && (!Number.isFinite(ratingLineVal) || ratingLineVal < 0 || ratingLineVal > 10)) ||
            (ratingGkVal !== null && (!Number.isFinite(ratingGkVal) || ratingGkVal < 0 || ratingGkVal > 10))) {
            if (statusEl) statusEl.textContent = 'Ratings precisam estar entre 0 e 10.';
            return;
        }

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
