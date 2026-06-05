/* public/js/app.js — ContabiSystem VIEW logic */
'use strict';

// ═══════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════
const API = '/api';

const $ = id => document.getElementById(id);
const fmt = v => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(+v||0);
const fmtDate = d => { if(!d) return ''; const p=d.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; };
const today      = () => new Date().toISOString().slice(0,10);
const mesInicio  = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; };

function spin(on){ $('spn').classList.toggle('hidden', !on); }
function toast(msg, type='info'){
  const el=$('toast');
  el.textContent=msg;
  el.className=`toast toast-${type} show`;
  setTimeout(()=>el.classList.remove('show'), 3400);
}

async function api(path, opts={}){
  const r = await fetch(API+path,{ headers:{'Content-Type':'application/json'}, ...opts });
  const j = await r.json();
  if(!j.success) throw new Error(j.message||'Erro desconhecido');
  return j.data;
}

// ═══════════════════════════════════════════════════════
//  NAVEGAÇÃO
// ═══════════════════════════════════════════════════════
const PAGES = ['dash','lanc','plano','diario','razao','razonete','balancete','dre'];

function go(page){
  PAGES.forEach(p=>{
    $(`p-${p}`).classList.toggle('active', p===page);
    $(`n-${p}`).classList.toggle('active', p===page);
  });
  const loaders = {
    dash:      loadDash,
    lanc:      loadLancs,
    plano:     loadPlano,
    razonete:  setupRazonetePage
  };
  if(loaders[page]) loaders[page]();
}

// ═══════════════════════════════════════════════════════
//  MODAIS
// ═══════════════════════════════════════════════════════
function openM(id){ $(id).classList.remove('hidden'); }
function closeM(id){ $(id).classList.add('hidden'); }
document.addEventListener('click', e=>{
  ['m-lanc','m-conta'].forEach(id=>{
    if(e.target===$(id)) closeM(id);
  });
});

// ═══════════════════════════════════════════════════════
//  DADOS GLOBAIS
// ═══════════════════════════════════════════════════════
let contas = [];
let partidas = [];
let editContaId = null;

// ═══════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════
async function loadDash(){
  const ini = $('d-ini').value || mesInicio();
  const fim = $('d-fim').value || today();
  $('d-ini').value = ini; $('d-fim').value = fim;
  try {
    const [dreData, lancData] = await Promise.all([
      api(`/rel/dre?dataInicio=${ini}&dataFim=${fim}`),
      api(`/lancamentos?dataInicio=${ini}&dataFim=${fim}`)
    ]);
    let rec=0, desp=0;
    for(const c of dreData){
      if(c.tipo==='RECEITA')  rec  += +c.cred - +c.deb;
      if(c.tipo==='DESPESA')  desp += +c.deb  - +c.cred;
    }
    const res = rec - desp;
    $('s-rec').textContent  = fmt(rec);
    $('s-desp').textContent = fmt(desp);
    $('s-res').textContent  = fmt(res);
    $('s-res').style.color  = res>=0 ? 'var(--green)' : 'var(--red)';
    $('s-lanc').textContent = lancData.length;

    const rows = [...lancData].reverse().slice(0,10);
    $('d-tbl').innerHTML = rows.length
      ? rows.map(l=>`<tr>
          <td class="mono" style="color:var(--accent2)">#${String(l.numero).padStart(4,'0')}</td>
          <td>${fmtDate(l.data_lancamento)}</td>
          <td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.historico}</td>
          <td class="mono" style="color:var(--muted)">${l.documento||'—'}</td>
          <td class="mono v-c" style="text-align:right">${fmt(l.total)}</td>
        </tr>`).join('')
      : `<tr><td colspan="5" class="empty">Nenhum lançamento no período</td></tr>`;
  } catch(e){ toast(e.message,'err'); }
}

// ═══════════════════════════════════════════════════════
//  LANÇAMENTOS
// ═══════════════════════════════════════════════════════
async function loadLancs(){
  const ini  = $('lf-ini').value;
  const fim  = $('lf-fim').value;
  const hist = $('lf-hist').value;
  let qs='';
  if(ini)  qs+=`&dataInicio=${ini}`;
  if(fim)  qs+=`&dataFim=${fim}`;
  if(hist) qs+=`&historico=${encodeURIComponent(hist)}`;
  try {
    const data = await api('/lancamentos' + (qs ? '?' + qs.slice(1) : ''));
    $('l-tbl').innerHTML = data.length
      ? data.map(l=>`<tr>
          <td class="mono" style="color:var(--accent2)">#${String(l.numero).padStart(4,'0')}</td>
          <td>${fmtDate(l.data_lancamento)}</td>
          <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${l.historico}">${l.historico}</td>
          <td class="mono" style="color:var(--muted);font-size:.75rem">${l.documento||'—'}</td>
          <td class="mono v-c" style="text-align:right">${fmt(l.total)}</td>
          <td style="text-align:center" class="no-print">
            <button class="btn btn-ghost btn-sm" onclick="viewLanc(${l.id})" title="Ver partidas">👁</button>
            <button class="btn btn-danger btn-sm" onclick="delLanc(${l.id})" title="Excluir" style="margin-left:4px">🗑</button>
          </td>
        </tr>`).join('')
      : `<tr><td colspan="6" class="empty">Nenhum lançamento encontrado</td></tr>`;
  } catch(e){ toast(e.message,'err'); }
}

