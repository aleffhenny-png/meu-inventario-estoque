// --- CONFIGURAÇÃO DA API ---
// Substitua pelo seu endpoint real do SheetDB
const API_URL = 'https://sheetdb.io/api/v1/7d5k8fk5rw4nr';

let materiais = [];
let chart = null;

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

// --- BUSCA E RENDERIZAÇÃO ---
async function fetchData() {
    try {
        const response = await fetch(API_URL);
        materiais = await response.json();
        render();
    } catch (err) {
        toast('Erro ao conectar com a base de dados', 'error');
    }
}

function render() {
    const nomeOp = document.getElementById('nomeOperador');
    if(nomeOp) nomeOp.innerText = sessionStorage.getItem('usuarioLogado') || 'Operador';
    
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

        select.innerHTML += `<option value="${m.codigo}">[${m.codigo}] ${m.nome}</option>`;
        tbody.innerHTML += `<tr>
            <td>${m.codigo}</td>
            <td>${m.nome}</td>
            <td><b>${qtd} u</b></td>
            <td>${min}</td>
            <td>${pp}</td>
            <td><span class="badge ${st.c}">${st.t}</span></td>
        </tr>`;
    });

    if(document.getElementById('cardTotal')) document.getElementById('cardTotal').innerText = materiais.length;
    if(document.getElementById('cardCritico')) document.getElementById('cardCritico').innerText = criticos;
    if(document.getElementById('cardComprar')) document.getElementById('cardComprar').innerText = comprar;
    
    if (typeof renderChart === 'function') renderChart(okCount, comprar, criticos);
}

// --- MOVIMENTAÇÃO (UPDATE NA PLANILHA) ---
async function movimentar(codigo, tipo, qtd) {
    const item = materiais.find(x => x.codigo === codigo);
    if (!item) return;

    let novaQtd = parseInt(item.qtd) + (tipo === 'ENTRADA' ? qtd : -qtd);
    if (novaQtd < 0) { toast('Estoque insuficiente!', 'error'); return; }

    try {
        await fetch(`${API_URL}/codigo/${codigo}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qtd: novaQtd })
        });
        toast('Movimentação salva!');
        fetchData(); // Recarrega os dados
    } catch (err) { toast('Erro ao atualizar', 'error'); }
}

// --- EVENTOS ---
document.getElementById('scannerInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const codigo = this.value.trim();
        if (materiais.some(x => x.codigo === codigo)) {
            movimentar(codigo, 'SAIDA', 1);
        } else {
            toast('Item não encontrado: ' + codigo, 'error');
        }
        this.value = '';
    }
});

function handleManual(e) {
    e.preventDefault();
    const codigo = document.getElementById('movMaterial').value;
    const tipo = document.getElementById('movTipo').value;
    const qtd = parseInt(document.getElementById('movQtd').value);
    movimentar(codigo, tipo, qtd);
}

// --- GRÁFICOS ---
function renderChart(ok, comp, crit) {
    const canvas = document.getElementById('chartEstoque');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['OK', 'Pedido', 'Crítico'], datasets: [{ data: [ok, comp, crit], backgroundColor: ['#10b981', '#f59e0b', '#ef4444'] }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
}

// --- INICIALIZAÇÃO ---
window.onload = () => { 
    fetchData(); 
    const scanInput = document.getElementById('scannerInput');
    if(scanInput) scanInput.focus(); 
};