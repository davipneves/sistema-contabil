// src/routes/api.js
const router = require('express').Router();
const PC = require('../controllers/PlanoContasController');
const LC = require('../controllers/LancamentoController');

// Plano de Contas
router.get   ('/contas',      PC.index);
router.get   ('/contas/:id',  PC.show);
router.post  ('/contas',      PC.store);
router.put   ('/contas/:id',  PC.update);
router.delete('/contas/:id',  PC.destroy);

// Lançamentos
router.get   ('/lancamentos',      LC.index);
router.get   ('/lancamentos/:id',  LC.show);
router.post  ('/lancamentos',      LC.store);
router.delete('/lancamentos/:id',  LC.destroy);

// Relatórios
router.get('/rel/diario',    LC.diario);
router.get('/rel/razao',     LC.razao);
router.get('/rel/balancete', LC.balancete);
router.get('/rel/dre',       LC.dre);

module.exports = router;
