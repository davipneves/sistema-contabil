/* public/js/app.js — ContabiSystem v2.0 */
'use strict';

// ═══════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════
const API = '/api';
const $   = id => document.getElementById(id);
const fmt = v  => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(+v||0);
const fmtNum = (v,d=2) => new Intl.NumberFormat('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}).format(+v||0);
const fmtDate = d => { if(!d) return ''; const p=d.split('T')[0].split('-'); return `${p[2]}/${p[1]}/${p[0]}`; };
const today   = () => { const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); };

function spin(on){ $('spn').classList.toggle('hidden',!on); }
function toast(msg,type='info'){
  const el=$('toast');
  el.textContent=msg; el.className=`toast toast-${type} show`;
  setTimeout(()=>el.classList.remove('show'),3600);
}

async function api(path,opts={}){
  const r = await fetch(API+path,{headers:{'Content-Type':'application/json'},...opts});
  const j = await r.json();
  if(!j.success) throw new Error(j.message||'Erro desconhecido');
  return j.data;
}

// ═══════════════════════════════════════════════════════
//  ESTADO GLOBAL DA EMPRESA
// ═══════════════════════════════════════════════════════
let currentEmpresaId   = parseInt(localStorage.getItem('empresaId')) || 1;
let currentEmpresa     = null;   // objeto completo
let empresas           = [];     // cache de todas as empresas
let contas             = [];     // plano de contas da empresa ativa
let partidas           = [];     // partidas do modal de lançamento
let editContaId        = null;
let editEmpresaId      = null;
let editBemId          = null;
let lancOffset         = 0;
const LANC_LIMIT       = 100;

// qs helper — monta query string incluindo sempre a empresa
function qs(extra={}){
  const p = new URLSearchParams({ empresaId: currentEmpresaId, ...extra });
  return '?'+p.toString();
}

// ═══════════════════════════════════════════════════════
//  NAVEGAÇÃO
// ═══════════════════════════════════════════════════════
const ALL_PAGES = ['dash','lanc','plano','diario','razao','razonete',
                   'balancete','dre','depreciacao','empresas'];

function go(page){
  ALL_PAGES.forEach(p=>{
    const pg = $(`p-${p}`); if(pg) pg.classList.toggle('active', p===page);
    const lk = $(`n-${p}`); if(lk) lk.classList.toggle('active', p===page);
  });
  const loaders={
    dash:       loadDash,
    lanc:       loadLancs,
    plano:      loadPlano,
    diario:     loadDiario,
    balancete:  loadBalancete,
    dre:        loadDRE,
    razonete:   setupRazonetePage,
    depreciacao:loadDepreciacao,
    empresas:   loadEmpresas,
  };
  if(loaders[page]) loaders[page]();
}

// ═══════════════════════════════════════════════════════
//  MODAIS
// ═══════════════════════════════════════════════════════
function openM(id){ $(id).classList.remove('hidden'); }
function closeM(id){ $(id).classList.add('hidden'); }
document.addEventListener('click',e=>{
  ['m-lanc','m-conta','m-empresa','m-bem'].forEach(id=>{
    if(e.target===$(id)) closeM(id);
  });
});

// ═══════════════════════════════════════════════════════
//  EMPRESAS — CARREGAMENTO E SELETOR
// ═══════════════════════════════════════════════════════
async function carregarEmpresas(){
  empresas = await api('/empresas');
  currentEmpresa = empresas.find(e=>e.id===currentEmpresaId) || empresas[0];
  if(currentEmpresa) currentEmpresaId = currentEmpresa.id;
  atualizarSidebarEmpresa();
}

function atualizarSidebarEmpresa(){
  if(!currentEmpresa) return;
  $('sidebar-emp-name').textContent = currentEmpresa.nome;
  const badge = $('sidebar-emp-badge');
  badge.textContent = currentEmpresa.tipo_partida === 'SIMPLES' ? 'Simples' : 'Dobradas';
  badge.className = 'emp-badge ' + (currentEmpresa.tipo_partida==='SIMPLES' ? 'emp-badge-s' : 'emp-badge-d');

  // Atualizar subtítulo da página de lançamentos
  const sub = $('lanc-sub');
  if(sub){
    sub.textContent = currentEmpresa.tipo_partida === 'SIMPLES'
      ? 'Partidas Simples — registro único por lançamento'
      : 'Partidas Dobradas — débito obrigatoriamente = crédito';
  }
}

async function switchEmpresa(id){
  currentEmpresaId = +id;
  localStorage.setItem('empresaId', currentEmpresaId);
  currentEmpresa   = empresas.find(e=>e.id===currentEmpresaId);
  atualizarSidebarEmpresa();
  contas = await api('/contas'+qs());
  populateContaSelects();
  go('dash');
  toast(`Empresa: ${currentEmpresa.nome}`,'info');
}

// ── Listagem de empresas
async function loadEmpresas(){
  try {
    spin(true);
    await carregarEmpresas();
    const el=$('emp-list');
    el.innerHTML = empresas.length
      ? empresas.map(e=>`
        <div class="emp-card ${e.id===currentEmpresaId?'current':''}">
          <div>
            <div style="font-weight:700;color:#fff;font-size:.95rem">${e.nome}</div>
            ${e.cnpj?`<div class="mono" style="font-size:.72rem;color:var(--muted);margin-top:2px">${e.cnpj}</div>`:''}
            <div style="margin-top:6px">
              <span class="emp-badge ${e.tipo_partida==='SIMPLES'?'emp-badge-s':'emp-badge-d'}">
                ${e.tipo_partida==='SIMPLES'?'Partidas Simples':'Partidas Dobradas'}
              </span>
              ${e.id===currentEmpresaId?'<span style="margin-left:8px;font-size:.65rem;color:var(--green)">● ativa</span>':''}
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            ${e.id!==currentEmpresaId?`<button class="btn btn-ghost btn-sm" onclick="switchEmpresa(${e.id})">Selecionar</button>`:''}
            <button class="btn btn-ghost btn-sm" onclick="editEmpresa(${e.id})">✏️</button>
            ${e.id!==1?`<button class="btn btn-danger btn-sm" onclick="delEmpresa(${e.id})">🗑</button>`:''}
          </div>
        </div>`).join('')
      : '<div class="empty">Nenhuma empresa cadastrada</div>';
  } catch(e){ toast(e.message,'err'); }
  finally{ spin(false); }
}