async function viewLanc(id){
  try {
    const l = await api('/lancamentos/'+id);
    const ptHtml = l.partidas.map(p=>`
      <tr>
        <td class="mono" style="font-size:.75rem;color:var(--muted)">${p.codigo}</td>
        <td>${p.nome}</td>
        <td style="text-align:center"><span class="${p.tipo==='DEBITO'?'tipo-d':'tipo-c'}">${p.tipo==='DEBITO'?'DÉBIT':'CRÉD.'}</span></td>
        <td class="mono" style="text-align:right;${p.tipo==='DEBITO'?'color:var(--red)':'color:var(--green)'}">${fmt(p.valor)}</td>
      </tr>`).join('');
    const el = document.createElement('div');
    el.className='modal-overlay no-print';
    el.innerHTML=`<div class="modal-box" style="max-width:560px">
      <div class="card-hd" style="padding:18px 22px">
        <div>
          <span class="mono" style="color:var(--accent2)">#${String(l.numero).padStart(4,'0')}</span>
          <span style="margin-left:12px;color:var(--muted);font-size:.8rem">${fmtDate(l.data_lancamento)}</span>
          ${l.documento?`<span class="mono" style="margin-left:10px;font-size:.75rem;color:var(--gold)">${l.documento}</span>`:''}
        </div>
        <button onclick="this.closest('.modal-overlay').remove()" style="color:var(--muted);font-size:1.4rem;background:none;border:none;cursor:pointer">×</button>
      </div>
      <div style="padding:16px 22px">
        <p style="font-style:italic;color:var(--muted);font-size:.83rem;margin-bottom:14px">"${l.historico}"</p>
        <table class="tbl">
          <thead><tr><th>Código</th><th>Conta</th><th>Tipo</th><th style="text-align:right">Valor</th></tr></thead>
          <tbody>${ptHtml}</tbody>
        </table>
      </div>
    </div>`;
    el.addEventListener('click', e=>{ if(e.target===el) el.remove(); });
    document.body.appendChild(el);
  } catch(e){ toast(e.message,'err'); }
}

async function delLanc(id){
  if(!confirm('Excluir este lançamento? A ação é irreversível.')) return;
  try { spin(true); await api('/lancamentos/'+id,{method:'DELETE'}); toast('Lançamento excluído','ok'); loadLancs(); }
  catch(e){ toast(e.message,'err'); } finally{ spin(false); }
}

// ── MODAL NOVO LANÇAMENTO ──
function openLancModal(){
  partidas=[];
  $('ml-data').value=today();
  $('ml-hist').value=''; $('ml-doc').value='';
  renderParts(); updateTotals();
  openM('m-lanc');
  addP('DEBITO'); addP('CREDITO');
}

function addP(tipo){
  partidas.push({ _id:Date.now()+Math.random(), tipo, conta_id:'', valor:0 });
  renderParts();
}
function removeP(_id){
  partidas=partidas.filter(p=>p._id!=_id); renderParts();
}
function setPVal(_id, field, val){
  const p=partidas.find(x=>x._id==_id);
  if(p) p[field]= field==='valor' ? parseFloat(val)||0 : val;
  updateTotals();
}

// FIX 1: renderParts — filtrar apenas contas analíticas (aceita_lancamentos=1 e nivel>=3)
// Impede seleção de contas sintéticas (grupos ATIVO, Ativo Circulante, RECEITAS etc.)
function renderParts(){
  const w = $('partidas-wrap');
  
  w.innerHTML = partidas.map(p => `
    <div class="partida-row">
      <span class="${p.tipo === 'DEBITO' ? 'tipo-d' : 'tipo-c'}">
        ${p.tipo === 'DEBITO' ? 'DÉBITO' : 'CRÉDITO'}
      </span>
      
      <select class="inp" style="flex:1" onchange="setPVal(${p._id}, 'conta_id', this.value)">
        <option value="">Selecione a conta analítica…</option>
        ${contas.map(c => {
          // Se a conta não aceita lançamentos (Categoria), ela fica desabilitada
          const isSintetica = !c.aceita_lancamentos;
          const disabledAttr = isSintetica ? 'disabled' : '';
          
          // Cria um recuo visual baseado no nível da conta para simular a hierarquia treeview
          const recuo = '&nbsp;&nbsp;'.repeat(c.nivel - 1);
          
          // Adiciona um indicador visual (ex: um marcador) para diferenciar grupos de subcontas
          const prefixo = isSintetica ? ' ' : '';

          return `<option value="${c.id}" ${disabledAttr} ${c.id == p.conta_id ? 'selected' : ''}>
            ${recuo}${prefixo}${c.codigo} — ${c.nome}
          </option>`;
        }).join('')}
      </select>
      
      <input type="number" step="0.01" min="0.01" placeholder="0,00" value="${p.valor || ''}"
        class="inp mono" style="width:130px; text-align:right"
        oninput="setPVal(${p._id}, 'valor', this.value)"/>
      
    </div>`).join('');
    
  updateTotals();
}

