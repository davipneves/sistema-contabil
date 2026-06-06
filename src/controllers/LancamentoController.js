// src/controllers/LancamentoController.js
const Lancamento = require('../models/Lancamento');

const ok  = (res, data, status=200) => res.status(status).json({ success:true,  data });
const err = (res, msg,  status=400) => res.status(status).json({ success:false, message: msg });

module.exports = {
  async index(req, res) {
    try { ok(res, await Lancamento.listar(req.query)); }
    catch(e) { err(res, e.message, 500); }
  },

  async show(req, res) {
    try {
      const l = await Lancamento.buscarPorId(req.params.id);
      l ? ok(res, l) : err(res, 'Não encontrado', 404);
    } catch(e) { err(res, e.message, 500); }
  },

  async store(req, res) {
    try { ok(res, { id: await Lancamento.create(req.body) }, 201); }
    catch(e) { err(res, e.message); }
  },

  async destroy(req, res) {
    try { await Lancamento.excluir(req.params.id); ok(res, null); }
    catch(e) { err(res, e.message); }
  },

  // ── Relatórios (AGORA SEM A OBRIGATORIEDADE DE DATAS) ──
  async diario(req, res) {
    try { ok(res, await Lancamento.diario({ dataInicio: req.query.dataInicio, dataFim: req.query.dataFim })); }
    catch(ex) { err(res, ex.message, 500); }
  },

  async razao(req, res) {
    const { contaId, dataInicio, dataFim } = req.query;
    if (!contaId) return err(res, 'Informe a contaId para gerar o Livro Razão');
    try { ok(res, await Lancamento.razao({ contaId, dataInicio, dataFim })); }
    catch(ex) { err(res, ex.message, 500); }
  },

  async balancete(req, res) {
    try { ok(res, await Lancamento.balancete({ dataInicio: req.query.dataInicio, dataFim: req.query.dataFim })); }
    catch(ex) { err(res, ex.message, 500); }
  },

  async dre(req, res) {
    try { ok(res, await Lancamento.dre({ dataInicio: req.query.dataInicio, dataFim: req.query.dataFim })); }
    catch(ex) { err(res, ex.message, 500); }
  }
};