// ── Modal empresa
function openEmpresaModal(){
  editEmpresaId=null;
  $('me-title').textContent='Nova Empresa';
  $('me-id').value=''; $('me-nome').value=''; $('me-cnpj').value='';
  $('me-tipo').value='DOBRADA';
  atualizarInfoTipoPartida();
  openM('m-empresa');
}

$('me-tipo') && $('me-tipo').addEventListener('change', atualizarInfoTipoPartida);

function atualizarInfoTipoPartida(){
  const tipo = $('me-tipo') ? $('me-tipo').value : 'DOBRADA';
  const info = $('me-tipo-info');
  if(!info) return;
  if(tipo==='SIMPLES'){
    info.innerHTML='<strong style="color:var(--gold)">Partidas Simples:</strong> Cada lançamento registra apenas uma entrada (débito OU crédito). Indicado para controles simplificados e microempresas.';
  } else {
    info.innerHTML='<strong style="color:var(--accent2)">Partidas Dobradas:</strong> Cada lançamento exige um débito e um crédito de igual valor (princípio da dualidade). Recomendado para contabilidade formal.';
  }
}

async function editEmpresa(id){
  try {
    const e = await api('/empresas/'+id);
    editEmpresaId=id;
    $('me-title').textContent='Editar Empresa';
    $('me-id').value=id; $('me-nome').value=e.nome; $('me-cnpj').value=e.cnpj||'';
    $('me-tipo').value=e.tipo_partida;
    atualizarInfoTipoPartida();
    openM('m-empresa');
  } catch(e){ toast(e.message,'err'); }
}

async function saveEmpresa(){
  const nome       = $('me-nome').value.trim();
  const cnpj       = $('me-cnpj').value.trim();
  const tipo_partida = $('me-tipo').value;
  if(!nome) return toast('Nome é obrigatório','err');
  try {
    spin(true);
    if(editEmpresaId){
      await api('/empresas/'+editEmpresaId,{method:'PUT',body:JSON.stringify({nome,cnpj,tipo_partida})});
      toast('Empresa atualizada!','ok');
    } else {
      const {id} = await api('/empresas',{method:'POST',body:JSON.stringify({nome,cnpj,tipo_partida})});
      toast(`Empresa "${nome}" criada com plano de contas padrão!`,'ok');
      // Perguntar se quer trocar para a nova empresa
      if(confirm(`Empresa "${nome}" criada. Deseja ativá-la agora?`)){
        await switchEmpresa(id);
        closeM('m-empresa');
        return;
      }
    }
    closeM('m-empresa');
    loadEmpresas();
  } catch(e){ toast(e.message,'err'); }
  finally{ spin(false); }
}

async function delEmpresa(id){
  if(!confirm('Desativar esta empresa? Seus dados serão preservados.')) return;
  try { spin(true); await api('/empresas/'+id,{method:'DELETE'}); toast('Empresa desativada','ok'); loadEmpresas(); }
  catch(e){ toast(e.message,'err'); } finally{ spin(false); }
}

// ═══════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════
async function loadDash(){
  const ini=$('d-ini').value, fim=$('d-fim').value;
  const periodoTxt = (ini&&fim)?`${fmtDate(ini)} a ${fmtDate(fim)}`:'Todo o histórico';
  const sub=$('dash-sub');
  if(sub) sub.innerHTML=`Empresa: <strong style="color:#fff">${currentEmpresa?.nome||''}</strong> — Período: <span style="color:var(--gold)">${periodoTxt}</span>`;
  try {
    spin(true);
    const [dreData,lancData] = await Promise.all([
      api(`/rel/dre${qs({dataInicio:ini,dataFim:fim})}`),
      api(`/lancamentos${qs({dataInicio:ini,dataFim:fim,limit:999999})}`)
    ]);
    let rec=0,desp=0;
    for(const c of dreData){
      if(c.tipo==='RECEITA')  rec  += +c.cred - +c.deb;
      if(c.tipo==='DESPESA')  desp += +c.deb  - +c.cred;
    }
    const res=rec-desp;
    $('s-rec').textContent  = fmt(rec);
    $('s-desp').textContent = fmt(desp);
    $('s-res').textContent  = fmt(res);
    $('s-res').style.color  = res>=0?'var(--green)':'var(--red)';
    $('s-lanc').textContent = lancData.length;
    const rows=lancData.slice(0,10);
    $('d-tbl').innerHTML = rows.length
      ? rows.map(l=>`<tr>
          <td class="mono" style="color:var(--accent2)">#${String(l.numero).padStart(4,'0')}</td>
          <td>${fmtDate(l.data_lancamento)}</td>
          <td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.historico}</td>
          <td class="mono" style="color:var(--muted)">${l.documento||'—'}</td>
          <td class="mono v-c" style="text-align:right">${fmt(l.total)}</td>
        </tr>`).join('')
      : `<tr><td colspan="5" class="empty">Nenhum lançamento no período</td></tr>`;
  } catch(e){ toast(e.message,'err'); } finally{ spin(false); }
}

// ═══════════════════════════════════════════════════════
//  LANÇAMENTOS
// ═══════════════════════════════════════════════════════
async function loadLancs(append=false){
  if(!append) lancOffset=0;
  const ini=$('lf-ini').value, fim=$('lf-fim').value;
  const hist=$('lf-hist').value, ordem=$('lf-ordem').value;
  const extra={limit:LANC_LIMIT,offset:lancOffset,ordem};
  if(ini)  extra.dataInicio=ini;
  if(fim)  extra.dataFim=fim;
  if(hist) extra.historico=hist;

  const filterText=$('lf-active-filter');
  if(filterText){
    if(ini&&fim){ filterText.innerHTML=`🗓 ${fmtDate(ini)} — ${fmtDate(fim)}`; filterText.style.display='block'; }
    else filterText.style.display='none';
  }
  try {
    if(!append) spin(true);
    const data = await api('/lancamentos'+qs(extra));
    const html = data.map(l=>`<tr>
      <td class="mono" style="color:var(--accent2)">#${String(l.numero).padStart(4,'0')}</td>
      <td>${fmtDate(l.data_lancamento)}</td>
      <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${l.historico}">${l.historico}</td>
      <td class="mono" style="color:var(--muted);font-size:.75rem">${l.documento||'—'}</td>
      <td class="mono v-c" style="text-align:right">${fmt(l.total)}</td>
      <td style="text-align:center" class="no-print">
        <button class="btn btn-ghost btn-sm" onclick="viewLanc(${l.id})">👁</button>
        <button class="btn btn-danger btn-sm" onclick="delLanc(${l.id})" style="margin-left:4px">🗑</button>
      </td></tr>`).join('');
    const tbody=$('l-tbl');
    if(!append) tbody.innerHTML=data.length?html:`<tr><td colspan="6" class="empty">Nenhum lançamento encontrado</td></tr>`;
    else tbody.insertAdjacentHTML('beforeend',html);
    const btnWrap=$('l-load-more-wrap');
    if(btnWrap){ if(data.length===LANC_LIMIT){ btnWrap.style.display='block'; lancOffset+=LANC_LIMIT; } else btnWrap.style.display='none'; }
  } catch(e){ toast(e.message,'err'); } finally{ spin(false); }
}