function updateTotals(){
  const d=partidas.filter(p=>p.tipo==='DEBITO') .reduce((s,p)=>s+(+p.valor||0),0);
  const c=partidas.filter(p=>p.tipo==='CREDITO').reduce((s,p)=>s+(+p.valor||0),0);
  $('tot-d').textContent=fmt(d); $('tot-c').textContent=fmt(c);
  const ok=Math.abs(d-c)<0.01 && d>0;
  const ind=$('bal-ind');
  ind.className=ok?'bal-ok':'bal-err';
  ind.textContent=ok?'Balanceado ✓':`Dif: ${fmt(Math.abs(d-c))}`;
}

async function saveLanc(){
  const data_lancamento = $('ml-data').value;
  const historico       = $('ml-hist').value.trim();
  const documento       = $('ml-doc').value.trim();
  if(!data_lancamento||!historico) return toast('Preencha data e histórico','err');
  if(partidas.length<2) return toast('Adicione pelo menos 2 partidas','err');
  // FIX: validar conta selecionada e valor positivo antes de enviar
  if(partidas.some(p=>!p.conta_id)) return toast('Todas as partidas precisam de conta selecionada','err');
  if(partidas.some(p=>!(+p.valor>0))) return toast('Valor de cada partida deve ser maior que zero','err');
  try {
    spin(true);
    await api('/lancamentos',{ method:'POST', body:JSON.stringify({data_lancamento,historico,documento,partidas}) });
    closeM('m-lanc');
    toast('Lançamento registrado com sucesso!','ok');
    loadLancs();
  } catch(e){ toast(e.message,'err'); } finally{ spin(false); }
}

// ═══════════════════════════════════════════════════════
//  PLANO DE CONTAS
// ═══════════════════════════════════════════════════════
async function loadPlano(){
  try {
    contas = await api('/contas');
    const BADGE = { ATIVO:'badge-a', PASSIVO:'badge-p', PATRIMONIO_LIQUIDO:'badge-pl', RECEITA:'badge-r', DESPESA:'badge-d' };
    const LABEL = { ATIVO:'Ativo', PASSIVO:'Passivo', PATRIMONIO_LIQUIDO:'Patr. Líq.', RECEITA:'Receita', DESPESA:'Despesa' };
  $('pc-tbl').innerHTML = contas.length
    ? contas.map(c=>`<tr>
        <td class="mono" style="padding-left:${c.nivel*14}px;color:var(--gold)">${c.codigo}</td>
        <td style="${c.nivel<=2?'font-weight:700':''}${c.nivel===1?';color:#fff':''}">
          ${c.nome}
          ${c.retificadora ? '<span style="font-size:.65rem;color:var(--muted);margin-left:6px;border:1px solid currentColor;border-radius:3px;padding:0 4px">retificadora</span>' : ''}
          ${!c.aceita_lancamentos ? '<span style="font-size:.65rem;color:var(--muted);margin-left:6px;border:1px solid currentColor;border-radius:3px;padding:0 4px">Categoria</span>' : ''}
        </td>
        <td><span class="badge ${BADGE[c.tipo]}">${LABEL[c.tipo]}</span></td>
        <td style="font-size:.78rem;color:var(--muted)">${c.natureza==='DEVEDORA'?'Devedora':'Credora'}</td>
        <td style="text-align:center" class="no-print">
          <button class="btn btn-ghost btn-sm" onclick="editConta(${c.id})">✏️</button>
          <button class="btn btn-danger btn-sm" style="margin-left:4px" onclick="delConta(${c.id})">🗑</button>
        </td>
      </tr>`).join('')
    : `<tr><td colspan="5" class="empty">Nenhuma conta cadastrada</td></tr>`;
    // populate selects
    populateContaSelects();
  } catch(e){ toast(e.message,'err'); }
}

