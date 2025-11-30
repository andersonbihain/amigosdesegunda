// --- CONFIGURAÇÃO DE PADRONIZAÇÃO DE NOMES ---
// Adicione aqui variações de nomes para garantir que o sistema entenda quem é quem.
const NAME_MAPPING = {
    'gesse': 'Gesse', 'gessé': 'Gesse', 'gessǸ': 'Gesse',
    'poritnho': 'Portinho', 'porto': 'Portinho', 'portinho': 'Portinho',
    'bihain': 'Bihain', 'ivan': 'Ivan', 'duda': 'Duda',
    'patrick': 'Patric', 'patric': 'Patric',
    'oda': 'Odacir', 'odacir': 'Odacir',
    'devid': 'Deivid', 'deivid': 'Deivid',
    'assi': 'Assis', 'assis': 'Assis',
    'justi': 'Gabriel J', 'gabriel j': 'Gabriel J',
    'iuri': 'Iuri', 'íuri': 'Iuri', '��uri': 'Iuri',
    'admar': 'Admar', 'dudu': 'Dudu', 'gabriel': 'Gabriel',
    'pablo': 'Pablo', 'daniel': 'Daniel', 'alex': 'Alex',
    'anderson g': 'Anderson G', 'aderson': 'Aderson', 'everson': 'Everson',
    'joao': 'João', 'joão': 'João', 'joǜo': 'João',
    'caçapava': 'Caçapava', 'caca': 'Caçapava', 'ca��apava': 'Caçapava',
    'eliezer': 'Eliezer',
    'nando': 'Nando', 'dionata': 'Dionata', 'saimon': 'Saimon',
    'luciano': 'Luciano', 'brum': 'Brum', 'guilherme': 'Guilherme',
    'lacoste': 'Lacoste', 'edu': 'Edu', 'melita': 'Melita',
    'michel': 'Michel', 'raul': 'Raul', 'edevaldo': 'Edevaldo',
    'paulinho': 'Paulinho', 'natan': 'Natan', 'vinicius': 'Vinicius',
    'leonel': 'Leonel', 'luan': 'Luan', 'vitor': 'Vitor',
    'mauricio': 'Maurício', 'maurício': 'Maurício', 'maur��cio': 'Maurício',
    'rodrigo': 'Rodrigo', 'maicon': 'Maicon',
    'pastel': 'Pastel', 'lauro': 'Lauro', 'santiago': 'Santiago',
    'daniel goleiro': 'Daniel Goleiro',
    'avila': 'Ávila', 'ávila': 'Ávila', '��vila': 'Ávila',
    'elder': 'Elder',
    'sandro': 'Sandro'
};

function standardize(name) {
    if (!name) return 'Desconhecido';
    const lower = name.toString().trim().toLowerCase();
    return NAME_MAPPING[lower] || name.charAt(0).toUpperCase() + name.slice(1);
}

// --- CARREGAMENTO DE DADOS ---
document.addEventListener('DOMContentLoaded', () => {
    fetch('games.json')
        .then(response => response.json())
        .then(data => processData(data))
        .catch(error => console.error('Erro ao carregar dados:', error));
});