async function viewLanc(id){
  try {
    const l=await api('/lancamentos/'+id);
    const ptHtml=l.partidas.map(p=>`<tr>
      <td class="mono" style="font-size:.75rem;color:var(--muted)">${p.codigo}</td>
      <td>${p.nome}</td>
      <td style="text-align:center"><span class="${p.tipo==='DEBITO'?'tipo-d':'tipo-c'}">${p.tipo==='DEBITO'?'DÉBIT':'CRÉD.'}</span></td>
      <td class="mono" style="text-align:right;${p.tipo==='DEBITO'?'color:var(--red)':'color:var(--green)'}">${fmt(p.valor)}</td>
    </tr>`).join('');
    const el=document.createElement('div');
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
        <table class="tbl"><thead><tr><th>Código</th><th>Conta</th><th>Tipo</th><th style="text-align:right">Valor</th></tr></thead>
        <tbody>${ptHtml}</tbody></table>
      </div>
    </div>`;
    el.addEventListener('click',e=>{ if(e.target===el) el.remove(); });
    document.body.appendChild(el);
  } catch(e){ toast(e.message,'err'); }
}

async function delLanc(id){
  if(!confirm('Excluir este lançamento? Ação irreversível.')) return;
  try { spin(true); await api('/lancamentos/'+id,{method:'DELETE'}); toast('Lançamento excluído','ok'); loadLancs(); }
  catch(e){ toast(e.message,'err'); } finally{ spin(false); }
}

// ── Modal de Lançamento — adapta conforme tipo de partida
function openLancModal(){
  partidas=[];
  $('ml-data').value=today();
  $('ml-hist').value=''; $('ml-doc').value='';
  const isSimples = currentEmpresa?.tipo_partida==='SIMPLES';
  const badge=$('ml-tipo-badge');
  if(badge) badge.innerHTML = isSimples
    ? '<span style="background:rgba(251,191,36,.12);color:var(--gold);border:1px solid rgba(251,191,36,.2);border-radius:20px;padding:2px 10px;font-size:.68rem;font-weight:700">Partidas Simples</span>'
    : '<span style="background:rgba(99,102,241,.12);color:var(--accent2);border:1px solid rgba(99,102,241,.2);border-radius:20px;padding:2px 10px;font-size:.68rem;font-weight:700">Partidas Dobradas</span>';
  const label=$('ml-partidas-label');
  if(label) label.textContent = isSimples
    ? 'Registro (1 partida)' : 'Partida Dobrada (1 Débito e 1 Crédito)';
  const totBar=$('ml-totals-bar');
  if(totBar) totBar.style.display = isSimples ? 'none' : 'flex';
  renderParts();
  openM('m-lanc');
  if(isSimples){ addP('DEBITO'); } else { addP('DEBITO'); addP('CREDITO'); }
}

function addP(tipo){
  partidas.push({_id:Date.now()+Math.random(),tipo,conta_id:'',valor:0});
  renderParts();
}
function removeP(_id){ partidas=partidas.filter(p=>p._id!=_id); renderParts(); }
function setPVal(_id,field,val){
  const p=partidas.find(x=>x._id==_id);
  if(p) p[field]= field==='valor'?parseFloat(val)||0:val;
  updateTotals();
}

function renderParts(){
  const w=$('partidas-wrap');
  const isSimples=currentEmpresa?.tipo_partida==='SIMPLES';
  w.innerHTML=partidas.map(p=>`
    <div class="partida-row">
      ${isSimples
        ? `<select class="inp" style="width:110px" onchange="setPVal(${p._id},'tipo',this.value)">
             <option value="DEBITO" ${p.tipo==='DEBITO'?'selected':''}>DÉBITO</option>
             <option value="CREDITO" ${p.tipo==='CREDITO'?'selected':''}>CRÉDITO</option>
           </select>`
        : `<span class="${p.tipo==='DEBITO'?'tipo-d':'tipo-c'}">${p.tipo==='DEBITO'?'DÉBITO':'CRÉDITO'}</span>`
      }
      <select class="inp" style="flex:1" onchange="setPVal(${p._id},'conta_id',this.value)">
        <option value="">Selecione a conta analítica…</option>
        ${contas.map(c=>{
          const dis=!c.aceita_lancamentos?'disabled':'';
          const recuo='&nbsp;&nbsp;'.repeat(c.nivel-1);
          return `<option value="${c.id}" ${dis} ${c.id==p.conta_id?'selected':''}>${recuo}${c.codigo} — ${c.nome}</option>`;
        }).join('')}
      </select>
      <input type="number" step="0.01" min="0.01" placeholder="0,00" value="${p.valor||''}"
        class="inp mono" style="width:130px;text-align:right"
        oninput="setPVal(${p._id},'valor',this.value)"/>
    </div>`).join('');
  updateTotals();
}

function updateTotals(){
  const d=partidas.filter(p=>p.tipo==='DEBITO') .reduce((s,p)=>s+(+p.valor||0),0);
  const c=partidas.filter(p=>p.tipo==='CREDITO').reduce((s,p)=>s+(+p.valor||0),0);
  const totD=$('tot-d'), totC=$('tot-c');
  if(totD) totD.textContent=fmt(d);
  if(totC) totC.textContent=fmt(c);
  const ok=Math.abs(d-c)<0.01&&d>0;
  const ind=$('bal-ind');
  if(ind){ ind.className=ok?'bal-ok':'bal-err'; ind.textContent=ok?'Balanceado ✓':`Dif: ${fmt(Math.abs(d-c))}`; }
}

async function saveLanc(){
  const data_lancamento=$('ml-data').value;
  const historico=$('ml-hist').value.trim();
  const documento=$('ml-doc').value.trim();
  if(!data_lancamento||!historico) return toast('Preencha data e histórico','err');
  if(partidas.length<1) return toast('Adicione pelo menos 1 partida','err');
  if(partidas.some(p=>!p.conta_id)) return toast('Selecione a conta de todas as partidas','err');
  if(partidas.some(p=>!(+p.valor>0))) return toast('Valor de cada partida deve ser > 0','err');
  try {
    spin(true);
    await api('/lancamentos'+qs(),{method:'POST',body:JSON.stringify({data_lancamento,historico,documento,partidas,empresaId:currentEmpresaId})});
    closeM('m-lanc'); toast('Lançamento registrado!','ok'); loadLancs();
  } catch(e){ toast(e.message,'err'); } finally{ spin(false); }
}

// ═══════════════════════════════════════════════════════
//  PLANO DE CONTAS
// ═══════════════════════════════════════════════════════
async function loadPlano(){
  try {
    contas=await api('/contas'+qs());
    const BADGE={ATIVO:'badge-a',PASSIVO:'badge-p',PATRIMONIO_LIQUIDO:'badge-pl',RECEITA:'badge-r',DESPESA:'badge-d'};
    const LABEL={ATIVO:'Ativo',PASSIVO:'Passivo',PATRIMONIO_LIQUIDO:'Patr. Líq.',RECEITA:'Receita',DESPESA:'Despesa'};
    $('pc-tbl').innerHTML=contas.length
      ? contas.map(c=>`<tr>
          <td class="mono" style="padding-left:${c.nivel*14}px;color:var(--gold)">${c.codigo}</td>
          <td style="${c.nivel<=2?'font-weight:700':''}${c.nivel===1?';color:#fff':''}">
            ${c.nome}
            ${c.retificadora?'<span style="font-size:.63rem;color:var(--muted);margin-left:6px;border:1px solid currentColor;border-radius:3px;padding:0 3px">retific.</span>':''}
            ${!c.aceita_lancamentos?'<span style="font-size:.63rem;color:var(--muted);margin-left:6px;border:1px solid currentColor;border-radius:3px;padding:0 3px">grupo</span>':''}
          </td>
          <td><span class="badge ${BADGE[c.tipo]}">${LABEL[c.tipo]}</span></td>
          <td style="font-size:.78rem;color:var(--muted)">${c.natureza==='DEVEDORA'?'Devedora':'Credora'}</td>
          <td style="text-align:center" class="no-print">
            <button class="btn btn-ghost btn-sm" onclick="editConta(${c.id})">✏️</button>
            <button class="btn btn-danger btn-sm" style="margin-left:4px" onclick="delConta(${c.id})">🗑</button>
          </td></tr>`).join('')
      : `<tr><td colspan="5" class="empty">Nenhuma conta cadastrada</td></tr>`;
    populateContaSelects();
  } catch(e){ toast(e.message,'err'); }
}

function populateContaSelects(){
  const rz=$('rz-conta');
  if(rz) rz.innerHTML='<option value="">Selecione a conta…</option>'+
    contas.map(c=>`<option value="${c.id}">${c.codigo} — ${c.nome}</option>`).join('');

  const pai=$('mc-pai');
  if(pai) pai.innerHTML='<option value="">Nenhuma (raiz)</option>'+
    contas.filter(c=>c.id!==editContaId).map(c=>`<option value="${c.id}">${c.codigo} — ${c.nome}</option>`).join('');

  // Selects do modal de bem
  const analíticas=contas.filter(c=>c.aceita_lancamentos);
  ['mb-cativo','mb-cdep','mb-cdesp'].forEach(sid=>{
    const sel=$(sid); if(!sel) return;
    sel.innerHTML='<option value="">—</option>'+
      analíticas.map(c=>`<option value="${c.id}">${c.codigo} — ${c.nome}</option>`).join('');
  });

  // Razonetes
  const rc=$('raz-checks');
  if(!rc) return;
  let grupos=[]; let gAtual=null;
  contas.forEach(c=>{
    if(c.nivel===1){ gAtual={head:c,items:[]}; grupos.push(gAtual); }
    else if(gAtual&&c.nivel>=2) gAtual.items.push(c);
  });
  rc.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px 24px;align-items:start;max-height:420px;overflow-y:auto;width:100%;padding-right:8px';
  rc.innerHTML=grupos.map(g=>{
    const headHtml=`<label style="font-size:.85rem;font-weight:800;color:#fff;margin-bottom:12px;border-bottom:2px solid var(--border2);padding-bottom:6px;display:flex;align-items:center;gap:8px;cursor:pointer">
      <input type="checkbox" value="${g.head.id}" class="raz-chk" style="transform:scale(1.1)"/>
      <div><span class="mono" style="color:var(--gold);margin-right:6px">${g.head.codigo}</span>${g.head.nome}</div>
    </label>`;
    const itemsHtml=g.items.map(c=>{
      const ml=(c.nivel-2)*16;
      const isSin=!c.aceita_lancamentos;
      return `<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.72rem;background:var(--bg2);border:1px solid var(--border2);border-radius:6px;padding:5px 10px;transition:border-color .2s;margin-left:${ml}px;margin-bottom:6px"
        onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border2)'">
        <input type="checkbox" value="${c.id}" class="raz-chk"/>
        <span class="mono" style="color:var(--accent2)">${c.codigo}</span>
        <span style="${isSin?'color:var(--text);font-weight:700':'color:var(--muted)'}">${c.nome}</span>
      </label>`;
    }).join('');
    return `<div style="display:flex;flex-direction:column">${headHtml}${itemsHtml}</div>`;
  }).join('');
}

function openContaModal(){
  editContaId=null; $('mc-title').textContent='Nova Conta';
  $('mc-id').value=''; $('mc-cod').value=''; $('mc-nome').value='';
  $('mc-tipo').value='ATIVO'; $('mc-nat').value='DEVEDORA'; $('mc-niv').value='3'; $('mc-pai').value='';
  populateContaSelects(); openM('m-conta');
}

async function editConta(id){
  try {
    const c=await api('/contas/'+id);
    editContaId=id; $('mc-title').textContent='Editar Conta';
    $('mc-id').value=id; $('mc-cod').value=c.codigo; $('mc-nome').value=c.nome;
    $('mc-tipo').value=c.tipo; $('mc-nat').value=c.natureza; $('mc-niv').value=c.nivel;
    populateContaSelects(); $('mc-pai').value=c.pai_id||'';
    openM('m-conta');
  } catch(e){ toast(e.message,'err'); }
}

async function saveConta(){
  const tipo=$('mc-tipo').value, natureza=$('mc-nat').value;
  const nivel=+$('mc-niv').value, pai_id=$('mc-pai').value||null;
  const natEsperada=['ATIVO','DESPESA'].includes(tipo)?'DEVEDORA':'CREDORA';
  if(natureza!==natEsperada){
    if(!confirm(`Contas do tipo "${tipo}" normalmente têm natureza "${natEsperada}".\nConfirmar natureza "${natureza}" (retificadora)?`)) return;
  }
  if(pai_id&&+pai_id===editContaId) return toast('Uma conta não pode ser pai de si mesma','err');
  const data={codigo:$('mc-cod').value.trim(),nome:$('mc-nome').value.trim(),tipo,natureza,nivel,pai_id,ativa:1,empresaId:currentEmpresaId};
  if(!data.codigo||!data.nome) return toast('Código e nome são obrigatórios','err');
  try {
    spin(true);
    if(editContaId) await api('/contas/'+editContaId,{method:'PUT',body:JSON.stringify(data)});
    else await api('/contas'+qs(),{method:'POST',body:JSON.stringify(data)});
    closeM('m-conta'); toast('Conta salva!','ok'); loadPlano();
  } catch(e){ toast(e.message,'err'); } finally{ spin(false); }
}

async function delConta(id){
  if(!confirm('Desativar esta conta?')) return;
  try { spin(true); await api('/contas/'+id,{method:'DELETE'}); toast('Conta desativada','ok'); loadPlano(); }
  catch(e){ toast(e.message,'err'); } finally{ spin(false); }
}

function autoNat(){
  const t=$('mc-tipo').value;
  $('mc-nat').value=['ATIVO','DESPESA'].includes(t)?'DEVEDORA':'CREDORA';
}


//  LIVRO DIÁRIO
async function loadDiario(){
  const ini=$('di-ini').value, fim=$('di-fim').value;
  try {
    spin(true);
    const data=await api(`/rel/diario${qs({dataInicio:ini,dataFim:fim})}`);
    const out=$('diario-out');
    if(!data.length){ out.innerHTML='<div class="empty" style="padding:60px 0">Nenhum lançamento encontrado</div>'; return; }
    const periodoTxt=(ini&&fim)?`${fmtDate(ini)} a ${fmtDate(fim)}`:'Todo o histórico';
    const map={}; for(const r of data){ if(!map[r.numero]) map[r.numero]={...r,pts:[]}; map[r.numero].pts.push(r); }
    out.innerHTML=`<div style="margin-bottom:16px;padding:12px 16px;background:var(--bg3);border:1px solid var(--border2);border-radius:10px">
      <span style="font-size:.9rem;font-weight:700">LIVRO DIÁRIO</span>
      <span class="mono" style="margin-left:16px;font-size:.75rem;color:var(--muted)">Período: ${periodoTxt} | Empresa: ${currentEmpresa?.nome}</span>
    </div>`+Object.values(map).map(l=>{
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
            <span class="mono line-d">${fmt(p.valor)}</span></div>`).join('')}
          ${cred.map(p=>`<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:.82rem;padding-left:24px">
            <span><span class="line-c" style="font-size:.72rem;font-weight:700;margin-right:8px">C</span>${p.codigo} — ${p.nome}</span>
            <span class="mono line-c">${fmt(p.valor)}</span></div>`).join('')}
        </div></div>`;
    }).join('');
  } catch(e){ toast(e.message,'err'); } finally{ spin(false); }
}

// ═══════════════════════════════════════════════════════
//  LIVRO RAZÃO
// ═══════════════════════════════════════════════════════
async function loadRazao(){
  const contaId=$('rz-conta').value, ini=$('rz-ini').value, fim=$('rz-fim').value;
  if(!contaId) return toast('Selecione uma conta','err');
  try {
    spin(true);
    const data=await api(`/rel/razao${qs({contaId,dataInicio:ini,dataFim:fim})}`);
    const out=$('razao-out');
    if(!data.length){ out.innerHTML='<div class="empty" style="padding:60px 0">Sem movimentação no período</div>'; return; }
    const periodoTxt=(ini&&fim)?`${fmtDate(ini)} — ${fmtDate(fim)}`:'Todo o histórico';
    const c0=contas.find(c=>c.id==contaId);
    const natureza=c0.natureza;
    let saldo=0;
    const rows=data.map(r=>{
      const d=r.tipo==='DEBITO'?+r.valor:0, cr=r.tipo==='CREDITO'?+r.valor:0;
      if(natureza==='DEVEDORA') saldo+=d-cr; else saldo+=cr-d;
      const sAbs=Math.abs(saldo), sTipo=saldo>=0?(natureza==='DEVEDORA'?'D':'C'):(natureza==='DEVEDORA'?'C':'D');
      const prefixo=(!c0.aceita_lancamentos&&r.codigo!==c0.codigo)?`<span class="mono" style="font-size:.65rem;color:var(--gold);margin-right:6px">[${r.codigo}]</span>`:'';
      return `<tr>
        <td class="mono" style="color:var(--accent2)">#${String(r.numero).padStart(4,'0')}</td>
        <td>${fmtDate(r.data_lancamento)}</td>
        <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${prefixo}${r.historico}</td>
        <td class="mono" style="text-align:right;${d?'color:var(--red)':'color:var(--muted)'}">${d?fmt(d):'—'}</td>
        <td class="mono" style="text-align:right;${cr?'color:var(--green)':'color:var(--muted)'}">${cr?fmt(cr):'—'}</td>
        <td class="mono" style="text-align:right;${saldo>=0?'color:var(--green)':'color:var(--red)'}">${fmt(sAbs)} ${sTipo}</td>
      </tr>`;
    });
    const sfAbs=Math.abs(saldo);
    const sfLabel=saldo>=0?(natureza==='DEVEDORA'?'Devedor':'Credor'):(natureza==='DEVEDORA'?'Credor':'Devedor');
    out.innerHTML=`<div class="card" style="overflow:hidden">
      <div class="card-hd">
        <div><span class="mono" style="color:var(--gold)">${c0.codigo}</span>
        <span style="margin-left:10px;font-weight:700">${c0.nome}</span>
        <span class="mono" style="margin-left:12px;font-size:.72rem;color:var(--muted)">${c0.natureza}</span></div>
        <span style="font-size:.75rem;color:var(--muted)">${periodoTxt}</span>
      </div>
      <table class="tbl"><thead><tr><th>Nº</th><th>Data</th><th>Histórico</th>
        <th style="text-align:right;color:var(--red)">Débito</th>
        <th style="text-align:right;color:var(--green)">Crédito</th>
        <th style="text-align:right">Saldo</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
      <tfoot><tr><td colspan="5" style="text-align:right;font-weight:700">Saldo Final:</td>
        <td class="mono" style="text-align:right;font-weight:700;${saldo>=0?'color:var(--green)':'color:var(--red)'}">${fmt(sfAbs)} ${sfLabel}</td>
      </tr></tfoot></table></div>`;
  } catch(e){ toast(e.message,'err'); } finally{ spin(false); }
}

// ═══════════════════════════════════════════════════════
//  RAZONETES
// ═══════════════════════════════════════════════════════
function selectAllRaz(v){ document.querySelectorAll('.raz-chk').forEach(c=>c.checked=v); }
function setupRazonetePage(){ /* contas já carregadas */ }

async function loadRazonetes(){
  const ini=$('raz-ini').value, fim=$('raz-fim').value;
  const ids=[...document.querySelectorAll('.raz-chk:checked')].map(c=>c.value);
  if(!ids.length) return toast('Marque pelo menos uma conta','err');
  try {
    spin(true);
    const out=$('raz-out'); out.innerHTML='';
    const resultados=await Promise.all(ids.map(cid=>
      api(`/rel/razao${qs({contaId:cid,dataInicio:ini,dataFim:fim})}`).then(data=>({cid,data}))
    ));
    for(const {cid,data} of resultados){
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
        const d=debRows[i],c=creRows[i];
        const tagD=(d&&!ct.aceita_lancamentos&&d.codigo!==ct.codigo)?`<span style="font-size:.6rem;color:var(--gold);margin-right:4px">[${d.codigo}]</span>`:'';
        const tagC=(c&&!ct.aceita_lancamentos&&c.codigo!==ct.codigo)?`<span style="font-size:.6rem;color:var(--gold);margin-right:4px">[${c.codigo}]</span>`:'';
        tRows+=`<tr>
          <td class="mono" style="font-size:.72rem;text-align:right;${d?'color:var(--red)':'color:var(--bg2)'};border-right:1px solid var(--border);padding:4px 10px">${tagD}${d?fmt(+d.valor):''}</td>
          <td class="mono" style="font-size:.72rem;${c?'color:var(--green)':'color:var(--bg2)'};padding:4px 10px">${tagC}${c?fmt(+c.valor):''}</td></tr>`;
      }
      const el=document.createElement('div'); el.className='razonete';
      el.innerHTML=`<div class="raz-hd">
        <div class="mono" style="font-size:.72rem;color:var(--accent2)">${ct.codigo}</div>
        <div style="font-size:.85rem;font-weight:700;color:#fff;margin-top:2px">${ct.nome}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1px 1fr;background:rgba(0,0,0,.2)">
        <div style="padding:4px 10px;font-size:.65rem;font-weight:700;color:var(--red);text-align:right">DÉBITO</div>
        <div style="background:var(--border)"></div>
        <div style="padding:4px 10px;font-size:.65rem;font-weight:700;color:var(--green)">CRÉDITO</div>
      </div>
      <table style="width:100%"><tbody>${tRows}</tbody>
        <tfoot><tr style="border-top:2px solid var(--border)">
          <td class="mono" style="padding:6px 10px;text-align:right;font-size:.78rem;font-weight:700;${totD>=totC?'color:var(--red)':'color:var(--muted)'};border-right:1px solid var(--border)">${fmt(totD)}</td>
          <td class="mono" style="padding:6px 10px;font-size:.78rem;font-weight:700;${totC>=totD?'color:var(--green)':'color:var(--muted)'}">${fmt(totC)}</td>
        </tr><tr>
          <td colspan="2" style="text-align:center;padding:8px;font-family:'JetBrains Mono',monospace;font-size:.82rem;font-weight:700;${saldo>=0?'color:var(--gold)':'color:var(--red)'};background:rgba(99,102,241,.06)">
            ${sLabel}: ${fmt(Math.abs(saldo))}
          </td></tr></tfoot></table>`;
      out.appendChild(el);
    }
  } catch(e){ toast(e.message,'err'); } finally{ spin(false); }
}

// ═══════════════════════════════════════════════════════
//  BALANCETE
// ═══════════════════════════════════════════════════════
async function loadBalancete(){
  const ini=$('bl-ini').value, fim=$('bl-fim').value;
  try {
    spin(true);
    const data=await api(`/rel/balancete${qs({dataInicio:ini,dataFim:fim})}`);
    const out=$('bal-out');
    if(!data.length){ out.innerHTML='<div class="empty" style="padding:60px 0">Nenhum dado encontrado</div>'; return; }
    const periodoTxt=(ini&&fim)?`${fmtDate(ini)} — ${fmtDate(fim)}`:'Todo o histórico';
    let sumD=0,sumC=0,sumSD=0,sumSC=0;
    const rows=data.map(c=>{
      const d=+c.deb,cr=+c.cred; sumD+=d; sumC+=cr;
      const saldoLiq=d-cr;
      const isSD=(c.natureza==='DEVEDORA'&&saldoLiq>=0)||(c.natureza==='CREDORA'&&saldoLiq>0);
      const sd=isSD?Math.abs(saldoLiq):0, sc=!isSD?Math.abs(saldoLiq):0;
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
        <div style="font-weight:700">BALANCETE — ${currentEmpresa?.nome}</div>
        <div style="display:flex;align-items:center;gap:12px">
          <span class="mono" style="font-size:.75rem;color:var(--muted)">${periodoTxt}</span>
          <span style="padding:3px 12px;border-radius:20px;font-size:.72rem;font-weight:700;${eq?'background:rgba(52,211,153,.1);color:var(--green);border:1px solid rgba(52,211,153,.2)':'background:rgba(251,113,133,.1);color:var(--red);border:1px solid rgba(251,113,133,.2)'}">${eq?'✓ Conferido':'⚠ Diferença'}</span>
        </div>
      </div>
      <table class="tbl"><thead><tr><th>Código</th><th>Conta</th>
        <th style="text-align:right;color:var(--red)">Mov. Déb.</th>
        <th style="text-align:right;color:var(--green)">Mov. Cré.</th>
        <th style="text-align:right;color:var(--red)">Saldo Dev.</th>
        <th style="text-align:right;color:var(--green)">Saldo Cre.</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
      <tfoot><tr><td colspan="2" style="font-weight:700">TOTAL</td>
        <td class="mono" style="text-align:right;font-weight:700;color:var(--red)">${fmt(sumD)}</td>
        <td class="mono" style="text-align:right;font-weight:700;color:var(--green)">${fmt(sumC)}</td>
        <td class="mono" style="text-align:right;font-weight:700;color:var(--red)">${fmt(sumSD)}</td>
        <td class="mono" style="text-align:right;font-weight:700;color:var(--green)">${fmt(sumSC)}</td>
      </tr></tfoot></table></div>`;
  } catch(e){ toast(e.message,'err'); } finally{ spin(false); }
}

