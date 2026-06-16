// src/controllers/LancamentoController.js  v2
'use strict';
const Lancamento = require('../models/Lancamento');

const ok  = (res, data, status = 200) => res.status(status).json({ success: true,  data });
const err = (res, msg,  status = 400) => res.status(status).json({ success: false, message: msg });

const getEmpresaId = req =>
  parseInt(req.query.empresaId || req.body.empresaId) || 1;

module.exports = {
  async index(req, res) {
    try {
      ok(res, await Lancamento.listar({ ...req.query, empresaId: getEmpresaId(req) }));
    } catch (e) { err(res, e.message, 500); }
  },

  async show(req, res) {
    try {
      const l = await Lancamento.buscarPorId(req.params.id);
      l ? ok(res, l) : err(res, 'Não encontrado', 404);
    } catch (e) { err(res, e.message, 500); }
  },

  async store(req, res) {
    try {
      const result = await Lancamento.create({
        ...req.body,
        empresa_id: getEmpresaId(req),
      });
      ok(res, result, 201);
    } catch (e) { err(res, e.message); }
  },

  async destroy(req, res) {
    try {
      await Lancamento.excluir(req.params.id);
      ok(res, null);
    } catch (e) { err(res, e.message); }
  },

  async diario(req, res) {
    try {
      ok(res, await Lancamento.diario({
        empresaId:  getEmpresaId(req),
        dataInicio: req.query.dataInicio,
        dataFim:    req.query.dataFim,
      }));
    } catch (e) { err(res, e.message, 500); }
  },

  async razao(req, res) {
    const { contaId, dataInicio, dataFim } = req.query;
    if (!contaId) return err(res, 'Informe a contaId para gerar o Livro Razão');
    try {
      ok(res, await Lancamento.razao({
        empresaId: getEmpresaId(req),
        contaId, dataInicio, dataFim,
      }));
    } catch (e) { err(res, e.message, 500); }
  },

  async balancete(req, res) {
    try {
      ok(res, await Lancamento.balancete({
        empresaId:  getEmpresaId(req),
        dataInicio: req.query.dataInicio,
        dataFim:    req.query.dataFim,
      }));
    } catch (e) { err(res, e.message, 500); }
  },

  async dre(req, res) {
    try {
      ok(res, await Lancamento.dre({
        empresaId:  getEmpresaId(req),
        dataInicio: req.query.dataInicio,
        dataFim:    req.query.dataFim,
      }));
    } catch (e) { err(res, e.message, 500); }
  },

  async balanco(req, res) {
    try {
      ok(res, await Lancamento.balanco({
        empresaId: getEmpresaId(req),
        data:      req.query.data,
      }));
    } catch (e) { err(res, e.message, 500); }
  },
};
