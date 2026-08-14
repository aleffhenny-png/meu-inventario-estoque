// --- INICIALIZAÇÃO CORRETA INTEGRADA COM DADOS.JS ---

let materiais = JSON.parse(localStorage.getItem('INV_MATERIAIS_V2'));



// Detecta se os dados estão corrompidos ou faltando propriedades

const dadosCorrompidos = !Array.isArray(materiais) || (materiais.length > 0 && materiais[0].qtd === undefined);



if (dadosCorrompidos) {

    materiais = [...PADRAO];

    localStorage.setItem('INV_MATERIAIS_V2', JSON.stringify(materiais));

}



let chart = null;

let currentTabId = 'tab-operacao';



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

   

    const btns = document.querySelectorAll('.tab-btn');

    if (tabId === 'tab-operacao') btns[0].classList.add('active');

    if (tabId === 'tab-posicao') btns[1].classList.add('active');

    if (tabId === 'tab-cadastro') btns[2].classList.add('active');



    if (tabId === 'tab-operacao') setTimeout(() => document.getElementById('scannerInput').focus(), 50);

}



// --- LÓGICA PRINCIPAL DO INVENTÁRIO ---

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

        // Leitura protegida: garante que o valor seja um número

        const qtd = Number(m.qtd || 0);

        const min = Number(m.min || 0);

        const pp = Number(m.ponto || 0);



        let st = { t: 'OK', c: 'ok' };

       

        if (qtd <= min) {

            st = { t: 'Crítico', c: 'critico' };

            criticos++;

        } else if (qtd <= pp) {

            st = { t: 'Comprar', c: 'comprar' };

            comprar++;

        } else {

            okCount++;

        }



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

   

    if (typeof renderChart === 'function') {

        renderChart(okCount, comprar, criticos);

    }

}



function movimentar(idx, tipo, qtd) {

    if (tipo === 'SAIDA' && materiais[idx].qtd < qtd) {

        toast('Estoque insuficiente!', 'error');

        return;

    }

    materiais[idx].qtd += (tipo === 'ENTRADA' ? qtd : -qtd);

    toast('Movimentação salva com sucesso!');

    render();

}



// --- EVENTOS DE MOVIMENTAÇÃO ---

document.getElementById('scannerInput').addEventListener('keydown', function(e) {

    if (e.key === 'Enter') {

        e.preventDefault();

        const codigoBipado = this.value.trim();

        const idx = materiais.findIndex(x => x.codigo === codigoBipado);

        if (idx !== -1) {

            movimentar(idx, 'SAIDA', 1);

        } else {

            toast('Item não cadastrado com o código: ' + codigoBipado, 'error');

        }

        this.value = '';

    }

});



function handleManual(e) {

    e.preventDefault();

    const idx = document.getElementById('movMaterial').value;

    const tipo = document.getElementById('movTipo').value;

    const qtd = parseInt(document.getElementById('movQtd').value);

    if (idx !== "") {

        movimentar(parseInt(idx), tipo, qtd);

        e.target.reset();

    }

}



// --- GESTÃO DE USUÁRIOS ---

function handleCadastroUsuario(e) {

    e.preventDefault();

    const novoUsuario = {

        nome: document.getElementById('cadNome').value,

        user: document.getElementById('cadUser').value,

        pass: document.getElementById('cadPass').value,

        cracha: document.getElementById('cadCracha').value,

        role: document.getElementById('cadRole').value

    };



    let listaUsuarios = JSON.parse(localStorage.getItem('INV_USUARIOS_V2')) || [];

    if (listaUsuarios.find(x => x.cracha === novoUsuario.cracha)) {

        toast('Erro: Crachá já cadastrado!', 'error');

        return;

    }

    listaUsuarios.push(novoUsuario);

    localStorage.setItem('INV_USUARIOS_V2', JSON.stringify(listaUsuarios));

    toast('Colaborador cadastrado!');

    e.target.reset();

    renderUsuarios();

}



function renderUsuarios() {

    const tbody = document.getElementById('tbodyUsuarios');

    if (!tbody) return;

    const listaUsuarios = JSON.parse(localStorage.getItem('INV_USUARIOS_V2')) || [];

    tbody.innerHTML = '';

    listaUsuarios.forEach((u, idx) => {

        tbody.innerHTML += `<tr>

            <td>${u.nome}</td>

            <td>${u.user}</td>

            <td>${u.cracha}</td>

            <td>${u.role.toUpperCase()}</td>

            <td><button onclick="excluirUsuario(${idx})" style="color: #ef4444; cursor: pointer; border: none; background: none; font-weight: bold;">Excluir</button></td>

        </tr>`;

    });

}



function excluirUsuario(index) {

    if (!confirm('Deseja excluir este colaborador?')) return;

    let listaUsuarios = JSON.parse(localStorage.getItem('INV_USUARIOS_V2')) || [];

    listaUsuarios.splice(index, 1);

    localStorage.setItem('INV_USUARIOS_V2', JSON.stringify(listaUsuarios));

    renderUsuarios();

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



window.onload = () => {

    render();

    renderUsuarios();

    const scanInput = document.getElementById('scannerInput');

    if(scanInput) scanInput.focus();

};