// ═══════════════════════════════════════════════════════
//  DRE
// ═══════════════════════════════════════════════════════
async function loadDRE(){
  const ini=$('dr-ini').value, fim=$('dr-fim').value;
  try {
    spin(true);
    const data=await api(`/rel/dre${qs({dataInicio:ini,dataFim:fim})}`);
    const out=$('dre-out');
    if(!data.length){ out.innerHTML='<div class="empty" style="padding:60px 0">Nenhum dado encontrado</div>'; return; }
    const periodoTxt=(ini&&fim)?`${fmtDate(ini)} a ${fmtDate(fim)}`:'Todo o histórico';
    let totRec=0,totDesp=0,recHtml='',despHtml='';
    for(const c of data){
      if(c.tipo==='RECEITA'){ const v=+c.cred-+c.deb; totRec+=v; recHtml+=`<div class="dre-row"><span>${c.codigo} — ${c.nome}</span><span class="mono v-c">${fmt(v)}</span></div>`; }
      if(c.tipo==='DESPESA'){ const v=+c.deb-+c.cred; totDesp+=v; despHtml+=`<div class="dre-row"><span>${c.codigo} — ${c.nome}</span><span class="mono v-d">(${fmt(v)})</span></div>`; }
    }
    const res=totRec-totDesp, lucro=res>=0;
    out.innerHTML=`<div style="max-width:720px;margin:0 auto">
      <div style="text-align:center;margin-bottom:20px;padding:16px;background:var(--bg3);border:1px solid var(--border2);border-radius:12px">
        <div style="font-size:1rem;font-weight:800">DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO</div>
        <div style="font-size:.78rem;color:var(--accent2);font-weight:600;margin-top:3px">${currentEmpresa?.nome}</div>
        <div class="mono" style="font-size:.72rem;color:var(--muted);margin-top:4px">Período: ${periodoTxt}</div>
      </div>
      <div class="dre-section" style="border:1px solid rgba(52,211,153,.15)">
        <div class="dre-hd" style="background:rgba(52,211,153,.08)"><span style="color:var(--green)">↑ Receitas</span><span class="mono v-c">${fmt(totRec)}</span></div>
        ${recHtml||'<div class="dre-row" style="color:var(--muted)">Sem receitas no período</div>'}
      </div>
      <div class="dre-section" style="border:1px solid rgba(251,113,133,.15)">
        <div class="dre-hd" style="background:rgba(251,113,133,.08)"><span style="color:var(--red)">↓ Despesas e Custos</span><span class="mono v-d">(${fmt(totDesp)})</span></div>
        ${despHtml||'<div class="dre-row" style="color:var(--muted)">Sem despesas no período</div>'}
      </div>
      <div class="dre-result" style="${lucro?'background:rgba(52,211,153,.06);border:1px solid rgba(52,211,153,.2)':'background:rgba(251,113,133,.06);border:1px solid rgba(251,113,133,.2)'}">
        <div>
          <div style="font-size:.65rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Resultado do Período</div>
          <div style="font-size:1.1rem;font-weight:800;margin-top:4px;${lucro?'color:var(--green)':'color:var(--red)'}">${lucro?'Lucro Líquido':'Prejuízo Líquido'}</div>
        </div>
        <div class="mono" style="font-size:2rem;font-weight:700;${lucro?'color:var(--green)':'color:var(--red)'}">${lucro?'':'-'}${fmt(Math.abs(res))}</div>
      </div></div>`;
  } catch(e){ toast(e.message,'err'); } finally{ spin(false); }
}

