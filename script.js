// --- INICIALIZAÇÃO ---
let materiais = JSON.parse(localStorage.getItem('INV_MATERIAIS_V2'));
// Inicializa ou recupera o histórico
let historico = JSON.parse(localStorage.getItem('INV_HISTORICO_V2')) || [];

const dadosCorrompidos = !Array.isArray(materiais) || (materiais.length > 0 && materiais[0].qtd === undefined);

if (dadosCorrompidos) {
    materiais = (typeof PADRAO !== 'undefined') ? [...PADRAO] : []; 
    localStorage.setItem('INV_MATERIAIS_V2', JSON.stringify(materiais));
}

let chart = null;
let currentTabId = 'tab-operacao';

// --- FUNÇÕES DE HISTÓRICO (NOVO) ---
function registrarHistorico(codigo, nome, tipo, qtd) {
    const novoRegistro = {
        data: new Date().toLocaleString(),
        operador: sessionStorage.getItem('usuarioLogado') || 'Desconhecido',
        codigo,
        nome,
        tipo, // 'ENTRADA' ou 'SAIDA'
        qtd
    };
    historico.unshift(novoRegistro); // Adiciona no início da lista
    // Mantém apenas os últimos 100 registros para não pesar o navegador
    if (historico.length > 100) historico.pop();
    localStorage.setItem('INV_HISTORICO_V2', JSON.stringify(historico));
}

// --- FUNÇÕES DE INTERFACE ---
function toast(msg, tipo = 'success') {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast ${tipo !== 'success' ? tipo : ''}`;
    t.innerText = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

function switchTab(tabId) {
    const role = sessionStorage.getItem('usuarioRole');
    if (tabId === 'tab-cadastro' && role !== 'admin') {
        toast('Acesso negado: Apenas administradores.', 'error');
        return;
    }
    currentTabId = tabId;
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    // Ajuste de classes dos botões
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(b => {
        if(b.getAttribute('onclick').includes(tabId)) b.classList.add('active');
    });

    if (tabId === 'tab-operacao') setTimeout(() => document.getElementById('scannerInput').focus(), 50);
}

// --- LÓGICA PRINCIPAL ---
function render() {
    const nomeOp = document.getElementById('nomeOperador');
    if(nomeOp) nomeOp.innerText = sessionStorage.getItem('usuarioLogado') || 'Operador';
    
    const btnCadastro = document.getElementById('btnTabCadastro');
    const role = sessionStorage.getItem('usuarioRole');
    if (btnCadastro) {
        btnCadastro.style.display = (role === 'admin') ? 'inline-block' : 'none';
    }
    
    const tbody = document.getElementById('tbodyInventario');
    const select = document.getElementById('movMaterial');
    
    if (!tbody || !select) return;

    tbody.innerHTML = '';
    select.innerHTML = '<option value="">-- Selecione --</option>';
    
    let criticos = 0, comprar = 0, okCount = 0;

    materiais.forEach((m, idx) => {
        const qtd = Number(m.qtd || 0);
        const min = Number(m.min || 0);
        const pp = Number(m.ponto || 0);

        let st = { t: 'OK', c: 'ok' };
        if (qtd <= min) { st = { t: 'Crítico', c: 'critico' }; criticos++; }
        else if (qtd <= pp) { st = { t: 'Comprar', c: 'comprar' }; comprar++; }
        else { okCount++; }

        select.innerHTML += `<option value="${idx}">[${m.codigo}] ${m.nome}</option>`;
        tbody.innerHTML += `<tr>
            <td>${m.codigo}</td>
            <td>${m.nome}</td>
            <td><b>${qtd} u</b></td>
            <td>${min} u</td>
            <td>${pp} u</td>
            <td><span class="badge ${st.c}">${st.t}</span></td>
        </tr>`;
    });

    if(document.getElementById('cardTotal')) document.getElementById('cardTotal').innerText = materiais.length;
    if(document.getElementById('cardCritico')) document.getElementById('cardCritico').innerText = criticos;
    if(document.getElementById('cardComprar')) document.getElementById('cardComprar').innerText = comprar;
    
    localStorage.setItem('INV_MATERIAIS_V2', JSON.stringify(materiais));
    if (typeof renderChart === 'function') renderChart(okCount, comprar, criticos);
}

function movimentar(idx, tipo, qtd) {
    if (tipo === 'SAIDA' && materiais[idx].qtd < qtd) {
        toast('Estoque insuficiente!', 'error');
        return;
    }
    materiais[idx].qtd += (tipo === 'ENTRADA' ? qtd : -qtd);
    
    // REGISTRA NO HISTÓRICO
    registrarHistorico(materiais[idx].codigo, materiais[idx].nome, tipo, qtd);
    
    toast('Movimentação salva com sucesso!');
    render();
}

// --- EVENTOS E DEMAIS FUNÇÕES ---
// [Manter as funções de scanner, handleManual, CadastroUsuario, RenderUsuarios, ExcluirUsuario conforme estavam antes]
// (Como o código estava grande, certifique-se de apenas substituir até aqui e manter o fim do seu arquivo)