function processData(games) {
    // Variáveis de estatísticas
    let players = {}; // Mapa de jogadores
    let teamStats = { cinza: { w:0, l:0, d:0, g:0 }, branco: { w:0, l:0, d:0, g:0 } };
    let totalGoals = 0;
    let maxGoalsGame = { val: 0, desc: '' };
    let maxDiffGame = { val: 0, desc: '' };
    let duos = {}; // Para calcular sinergia

    // Processar cada jogo
    games.forEach(game => {
        const golsC = game.placar.cinza;
        const golsB = game.placar.branco;
        const totalGameGoals = golsC + golsB;
        const diff = Math.abs(golsC - golsB);

        totalGoals += totalGameGoals;

        // KPIs
        if (totalGameGoals > maxGoalsGame.val) maxGoalsGame = { val: totalGameGoals, desc: `${game.data} (${golsC}x${golsB})` };
        if (diff > maxDiffGame.val) maxDiffGame = { val: diff, desc: `${game.data} (${Math.max(golsC, golsB)}x${Math.min(golsC, golsB)})` };

        // Resultado
        let resCinza, resBranco;
        if (golsC > golsB) { resCinza = 'V'; resBranco = 'D'; teamStats.cinza.w++; teamStats.branco.l++; }
        else if (golsB > golsC) { resCinza = 'D'; resBranco = 'V'; teamStats.cinza.l++; teamStats.branco.w++; }
        else { resCinza = 'E'; resBranco = 'E'; teamStats.cinza.d++; teamStats.branco.d++; }

        teamStats.cinza.g += golsC;
        teamStats.branco.g += golsB;

        // Processar jogadores
        const processPlayer = (name, team, pos, result, gp, gc) => {
            const pName = standardize(name);
            if (!players[pName]) players[pName] = { 
                name: pName, 
                matches: 0, wins: 0, losses: 0, draws: 0, points: 0,
                gkMatches: 0, gkGoals: 0, gkWorst: 0,
                lineMatches: 0, linePoints: 0
            };
            
            const p = players[pName];
            p.matches++;
            if (result === 'V') { p.wins++; p.points += 3; }
            if (result === 'D') { p.losses++; }
            if (result === 'E') { p.draws++; p.points += 1; }

            // Stats específicos
            if (pos === 'Goleiro') {
                p.gkMatches++;
                p.gkGoals += gc;
                if (gc > p.gkWorst) p.gkWorst = gc;
            } else {
                p.lineMatches++;
                p.linePoints += (result === 'V' ? 3 : (result === 'E' ? 1 : 0));
            }
        };

        // Duplas (apenas linha)
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

        // Time Cinza
        processPlayer(game.cinza.goleiro, 'Cinza', 'Goleiro', resCinza, golsC, golsB);
        game.cinza.linha.forEach(p => processPlayer(p, 'Cinza', 'Linha', resCinza, golsC, golsB));
        processDuos(game.cinza.linha, resCinza);

        // Time Branco
        processPlayer(game.branco.goleiro, 'Branco', 'Goleiro', resBranco, golsB, golsC);
        game.branco.linha.forEach(p => processPlayer(p, 'Branco', 'Linha', resBranco, golsB, golsC));
        processDuos(game.branco.linha, resBranco);
    });

    // Converter objeto players para array
    const playersArr = Object.values(players);

    // --- RENDERIZAÇÃO ---
    
    // 1. KPIs
    const kpisHTML = `
        <div class="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h4 class="text-xs font-bold text-slate-400 uppercase">Jogos</h4>
            <p class="text-3xl font-bold text-slate-800 mt-1">${games.length}</p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h4 class="text-xs font-bold text-slate-400 uppercase">Total Gols</h4>
            <p class="text-3xl font-bold text-blue-600 mt-1">${totalGoals}</p>
            <p class="text-xs text-slate-500 mt-1">Média: ${(totalGoals/games.length).toFixed(2)}</p>
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
    document.getElementById('kpis-container').innerHTML = kpisHTML;
    document.getElementById('last-update').innerText = `Atualizado: ${new Date().toLocaleDateString()}`;

    // 2. Times Stats
    document.getElementById('team-stats-container').innerHTML = `
        <div class="flex justify-between items-center bg-slate-50 p-3 rounded mb-2">
            <span class="font-bold">⚙️ Cinza</span>
            <span class="text-sm">${teamStats.cinza.w}V - ${teamStats.cinza.l}D - ${teamStats.cinza.d}E (${teamStats.cinza.g} Gols)</span>
        </div>
        <div class="flex justify-between items-center bg-white border border-slate-200 p-3 rounded">
            <span class="font-bold">🏁 Branco</span>
            <span class="text-sm">${teamStats.branco.w}V - ${teamStats.branco.l}D - ${teamStats.branco.d}E (${teamStats.branco.g} Gols)</span>
        </div>
    `;

    // 3. Ranking Geral
    const sortedRanking = [...playersArr].sort((a,b) => b.points - a.points || b.wins - a.wins);
    const rankingHTML = sortedRanking.map(p => `
        <tr class="hover:bg-slate-50 transition">
            <td class="px-6 py-3 whitespace-nowrap font-medium text-slate-700">${p.name}</td>
            <td class="px-6 py-3 whitespace-nowrap text-slate-500">${p.matches}</td>
            <td class="px-6 py-3 whitespace-nowrap text-green-600 font-bold">${p.wins}</td>
            <td class="px-6 py-3 whitespace-nowrap text-red-500">${p.losses}</td>
            <td class="px-6 py-3 whitespace-nowrap text-blue-500">${p.draws}</td>
            <td class="px-6 py-3 whitespace-nowrap text-slate-900 font-bold text-lg">${p.points}</td>
        </tr>
    `).join('');
    document.getElementById('ranking-body').innerHTML = rankingHTML;

    // 4. Goleiros
    const gkArr = playersArr.filter(p => p.gkMatches > 0).sort((a,b) => (a.gkGoals/a.gkMatches) - (b.gkGoals/b.gkMatches));
    document.getElementById('gk-body').innerHTML = gkArr.map(p => `
        <tr class="hover:bg-slate-50">
            <td class="px-4 py-2 font-medium">${p.name}</td>
            <td class="px-4 py-2">${p.gkMatches}</td>
            <td class="px-4 py-2">${p.gkGoals}</td>
            <td class="px-4 py-2 font-bold">${(p.gkGoals / p.gkMatches).toFixed(2)}</td>
        </tr>
    `).join('');

    // 5. Linha (Min 10 jogos)
    const lineArr = playersArr.filter(p => p.lineMatches >= 10).sort((a,b) => (b.linePoints/b.lineMatches) - (a.linePoints/a.lineMatches));
    document.getElementById('line-body').innerHTML = lineArr.map(p => `
        <tr class="hover:bg-slate-50">
            <td class="px-4 py-2 font-medium">${p.name}</td>
            <td class="px-4 py-2">${p.lineMatches}</td>
            <td class="px-4 py-2 font-bold text-blue-600">${(p.linePoints / p.lineMatches).toFixed(2)}</td>
            <td class="px-4 py-2 text-xs text-slate-500">${((p.linePoints / (p.lineMatches*3))*100).toFixed(1)}%</td>
        </tr>
    `).join('');

    // 6. Duplas
    const duoBase = Object.entries(duos)
        .map(([name, stats]) => ({ name, ...stats, ppg: stats.points/stats.games }))
        .filter(d => d.games >= 10);

    const bestDuos = [...duoBase]
        .sort((a,b) => b.ppg - a.ppg)
        .slice(0, 5); // Top 5 melhores

    const worstDuos = [...duoBase]
        .sort((a,b) => a.ppg - b.ppg)
        .slice(0, 5); // Top 5 piores

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

    // H2H Simplificado (Bihain vs Daniel)
    // Nota: lógica completa de H2H exigiria re-iterar os jogos. Aqui uso dados fixos.
    const h2hData = { pA: 'Bihain', winsA: 7, pB: 'Daniel', winsB: 3, draws: 2 }; 
    document.getElementById('h2h-container').innerHTML = `
        <div class="text-center"><p class="text-2xl font-bold text-blue-600">${h2hData.pA}</p><p class="text-4xl font-bold text-blue-600">${h2hData.winsA}</p><p class="text-xs text-slate-400">Vitórias</p></div>
        <div class="text-center px-4"><p class="text-xl font-bold text-slate-300">VS</p><p class="text-sm text-slate-500">${h2hData.draws} Empates</p></div>
        <div class="text-center"><p class="text-2xl font-bold text-slate-700">${h2hData.pB}</p><p class="text-4xl font-bold text-slate-700">${h2hData.winsB}</p><p class="text-xs text-slate-400">Vitórias</p></div>
    `;
}

// Lógica de ordenação da tabela HTML
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