// ═══════════════════════════════════════════════════════
//  DEPRECIAÇÃO
// ═══════════════════════════════════════════════════════
const METODO_LABEL = {
  LINEAR:             'Linear (Cotas Iguais)',
  SOMA_DIGITOS:       'Soma dos Dígitos dos Anos',
  DECLINIO_CONSTANTE: 'Declínio Constante',
};

async function loadDepreciacao(){
  // Garantir que contas estejam carregadas para os selects do modal
  if(!contas.length) contas=await api('/contas'+qs());
  populateContaSelects();
  loadBens();
}

async function loadBens(){
  try {
    const bens=await api('/bens'+qs());
    const el=$('bens-list');
    el.innerHTML=bens.length
      ? bens.map(b=>{
          const depAnual=(+b.valor_aquisicao - +b.valor_residual) / +b.vida_util;
          return `<div style="background:var(--bg3);border:1px solid var(--border2);border-radius:12px;padding:18px 20px;margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div>
                <div style="font-weight:700;color:#fff;font-size:.95rem">${b.nome}</div>
                ${b.descricao?`<div style="font-size:.75rem;color:var(--muted);margin-top:2px">${b.descricao}</div>`:''}
                <div style="margin-top:8px;display:flex;gap:14px;font-size:.78rem;flex-wrap:wrap">
                  <span>Aquisição: <span class="mono v-g">${fmt(b.valor_aquisicao)}</span></span>
                  <span>Residual: <span class="mono" style="color:var(--muted)">${fmt(b.valor_residual)}</span></span>
                  <span>Vida útil: <span class="mono" style="color:var(--accent2)">${b.vida_util} anos</span></span>
                  <span>Dep/ano: <span class="mono v-d">~${fmt(depAnual)}</span></span>
                  <span>Método: <span style="color:var(--accent2)">${METODO_LABEL[b.metodo]}</span></span>
                  <span>Data: <span class="mono" style="color:var(--muted)">${fmtDate(b.data_aquisicao)}</span></span>
                </div>
              </div>
              <div style="display:flex;gap:8px">
                <button class="btn btn-ghost btn-sm" onclick="verTabelaBem(${b.id})">📊 Tabela</button>
                <button class="btn btn-ghost btn-sm" onclick="editBem(${b.id})">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="delBem(${b.id})">🗑</button>
              </div>
            </div>
          </div>`;
        }).join('')
      : '<div class="empty" style="padding:40px 0">Nenhum bem cadastrado. Clique em "+ Cadastrar Bem" para adicionar.</div>';
  } catch(e){ toast(e.message,'err'); }
}