function populateContaSelects(){
  // Razão: todas as contas analíticas
  const rz=$('rz-conta');
  rz.innerHTML='<option value="">Selecione a conta…</option>'+
    contas.filter(c=>c.aceita_lancamentos).map(c=>`<option value="${c.id}">${c.codigo} — ${c.nome}</option>`).join('');

  // FIX 2: Conta pai — excluir a conta sendo editada (evita auto-referência)
  const pai=$('mc-pai');
  pai.innerHTML='<option value="">Nenhuma (raiz)</option>'+
    contas
      .filter(c => c.id !== editContaId)
      .map(c=>`<option value="${c.id}">${c.codigo} — ${c.nome}</option>`).join('');

  // Razonetes: contas de nível >= 2 que aceitem lançamentos ou sejam grupos (para visão consolidada)
  const rc=$('raz-checks');
  rc.innerHTML=contas.filter(c=>c.nivel>=2).map(c=>`
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.75rem;background:var(--bg2);border:1px solid var(--border2);border-radius:6px;padding:4px 10px;transition:border-color .18s"
      onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor=''">
      <input type="checkbox" value="${c.id}" class="raz-chk"/>
      <span class="mono" style="color:var(--accent2)">${c.codigo}</span>
      <span style="color:var(--muted)">${c.nome}</span>
    </label>`).join('');
}

function openContaModal(){
  editContaId=null;
  $('mc-title').textContent='Nova Conta';
  $('mc-id').value=''; $('mc-cod').value=''; $('mc-nome').value='';
  $('mc-tipo').value='ATIVO'; $('mc-nat').value='DEVEDORA'; $('mc-niv').value='3'; $('mc-pai').value=''; 
  // Atualizar select de pai sem a restrição de edição (editContaId é null)
  populateContaSelects();
  openM('m-conta');
}

async function editConta(id){
  try {
    const c=await api('/contas/'+id);
    editContaId=id;
    $('mc-title').textContent='Editar Conta';
    $('mc-id').value=id; $('mc-cod').value=c.codigo; $('mc-nome').value=c.nome;
    $('mc-tipo').value=c.tipo; $('mc-nat').value=c.natureza; $('mc-niv').value=c.nivel;
    $('mc-pai').value=c.pai_id||'';
    // FIX 2: re-popular o select de pai excluindo a conta atual
    populateContaSelects();
    $('mc-pai').value=c.pai_id||'';
    openM('m-conta');
  } catch(e){ toast(e.message,'err'); }
}

async function saveConta(){
  const tipo     = $('mc-tipo').value;
  const natureza = $('mc-nat').value;
  const nivel    = +$('mc-niv').value;
  const pai_id   = $('mc-pai').value||null;

  // FIX: validar natureza compatível com tipo (exceto retificadoras)
  const natEsperada = ['ATIVO','DESPESA'].includes(tipo) ? 'DEVEDORA' : 'CREDORA';
  // Depreciação Acumulada é o único caso padrão de retificadora; permitir divergência mas avisar
  if(natureza !== natEsperada){
    const ok = confirm(
      `Atenção: contas do tipo "${tipo}" normalmente têm natureza "${natEsperada}".\n` +
      `Você está definindo natureza "${natureza}" (conta retificadora).\n\n` +
      `Confirma?`
    );
    if(!ok) return;
  }

  // FIX 2: impedir pai_id igual ao id da própria conta
  if(pai_id && +pai_id === editContaId){
    return toast('Uma conta não pode ser pai de si mesma','err');
  }

  const data={
    codigo:    $('mc-cod').value.trim(),
    nome:      $('mc-nome').value.trim(),
    tipo,
    natureza,
    nivel,
    pai_id,
    ativa:     1
  };
  if(!data.codigo||!data.nome) return toast('Código e nome são obrigatórios','err');
  try {
    spin(true);
    if(editContaId) await api('/contas/'+editContaId,{method:'PUT',body:JSON.stringify(data)});
    else            await api('/contas',{method:'POST',body:JSON.stringify(data)});
    closeM('m-conta');
    toast('Conta salva!','ok');
    loadPlano();
  } catch(e){ toast(e.message,'err'); } finally{ spin(false); }
}

async function delConta(id){
  if(!confirm('Desativar esta conta?')) return;
  try { spin(true); await api('/contas/'+id,{method:'DELETE'}); toast('Conta desativada','ok'); loadPlano(); }
  catch(e){ toast(e.message,'err'); } finally{ spin(false); }
}

// FIX: autoNat — torna o campo de natureza readonly quando o tipo é padrão
// O usuário pode clicar em "definir como retificadora" para desbloquear
function autoNat(){
  const t=$('mc-tipo').value;
  $('mc-nat').value=['ATIVO','DESPESA'].includes(t)?'DEVEDORA':'CREDORA';
}

