// src/routes/api.js  v2
'use strict';
const router = require('express').Router();
const PC  = require('../controllers/PlanoContasController');
const LC  = require('../controllers/LancamentoController');
const EC  = require('../controllers/EmpresaController');
const BC  = require('../controllers/BemController');

// ── Empresas ────────────────────────────────────────────
router.get   ('/empresas',      EC.index);
router.get   ('/empresas/:id',  EC.show);
router.post  ('/empresas',      EC.store);
router.put   ('/empresas/:id',  EC.update);
router.delete('/empresas/:id',  EC.destroy);

// ── Plano de Contas ──────────────────────────────────────
router.get   ('/contas',      PC.index);
router.get   ('/contas/:id',  PC.show);
router.post  ('/contas',      PC.store);
router.put   ('/contas/:id',  PC.update);
router.delete('/contas/:id',  PC.destroy);

// ── Lançamentos ──────────────────────────────────────────
router.get   ('/lancamentos',      LC.index);
router.get   ('/lancamentos/:id',  LC.show);
router.post  ('/lancamentos',      LC.store);
router.delete('/lancamentos/:id',  LC.destroy);

// ── Relatórios ───────────────────────────────────────────
router.get('/rel/diario',    LC.diario);
router.get('/rel/razao',     LC.razao);
router.get('/rel/balancete', LC.balancete);
router.get('/rel/dre',       LC.dre);
router.get('/rel/balanco',   LC.balanco);

// ── Bens / Depreciação ───────────────────────────────────
router.get   ('/bens',              BC.index);
router.get   ('/bens/:id',          BC.show);
router.get   ('/bens/:id/tabela',   BC.tabela);
router.post  ('/bens/calcular',     BC.calcular);
router.post  ('/bens',              BC.store);
router.put   ('/bens/:id',          BC.update);
router.delete('/bens/:id',          BC.destroy);

module.exports = router;
