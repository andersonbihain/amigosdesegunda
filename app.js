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

function standardize(name) {
    if (!name) return 'Desconhecido';
    const lower = name.toString().trim().toLowerCase();
    return NAME_MAPPING[lower] || name.charAt(0).toUpperCase() + name.slice(1);
}

// --- ESTADO GLOBAL ---
let originalGames = [];
let dateValues = [];
let playerOptions = [];
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

document.addEventListener('DOMContentLoaded', () => {
    initTeamPicker();
    fetch('games.json')
        .then(res => res.json())
        .then(data => {
            originalGames = data;
            rebuildPlayerOptions(originalGames);
            initDateFilter();
            initAddGameForm();
            applyFilter();
        })
        .catch(err => console.error('Erro ao carregar dados:', err));
});

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
    startRange.min = 0; startRange.max = maxIdx; startRange.value = 0;
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
    games.forEach(g => {
        set.add(standardize(g.cinza.goleiro));
        set.add(standardize(g.branco.goleiro));
        g.cinza.linha.forEach(n => set.add(standardize(n)));
        g.branco.linha.forEach(n => set.add(standardize(n)));
    });
    playerOptions = Array.from(set).sort();
    const renderSelect = (id, multiple=false) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = playerOptions.map(p => `<option value="${p}">${p}</option>`).join('');
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
        rebuildPlayerOptions(originalGames);
        initDateFilter();
        applyFilter();
        statusEl.textContent = `Jogo ${nextId} adicionado (somente nesta sessão).`;
        form.reset();
    });
}

function updateTeamPickerCount() {
    const countEl = document.getElementById('team-picker-count');
    if (!countEl) return;
    const selected = document.querySelectorAll('input[name="team-player"]:checked').length;
    countEl.textContent = selected;
}

