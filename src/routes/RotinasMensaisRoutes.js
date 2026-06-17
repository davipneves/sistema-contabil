// src/routes/RotinasMensaisRoutes.js
'use strict';
const express = require('express');
const router = express.Router();
const RotinasMensaisController = require('../controllers/RotinasMensaisController');

// Rota para o confronto e abatimento de saldos de ICMS
router.post('/rotinas/apuracao-icms', RotinasMensaisController.apurarICMS);

// Rota para gerar os lançamentos automáticos de duodécimos trabalhistas (1/12 avos)
router.post('/rotinas/provisionar-folha', RotinasMensaisController.provisionarFolha);

module.exports = router;