async function verTabelaBem(id){
  try {
    spin(true);
    const {tabela,totalDepreciado,taxaMediaAnual,depPorMes}=await api(`/bens/${id}/tabela${qs()}`);
    const bem=await api(`/bens/${id}${qs()}`);
    mostrarTabelaDepreciacao(tabela,totalDepreciado,taxaMediaAnual,depPorMes,bem.nome,bem.metodo);
  } catch(e){ toast(e.message,'err'); } finally{ spin(false); }
}

async function calcularDepreciacao(){
  const valor_aquisicao=+$('calc-va').value;
  const valor_residual =+$('calc-vr').value||0;
  const vida_util      =+$('calc-vu').value;
  const data_aquisicao =$('calc-da').value;
  const metodo         =$('calc-metodo').value;
  if(!valor_aquisicao||!vida_util||!data_aquisicao) return toast('Preencha todos os campos obrigatórios','err');
  try {
    spin(true);
    const {tabela,totalDepreciado,taxaMediaAnual,depPorMes}=await api('/bens/calcular',{
      method:'POST',
      body:JSON.stringify({valor_aquisicao,valor_residual,vida_util,metodo,data_aquisicao})
    });
    mostrarTabelaDepreciacao(tabela,totalDepreciado,taxaMediaAnual,depPorMes,'Calculadora Rápida',metodo);
  } catch(e){ toast(e.message,'err'); } finally{ spin(false); }
}