// ═══════════════════════════════════════════════════════
//  LIVRO DIÁRIO
// ═══════════════════════════════════════════════════════
async function loadDiario(){
  const ini=$('di-ini').value, fim=$('di-fim').value;
  if(!ini||!fim) return toast('Selecione o período','err');
  try {
    spin(true);
    const data=await api(`/rel/diario?dataInicio=${ini}&dataFim=${fim}`);
    const out=$('diario-out');
    if(!data.length){ out.innerHTML='<div class="empty" style="padding:60px 0">Nenhum lançamento no período</div>'; return; }
    // group by numero
    const map={}; for(const r of data){ if(!map[r.numero]) map[r.numero]={...r,pts:[]}; map[r.numero].pts.push(r); }
    out.innerHTML=`
      <div style="margin-bottom:16px;padding:12px 16px;background:var(--bg3);border:1px solid var(--border2);border-radius:10px">
        <span style="font-size:.9rem;font-weight:700">LIVRO DIÁRIO</span>
        <span class="mono" style="margin-left:16px;font-size:.75rem;color:var(--muted)">Período: ${fmtDate(ini)} a ${fmtDate(fim)}</span>
      </div>`+
      Object.values(map).map(l=>{
        const deb=l.pts.filter(p=>p.tipo==='DEBITO');
        const cred=l.pts.filter(p=>p.tipo==='CREDITO');
        const tot=deb.reduce((s,p)=>s+(+p.valor),0);
        return `<div class="lanc-card">
          <div class="lanc-hd">
            <div style="display:flex;align-items:center;gap:12px">
              <span class="lanc-num">#${String(l.numero).padStart(4,'0')}</span>
              <span style="font-size:.8rem;color:var(--muted)">${fmtDate(l.data_lancamento)}</span>
              ${l.documento?`<span class="mono" style="font-size:.72rem;color:var(--gold);background:rgba(251,191,36,.08);padding:2px 8px;border-radius:4px;border:1px solid rgba(251,191,36,.15)">${l.documento}</span>`:''}
            </div>
            <span class="mono v-c" style="font-size:.85rem;font-weight:600">${fmt(tot)}</span>
          </div>
          <div class="lanc-hist">${l.historico}</div>
          <div style="padding:8px 16px 12px">
            ${deb.map(p=>`<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:.82rem">
              <span><span class="line-d" style="font-size:.72rem;font-weight:700;margin-right:8px">D</span>${p.codigo} — ${p.nome}</span>
              <span class="mono line-d">${fmt(p.valor)}</span>
            </div>`).join('')}
            ${cred.map(p=>`<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:.82rem;padding-left:24px">
              <span><span class="line-c" style="font-size:.72rem;font-weight:700;margin-right:8px">C</span>${p.codigo} — ${p.nome}</span>
              <span class="mono line-c">${fmt(p.valor)}</span>
            </div>`).join('')}
          </div>
        </div>`;
      }).join('');
  } catch(e){ toast(e.message,'err'); } finally{ spin(false); }
}

// ═══════════════════════════════════════════════════════
//  LIVRO RAZÃO
// ═══════════════════════════════════════════════════════
async function loadRazao(){
  const contaId=$('rz-conta').value, ini=$('rz-ini').value, fim=$('rz-fim').value;
  if(!contaId||!ini||!fim) return toast('Selecione conta e período','err');
  try {
    spin(true);
    const data=await api(`/rel/razao?contaId=${contaId}&dataInicio=${ini}&dataFim=${fim}`);
    const out=$('razao-out');
    if(!data.length){ out.innerHTML='<div class="empty" style="padding:60px 0">Sem movimentação no período</div>'; return; }
    const c0=data[0];
    const natureza=c0.natureza; // 'DEVEDORA' ou 'CREDORA'
    let saldo=0;
    const rows=data.map(r=>{
      const d=r.tipo==='DEBITO'?+r.valor:0;
      const cr=r.tipo==='CREDITO'?+r.valor:0;
      if(natureza==='DEVEDORA') saldo+=d-cr; else saldo+=cr-d;
      const saldoAbs=Math.abs(saldo);
      // FIX 3: rótulo D/C baseado na natureza da conta + sinal acumulado
      const saldoTipo=saldo>=0?(natureza==='DEVEDORA'?'D':'C'):(natureza==='DEVEDORA'?'C':'D');
      return `<tr>
        <td class="mono" style="color:var(--accent2)">#${String(r.numero).padStart(4,'0')}</td>
        <td>${fmtDate(r.data_lancamento)}</td>
        <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.historico}</td>
        <td class="mono" style="text-align:right;${d?'color:var(--red)':'color:var(--muted)'}">${d?fmt(d):'—'}</td>
        <td class="mono" style="text-align:right;${cr?'color:var(--green)':'color:var(--muted)'}">${cr?fmt(cr):'—'}</td>
        <td class="mono" style="text-align:right;${saldo>=0?'color:var(--green)':'color:var(--red)'}">${fmt(saldoAbs)} ${saldoTipo}</td>
      </tr>`;
    });

    // FIX 3: rótulo final do saldo correto para contas devedoras e credoras
    const saldoFinalAbs=Math.abs(saldo);
    const saldoFinalLabel=saldo>=0
      ? (natureza==='DEVEDORA' ? 'Devedor' : 'Credor')
      : (natureza==='DEVEDORA' ? 'Credor'  : 'Devedor');

    out.innerHTML=`<div class="card" style="overflow:hidden">
      <div class="card-hd">
        <div>
          <span class="mono" style="color:var(--gold)">${c0.codigo}</span>
          <span style="margin-left:10px;font-weight:700">${c0.nome}</span>
          <span class="mono" style="margin-left:12px;font-size:.72rem;color:var(--muted)">${c0.natureza}</span>
        </div>
        <span style="font-size:.75rem;color:var(--muted)">${fmtDate(ini)} — ${fmtDate(fim)}</span>
      </div>
      <table class="tbl">
        <thead><tr>
          <th>Nº</th><th>Data</th><th>Histórico</th>
          <th style="text-align:right;color:var(--red)">Débito</th>
          <th style="text-align:right;color:var(--green)">Crédito</th>
          <th style="text-align:right">Saldo</th>
        </tr></thead>
        <tbody>${rows.join('')}</tbody>
        <tfoot><tr>
          <td colspan="5" style="text-align:right;font-weight:700">Saldo Final:</td>
          <td class="mono" style="text-align:right;font-weight:700;${saldo>=0?'color:var(--green)':'color:var(--red)'}">${fmt(saldoFinalAbs)} ${saldoFinalLabel}</td>
        </tr></tfoot>
      </table>
    </div>`;
  } catch(e){ toast(e.message,'err'); } finally{ spin(false); }
}