function renderTeamPickerPlaceholder() {
    const results = document.getElementById('team-draw-results');
    if (!results) return;
    results.innerHTML = `
        <div class="border border-slate-200 rounded-lg p-4">
            <p class="text-sm font-semibold text-slate-700 mb-2">Time Cinza</p>
            <div class="text-xs text-slate-500">Aguardando sorteio.</div>
        </div>
        <div class="border border-slate-200 rounded-lg p-4">
            <p class="text-sm font-semibold text-slate-700 mb-2">Time Branco</p>
            <div class="text-xs text-slate-500">Aguardando sorteio.</div>
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
    const optionsHtml = teamPickerOptions.map(p => `<option value="${p}">${p}</option>`).join('');

    gkCinza.innerHTML = optionsHtml;
    gkBranco.innerHTML = optionsHtml;
    if (currentCinza) gkCinza.value = currentCinza;
    if (currentBranco) gkBranco.value = currentBranco;

    list.innerHTML = teamPickerOptions.map((p, idx) => `
        <label class="flex items-center gap-2 text-xs bg-white border border-slate-200 rounded px-2 py-1">
            <input id="team-player-${idx}" type="checkbox" name="team-player" value="${p}" class="rounded border-slate-300">
            <span>${p}</span>
        </label>
    `).join('');

    list.querySelectorAll('input[name="team-player"]').forEach(input => {
        input.addEventListener('change', updateTeamPickerCount);
    });
    updateTeamPickerCount();
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
    const clearBtn = document.getElementById('team-picker-clear');
    const selectAllBtn = document.getElementById('team-picker-select-all');
    const unselectAllBtn = document.getElementById('team-picker-unselect-all');
    const statusEl = document.getElementById('team-picker-status');

    const closeModal = () => {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    };
    const openModal = () => {
        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
        if (statusEl) statusEl.textContent = '';
        updateTeamPickerCount();
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
            if (teamSizeInput && !teamSizeInput.value) teamSizeInput.value = 4;
            if (statusEl) statusEl.textContent = '';
            updateTeamPickerCount();
            renderTeamPickerPlaceholder();
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
            const required = teamSize * 2;

            if (linePool.length < required) {
                if (statusEl) statusEl.textContent = `Selecione pelo menos ${required} jogadores de linha (al\u00e9m dos goleiros).`;
                return;
            }

            const chosen = shuffleArray([...linePool]).slice(0, required);
            const teamCinza = chosen.slice(0, teamSize);
            const teamBranco = chosen.slice(teamSize, required);

            const results = document.getElementById('team-draw-results');
            if (results) {
                results.innerHTML = `
                    <div class="border border-slate-200 rounded-lg p-4">
                        <p class="text-sm font-semibold text-slate-700 mb-2">Time Cinza</p>
                        <p class="text-xs text-slate-500 mb-2">Goleiro: ${gkCinza}</p>
                        <div class="flex flex-wrap gap-2 text-sm">
                            ${teamCinza.map(p => `<span class="px-2 py-1 bg-slate-50 border border-slate-200 rounded">${p}</span>`).join('')}
                        </div>
                    </div>
                    <div class="border border-slate-200 rounded-lg p-4">
                        <p class="text-sm font-semibold text-slate-700 mb-2">Time Branco</p>
                        <p class="text-xs text-slate-500 mb-2">Goleiro: ${gkBranco}</p>
                        <div class="flex flex-wrap gap-2 text-sm">
                            ${teamBranco.map(p => `<span class="px-2 py-1 bg-amber-50 border border-amber-200 rounded">${p}</span>`).join('')}
                        </div>
                    </div>
                `;
            }

            if (statusEl) {
                statusEl.textContent = linePool.length > required
                    ? `Times sorteados. Sobram ${linePool.length - required} jogadores fora do sorteio.`
                    : 'Times sorteados com sucesso.';
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
function processData(games) {
    if (!Array.isArray(games) || games.length === 0) {
        document.getElementById('kpis-container').innerHTML = '<p class="text-sm text-slate-500">Nenhum jogo no período selecionado.</p>';
        document.getElementById('team-stats-container').innerHTML = '';
        document.getElementById('ranking-body').innerHTML = '';
        document.getElementById('gk-body').innerHTML = '';
        document.getElementById('line-body').innerHTML = '';
        document.getElementById('duo-body').innerHTML = '';
        document.getElementById('duo-worst-body').innerHTML = '';
        document.getElementById('game-select').innerHTML = '';
        document.getElementById('game-score').innerHTML = '<p class="text-sm text-slate-500">Nenhum jogo disponível para exibir.</p>';
        document.getElementById('streaks-container').innerHTML = '';
        return;
    }

    const orderedGames = [...games].sort((a, b) => a.id - b.id);
    let players = {};
    let teamStats = { cinza: { w:0, l:0, d:0, g:0 }, branco: { w:0, l:0, d:0, g:0 } };
    let totalGoals = 0;
    let maxGoalsGame = { val: 0, desc: '' };
    let maxDiffGame = { val: 0, desc: '' };
    let duos = {};

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
            if (!players[pName]) players[pName] = {
                name: pName,
                matches: 0, wins: 0, losses: 0, draws: 0, points: 0,
                gkMatches: 0, gkGoals: 0, gkWorst: 0, gkWins: 0, gkDraws: 0, gkLosses: 0,
                lineMatches: 0, linePoints: 0,
                lastResults: [],
                currentUnbeaten: 0, bestUnbeaten: 0,
                currentWin: 0, bestWin: 0,
                currentNoWin: 0
            };

            const p = players[pName];
            p.matches++;
            if (result === 'V') { p.wins++; p.points += 3; }
            if (result === 'D') { p.losses++; }
            if (result === 'E') { p.draws++; p.points += 1; }
            p.lastResults.push(result);

            // streaks
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
            if (result !== 'V') {
                p.currentNoWin++;
            } else {
                p.currentNoWin = 0;
            }

            if (pos === 'Goleiro') {
                p.gkMatches++;
                p.gkGoals += gc;
                if (gc > p.gkWorst) p.gkWorst = gc;
                if (result === 'V') p.gkWins++;
                if (result === 'E') p.gkDraws++;
                if (result === 'D') p.gkLosses++;
            } else {
                p.lineMatches++;
                p.linePoints += (result === 'V' ? 3 : (result === 'E' ? 1 : 0));
            }
        };

        const processDuos = (lineArray, result) => {
            const stdNames = lineArray.map(n => standardize(n)).sort();
            const pts = (result === 'V' ? 3 : (result === 'E' ? 1 : 0));
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
            <p class="text-xs text-slate-500 mt-1">${maxGoalsGame.desc}</p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h4 class="text-xs font-bold text-slate-400 uppercase">Maior Goleada</h4>
            <p class="text-xl font-bold text-slate-800 mt-1">${maxDiffGame.val} Gols Dif.</p>
            <p class="text-xs text-slate-500 mt-1">${maxDiffGame.desc}</p>
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

    // Forma recente
    const renderForm = (results) => {
        const last = results.slice(-5);
        if (last.length === 0) return '';
        return last.map(r => {
            const color = r === 'V' ? 'bg-green-500' : (r === 'E' ? 'bg-slate-400' : 'bg-red-500');
            return `<span class="inline-block h-2.5 w-2.5 rounded-full ${color}"></span>`;
        }).join(' ');
    };

    // Ranking
    const sortedRanking = [...playersArr].sort((a,b) => b.points - a.points || b.wins - a.wins);
    document.getElementById('ranking-body').innerHTML = sortedRanking.map(p => `
        <tr class="hover:bg-slate-50 transition">
            <td class="px-6 py-3 whitespace-nowrap font-medium text-slate-700">${p.name}</td>
            <td class="px-6 py-3 whitespace-nowrap text-slate-500">${p.matches}</td>
            <td class="px-6 py-3 whitespace-nowrap text-green-600 font-bold">${p.wins}</td>
            <td class="px-6 py-3 whitespace-nowrap text-red-500">${p.losses}</td>
            <td class="px-6 py-3 whitespace-nowrap text-blue-500">${p.draws}</td>
            <td class="px-6 py-3 whitespace-nowrap text-slate-900 font-bold text-lg">${p.points}</td>
            <td class="px-6 py-3 whitespace-nowrap text-slate-500 text-lg">${renderForm(p.lastResults)}</td>
        </tr>
    `).join('');

    // Goleiros
    const gkArr = playersArr.filter(p => p.gkMatches > 0).sort((a,b) => (a.gkGoals/a.gkMatches) - (b.gkGoals/b.gkMatches));
    document.getElementById('gk-body').innerHTML = gkArr.map(p => {
        const media = p.gkMatches >= 5 ? (p.gkGoals / p.gkMatches).toFixed(2) : '-';
        return `
        <tr class="hover:bg-slate-50">
            <td class="px-4 py-2 font-medium">${p.name}</td>
            <td class="px-4 py-2">${p.gkMatches}</td>
            <td class="px-4 py-2">${p.gkGoals}</td>
            <td class="px-4 py-2">${p.gkWins}V / ${p.gkDraws}E / ${p.gkLosses}D</td>
            <td class="px-4 py-2 font-bold">${media}</td>
        </tr>
    `;
    }).join('');

    // Linha
    const lineArr = playersArr.filter(p => p.lineMatches >= 10).sort((a,b) => (b.linePoints/b.lineMatches) - (a.linePoints/a.lineMatches));
    document.getElementById('line-body').innerHTML = lineArr.map(p => `
        <tr class="hover:bg-slate-50">
            <td class="px-4 py-2 font-medium">${p.name}</td>
            <td class="px-4 py-2">${p.lineMatches}</td>
            <td class="px-4 py-2 font-bold text-blue-600">${(p.linePoints / p.lineMatches).toFixed(2)}</td>
            <td class="px-4 py-2 text-xs text-slate-500">${((p.linePoints / (p.lineMatches*3))*100).toFixed(1)}%</td>
        </tr>
    `).join('');

    // Duplas
    const duoBase = Object.entries(duos)
        .map(([name, stats]) => ({ name, ...stats, ppg: stats.points/stats.games }))
        .filter(d => d.games >= 10);
    const bestDuos = [...duoBase].sort((a,b) => b.ppg - a.ppg).slice(0, 5);
    const worstDuos = [...duoBase].sort((a,b) => a.ppg - b.ppg).slice(0, 5);

    document.getElementById('duo-body').innerHTML = bestDuos.map(d => `
        <tr>
            <td class="px-6 py-3 font-medium text-slate-700">${d.name}</td>
            <td class="px-6 py-3 text-slate-500">${d.games}</td>
            <td class="px-6 py-3 font-bold text-green-600">${d.ppg.toFixed(2)}</td>
        </tr>
    `).join('');
    document.getElementById('duo-worst-body').innerHTML = worstDuos.map(d => `
        <tr>
            <td class="px-6 py-3 font-medium text-slate-700">${d.name}</td>
            <td class="px-6 py-3 text-slate-500">${d.games}</td>
            <td class="px-6 py-3 font-bold text-red-600">${d.ppg.toFixed(2)}</td>
        </tr>
    `).join('');

    // Últimos jogos
    const gamesById = [...orderedGames];
    const gameSelect = document.getElementById('game-select');
    gameSelect.innerHTML = gamesById.slice().reverse().map(g => `<option value="${g.id}">Jogo ${g.id} - ${g.data} (${g.placar.cinza}x${g.placar.branco})</option>`).join('');

    const renderTeamCard = (team, label, colors) => `
        <div class="rounded-lg p-4 border" style="background:${colors.bg}; border-color:${colors.border};">
            <div class="flex items-center justify-between mb-2">
                <p class="text-sm font-semibold" style="color:${colors.text};">${label}</p>
                <span class="text-xs bg-white px-2 py-1 rounded border" style="color:${colors.text}; border-color:${colors.border};">Goleiro: ${standardize(team.goleiro)}</span>
            </div>
            <p class="text-xs uppercase mb-1" style="color:${colors.muted};">Linha</p>
            <div class="flex flex-wrap gap-2 text-sm">
                ${team.linha.map(p => `<span class="px-2 py-1 bg-white border rounded" style="border-color:${colors.border};">${standardize(p)}</span>`).join('')}
            </div>
        </div>
    `;

    const renderGame = (game) => {
        document.getElementById('game-score').innerHTML = `
            <div class="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p class="text-xs uppercase text-slate-500">Jogo ${game.id} - ${game.data}</p>
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
    const freqThreshold = 10;
    const unbeatenLeader = playersArr.reduce((best, p) => p.bestUnbeaten > (best?.bestUnbeaten || 0) ? p : best, null);
    const winLeader = playersArr.reduce((best, p) => p.bestWin > (best?.bestWin || 0) ? p : best, null);
    const droughtLeader = playersArr
        .filter(p => p.matches >= freqThreshold)
        .reduce((best, p) => (!best || p.currentNoWin > best.currentNoWin) ? p : best, null);

    document.getElementById('streaks-container').innerHTML = `
        <div class="bg-white border border-slate-200 rounded-lg p-4">
            <p class="text-xs uppercase text-slate-500 font-semibold">Maior Invencibilidade</p>
            <p class="text-lg font-bold text-slate-800 mt-1">${unbeatenLeader ? unbeatenLeader.name : '-'}</p>
            <p class="text-sm text-slate-500">${unbeatenLeader ? `${unbeatenLeader.bestUnbeaten} jogos sem perder` : 'Sem dados'}</p>
        </div>
        <div class="bg-white border border-slate-200 rounded-lg p-4">
            <p class="text-xs uppercase text-slate-500 font-semibold">Maior Sequ\u00eancia de Vit\u00f3rias</p>
            <p class="text-lg font-bold text-slate-800 mt-1">${winLeader ? winLeader.name : '-'}</p>
            <p class="text-sm text-slate-500">${winLeader ? `${winLeader.bestWin} vit\u00f3rias seguidas` : 'Sem dados'}</p>
        </div>
        <div class="bg-white border border-slate-200 rounded-lg p-4">
            <p class="text-xs uppercase text-slate-500 font-semibold">Seca de Vit\u00f3rias (freq. \u2265 ${freqThreshold})</p>
            <p class="text-lg font-bold text-slate-800 mt-1">${droughtLeader ? droughtLeader.name : '-'}</p>
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
    
    rows.sort((a, b) => {
        const valA = a.cells[colIndex].innerText.replace('%','');
        const valB = b.cells[colIndex].innerText.replace('%','');
        return isAsc 
            ? valA.localeCompare(valB, undefined, {numeric: true}) 
            : valB.localeCompare(valA, undefined, {numeric: true});
    });

    table.setAttribute('data-order', isAsc ? 'desc' : 'asc');
    tbody.append(...rows);
}