function mostrarTabelaDepreciacao(tabela,totalDep,taxaMedia,depMes,titulo,metodo){
  $('dep-result').classList.remove('hidden');
  $('dep-base').textContent  = fmt(totalDep);
  $('dep-media').textContent = `${fmtNum(taxaMedia,2)}% / ${fmt(totalDep/tabela.length)}`;
  $('dep-mensal').textContent= fmt(depMes);
  $('dep-tbl-title').textContent=`${titulo} — ${METODO_LABEL[metodo]}`;
  $('dep-tbl').innerHTML=tabela.map(r=>`<tr>
    <td class="mono" style="color:var(--accent2)">${r.ano}º</td>
    <td class="mono" style="color:var(--muted)">${r.anoExercicio}</td>
    <td class="mono" style="text-align:right;color:var(--muted)">${fmtNum(r.taxa,2)}%</td>
    <td class="mono v-d" style="text-align:right">${fmt(r.depAnual)}</td>
    <td class="mono" style="text-align:right;color:var(--gold)">${fmt(r.depAcumulada)}</td>
    <td class="mono v-c" style="text-align:right">${fmt(r.valorLiquido)}</td>
  </tr>`).join('');
  // Scroll para o resultado
  $('dep-result').scrollIntoView({behavior:'smooth',block:'start'});
}