// ═══════════════════════════════════════════════════════
//  RAZONETES
// ═══════════════════════════════════════════════════════
function selectAllRaz(v){ document.querySelectorAll('.raz-chk').forEach(c=>c.checked=v); }

async function loadRazonetes(){
  const ini=$('raz-ini').value, fim=$('raz-fim').value;
  const ids=[...document.querySelectorAll('.raz-chk:checked')].map(c=>c.value);
  if(!ids.length) return toast('Marque pelo menos uma conta','err');
  if(!ini||!fim)  return toast('Selecione o período','err');
  try {
    spin(true);
    const out=$('raz-out'); out.innerHTML='';
    // Busca todas as contas em paralelo em vez de sequencialmente
    const resultados = await Promise.all(
      ids.map(cid => api(`/rel/razao?contaId=${cid}&dataInicio=${ini}&dataFim=${fim}`)
        .then(data => ({ cid, data }))
      )
    );
    for(const { cid, data } of resultados){
      const ct=contas.find(c=>c.id==cid);
      let totD=0,totC=0;
      const debRows=data.filter(r=>r.tipo==='DEBITO');
      const creRows=data.filter(r=>r.tipo==='CREDITO');
      debRows.forEach(r=>totD+=+r.valor); creRows.forEach(r=>totC+=+r.valor);
      const saldo=ct.natureza==='DEVEDORA'?totD-totC:totC-totD;
      const sLabel=saldo>=0?(ct.natureza==='DEVEDORA'?'SD':'SC'):(ct.natureza==='DEVEDORA'?'SC':'SD');
      const maxR=Math.max(debRows.length,creRows.length,1);
      let tRows='';
      for(let i=0;i<maxR;i++){
        const d=debRows[i]; const c=creRows[i];
        tRows+=`<tr>
          <td class="raz-col mono" style="font-size:.72rem;text-align:right;${d?'color:var(--red)':'color:var(--bg2)'};border-right:1px solid var(--border)">${d?fmt(+d.valor):''}</td>
          <td class="raz-col mono" style="font-size:.72rem;${c?'color:var(--green)':'color:var(--bg2)'}">${c?fmt(+c.valor):''}</td>
        </tr>`;
      }
      const el=document.createElement('div');
      el.className='razonete';
      el.innerHTML=`
        <div class="raz-hd">
          <div class="mono" style="font-size:.72rem;color:var(--accent2)">${ct.codigo}</div>
          <div style="font-size:.85rem;font-weight:700;color:#fff;margin-top:2px">${ct.nome}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1px 1fr;background:rgba(0,0,0,.2)">
          <div style="padding:4px 10px;font-size:.65rem;font-weight:700;color:var(--red);text-align:right">DÉBITO</div>
          <div style="background:var(--border)"></div>
          <div style="padding:4px 10px;font-size:.65rem;font-weight:700;color:var(--green)">CRÉDITO</div>
        </div>
        <table style="width:100%"><tbody>${tRows}</tbody>
          <tfoot>
            <tr style="border-top:2px solid var(--border)">
              <td class="mono" style="padding:6px 10px;text-align:right;font-size:.78rem;font-weight:700;${totD>=totC?'color:var(--red)':'color:var(--muted)'};border-right:1px solid var(--border)">${fmt(totD)}</td>
              <td class="mono" style="padding:6px 10px;font-size:.78rem;font-weight:700;${totC>=totD?'color:var(--green)':'color:var(--muted)'}">${fmt(totC)}</td>
            </tr>
            <tr>
              <td colspan="2" style="text-align:center;padding:8px;font-family:'JetBrains Mono',monospace;font-size:.82rem;font-weight:700;${saldo>=0?'color:var(--gold)':'color:var(--red)'};background:rgba(99,102,241,.06)">
                ${sLabel}: ${fmt(Math.abs(saldo))}
              </td>
            </tr>
          </tfoot>
        </table>`;
      out.appendChild(el);
    }
  } catch(e){ toast(e.message,'err'); } finally{ spin(false); }
}