// ── Modal Bem
function openBemModal(){
  editBemId=null;
  $('mb-title').textContent='Cadastrar Bem';
  $('mb-id').value=''; $('mb-nome').value=''; $('mb-desc').value='';
  $('mb-va').value=''; $('mb-vr').value='0'; $('mb-vu').value='';
  $('mb-da').value=today(); $('mb-metodo').value='LINEAR';
  $('mb-cativo').value=''; $('mb-cdep').value=''; $('mb-cdesp').value='';
  openM('m-bem');
}

async function editBem(id){
  try {
    const b=await api(`/bens/${id}${qs()}`);
    editBemId=id;
    $('mb-title').textContent='Editar Bem';
    $('mb-id').value=id; $('mb-nome').value=b.nome; $('mb-desc').value=b.descricao||'';
    $('mb-va').value=b.valor_aquisicao; $('mb-vr').value=b.valor_residual;
    $('mb-vu').value=b.vida_util; $('mb-da').value=b.data_aquisicao?.split('T')[0]||'';
    $('mb-metodo').value=b.metodo;
    $('mb-cativo').value=b.conta_ativo_id||'';
    $('mb-cdep').value=b.conta_dep_id||'';
    $('mb-cdesp').value=b.conta_desp_id||'';
    openM('m-bem');
  } catch(e){ toast(e.message,'err'); }
}

async function saveBem(){
  const payload={
    nome:            $('mb-nome').value.trim(),
    descricao:       $('mb-desc').value.trim(),
    valor_aquisicao: +$('mb-va').value,
    valor_residual:  +$('mb-vr').value||0,
    vida_util:       +$('mb-vu').value,
    data_aquisicao:  $('mb-da').value,
    metodo:          $('mb-metodo').value,
    conta_ativo_id:  $('mb-cativo').value||null,
    conta_dep_id:    $('mb-cdep').value||null,
    conta_desp_id:   $('mb-cdesp').value||null,
    empresaId:       currentEmpresaId,
  };
  if(!payload.nome) return toast('Nome do bem é obrigatório','err');
  if(!payload.data_aquisicao) return toast('Data de aquisição é obrigatória','err');
  if(!(payload.valor_aquisicao>0)) return toast('Valor de aquisição deve ser > 0','err');
  if(!(payload.vida_util>0)) return toast('Vida útil deve ser > 0','err');
  try {
    spin(true);
    if(editBemId) await api(`/bens/${editBemId}${qs()}`,{method:'PUT',body:JSON.stringify(payload)});
    else await api('/bens'+qs(),{method:'POST',body:JSON.stringify(payload)});
    closeM('m-bem'); toast('Bem salvo!','ok'); loadBens();
  } catch(e){ toast(e.message,'err'); } finally{ spin(false); }
}

async function delBem(id){
  if(!confirm('Remover este bem da lista?')) return;
  try { spin(true); await api(`/bens/${id}${qs()}`,{method:'DELETE'}); toast('Bem removido','ok'); loadBens(); }
  catch(e){ toast(e.message,'err'); } finally{ spin(false); }
}

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
async function init(){
  // Zerar datas
  ['d-ini','lf-ini','di-ini','rz-ini','raz-ini','bl-ini','dr-ini'].forEach(id=>{ const e=$(id); if(e) e.value=''; });
  ['d-fim','lf-fim','di-fim','rz-fim','raz-fim','bl-fim','dr-fim'].forEach(id=>{ const e=$(id); if(e) e.value=''; });

  // Listener do tipo de empresa no modal (precisa ser após DOM)
  const meTipo=$('me-tipo');
  if(meTipo) meTipo.addEventListener('change', atualizarInfoTipoPartida);

  try {
    await carregarEmpresas();
    contas=await api('/contas'+qs());
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

init();