// ═══════════════════════════════════════════════════════
//  BALANCETE
// ═══════════════════════════════════════════════════════
async function loadBalancete(){
  const ini=$('bl-ini').value, fim=$('bl-fim').value;
  if(!ini||!fim) return toast('Selecione o período','err');
  try {
    spin(true);
    const data=await api(`/rel/balancete?dataInicio=${ini}&dataFim=${fim}`);
    const out=$('bal-out');
    if(!data.length){ out.innerHTML='<div class="empty" style="padding:60px 0">Sem dados no período</div>'; return; }
    let sumD=0,sumC=0,sumSD=0,sumSC=0;
    const rows=data.map(c=>{
      const d=+c.deb, cr=+c.cred;
      sumD+=d; sumC+=cr;

      // FIX 7: cálculo de saldo devedor/credor simplificado e correto
      const saldoLiquido = d - cr; // positivo = tendência devedora, negativo = tendência credora
      const isSD = (c.natureza==='DEVEDORA' && saldoLiquido >= 0)
                || (c.natureza==='CREDORA'  && saldoLiquido >  0);
      const sd = isSD  ? Math.abs(saldoLiquido) : 0;
      const sc = !isSD ? Math.abs(saldoLiquido) : 0;

      if(isSD) sumSD+=sd; else sumSC+=sc;
      return `<tr>
        <td class="mono" style="padding-left:${c.nivel*12+12}px;color:var(--gold);font-size:.78rem">${c.codigo}</td>
        <td style="${c.nivel<=2?'font-weight:700':''}${c.nivel===1?';color:#fff':''}">${c.nome}</td>
        <td class="mono" style="text-align:right;color:var(--red)">${fmt(d)}</td>
        <td class="mono" style="text-align:right;color:var(--green)">${fmt(cr)}</td>
        <td class="mono" style="text-align:right;${isSD?'color:var(--red)':'color:var(--muted)'}">${isSD?fmt(sd):'—'}</td>
        <td class="mono" style="text-align:right;${!isSD?'color:var(--green)':'color:var(--muted)'}">${!isSD?fmt(sc):'—'}</td>
      </tr>`;
    });
    const eq=Math.abs(sumD-sumC)<0.01;
    out.innerHTML=`<div class="card" style="overflow:hidden">
      <div class="card-hd">
        <div style="font-weight:700;font-size:.95rem">BALANCETE DE VERIFICAÇÃO</div>
        <div style="display:flex;align-items:center;gap:12px">
          <span class="mono" style="font-size:.75rem;color:var(--muted)">${fmtDate(ini)} — ${fmtDate(fim)}</span>
          <span style="padding:3px 12px;border-radius:20px;font-size:.72rem;font-weight:700;${eq?'background:rgba(52,211,153,.1);color:var(--green);border:1px solid rgba(52,211,153,.2)':'background:rgba(251,113,133,.1);color:var(--red);border:1px solid rgba(251,113,133,.2)'}">
            ${eq?'✓ Conferido':'⚠ Diferença'}
          </span>
        </div>
      </div>
      <table class="tbl">
        <thead><tr>
          <th>Código</th><th>Conta</th>
          <th style="text-align:right;color:var(--red)">Mov. Déb.</th>
          <th style="text-align:right;color:var(--green)">Mov. Cré.</th>
          <th style="text-align:right;color:var(--red)">Saldo Dev.</th>
          <th style="text-align:right;color:var(--green)">Saldo Cre.</th>
        </tr></thead>
        <tbody>${rows.join('')}</tbody>
        <tfoot><tr>
          <td colspan="2" style="font-weight:700">TOTAL</td>
          <td class="mono" style="text-align:right;font-weight:700;color:var(--red)">${fmt(sumD)}</td>
          <td class="mono" style="text-align:right;font-weight:700;color:var(--green)">${fmt(sumC)}</td>
          <td class="mono" style="text-align:right;font-weight:700;color:var(--red)">${fmt(sumSD)}</td>
          <td class="mono" style="text-align:right;font-weight:700;color:var(--green)">${fmt(sumSC)}</td>
        </tr></tfoot>
      </table>
    </div>`;
  } catch(e){ toast(e.message,'err'); } finally{ spin(false); }
}

// ═══════════════════════════════════════════════════════
//  DRE
// ═══════════════════════════════════════════════════════
async function loadDRE(){
  const ini=$('dr-ini').value, fim=$('dr-fim').value;
  if(!ini||!fim) return toast('Selecione o período','err');
  try {
    spin(true);
    const data=await api(`/rel/dre?dataInicio=${ini}&dataFim=${fim}`);
    const out=$('dre-out');
    if(!data.length){ out.innerHTML='<div class="empty" style="padding:60px 0">Sem dados no período</div>'; return; }
    let totRec=0,totDesp=0;
    let recHtml='',despHtml='';
    for(const c of data){
      if(c.tipo==='RECEITA'){
        const v=+c.cred-+c.deb; totRec+=v;
        recHtml+=`<div class="dre-row"><span>${c.codigo} — ${c.nome}</span><span class="mono v-c">${fmt(v)}</span></div>`;
      }
      if(c.tipo==='DESPESA'){
        const v=+c.deb-+c.cred; totDesp+=v;
        despHtml+=`<div class="dre-row"><span>${c.codigo} — ${c.nome}</span><span class="mono v-d">(${fmt(v)})</span></div>`;
      }
    }
    const res=totRec-totDesp; const lucro=res>=0;
    out.innerHTML=`
      <div style="max-width:720px;margin:0 auto">
        <div style="text-align:center;margin-bottom:20px;padding:16px;background:var(--bg3);border:1px solid var(--border2);border-radius:12px">
          <div style="font-size:1rem;font-weight:800;letter-spacing:.02em">DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO</div>
          <div class="mono" style="font-size:.72rem;color:var(--muted);margin-top:4px">Período: ${fmtDate(ini)} a ${fmtDate(fim)}</div>
        </div>

        <div class="dre-section" style="border:1px solid rgba(52,211,153,.15)">
          <div class="dre-hd" style="background:rgba(52,211,153,.08)">
            <span style="color:var(--green)">↑ Receitas</span>
            <span class="mono v-c">${fmt(totRec)}</span>
          </div>
          ${recHtml||'<div class="dre-row" style="color:var(--muted)">Sem receitas no período</div>'}
        </div>

        <div class="dre-section" style="border:1px solid rgba(251,113,133,.15)">
          <div class="dre-hd" style="background:rgba(251,113,133,.08)">
            <span style="color:var(--red)">↓ Despesas e Custos</span>
            <span class="mono v-d">(${fmt(totDesp)})</span>
          </div>
          ${despHtml||'<div class="dre-row" style="color:var(--muted)">Sem despesas no período</div>'}
        </div>

        <div class="dre-result" style="${lucro?'background:rgba(52,211,153,.06);border:1px solid rgba(52,211,153,.2)':'background:rgba(251,113,133,.06);border:1px solid rgba(251,113,133,.2)'}">
          <div>
            <div style="font-size:.65rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Resultado do Período</div>
            <div style="font-size:1.1rem;font-weight:800;margin-top:4px;${lucro?'color:var(--green)':'color:var(--red)'}">${lucro?'Lucro Líquido':'Prejuízo Líquido'}</div>
          </div>
          <div class="mono" style="font-size:2rem;font-weight:700;${lucro?'color:var(--green)':'color:var(--red)'}">${lucro?'':'-'}${fmt(Math.abs(res))}</div>
        </div>
      </div>`;
  } catch(e){ toast(e.message,'err'); } finally{ spin(false); }
}

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
async function init(){
  // defaults
  ['d-ini','lf-ini','di-ini','rz-ini','raz-ini','bl-ini','dr-ini'].forEach(id=>{ const e=$(id); if(e) e.value=mesInicio(); });
  ['d-fim','lf-fim','di-fim','rz-fim','raz-fim','bl-fim','dr-fim'].forEach(id=>{ const e=$(id); if(e) e.value=today(); });

  try {
    contas = await api('/contas');
    populateContaSelects();
    const db=$('db-status');
    db.textContent='● conectado'; db.style.color='var(--green)';
  } catch(e){
    const db=$('db-status');
    db.textContent='● desconectado'; db.style.color='var(--red)';
    toast('Servidor não encontrado. Inicie com: npm start','err');
    return;
  }
  loadDash();
}

function setupRazonetePage(){ /* contas já carregadas */ }

init();