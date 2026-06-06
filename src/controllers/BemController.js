// src/controllers/BemController.js
'use strict';
const Bem = require('../models/Bem');

const ok  = (res, data, status = 200) => res.status(status).json({ success: true,  data });
const err = (res, msg,  status = 400) => res.status(status).json({ success: false, message: msg });

const getEmpresaId = req =>
  parseInt(req.query.empresaId || req.body.empresaId) || 1;

module.exports = {
  // GET /bens — listar bens da empresa
  async index(req, res) {
    try { ok(res, await Bem.listar(getEmpresaId(req))); }
    catch (e) { err(res, e.message, 500); }
  },

  // GET /bens/:id
  async show(req, res) {
    try {
      const bem = await Bem.buscarPorId(req.params.id, getEmpresaId(req));
      bem ? ok(res, bem) : err(res, 'Bem não encontrado', 404);
    } catch (e) { err(res, e.message, 500); }
  },

  // GET /bens/:id/tabela — tabela de depreciação do bem salvo
  async tabela(req, res) {
    try {
      const bem = await Bem.buscarPorId(req.params.id, getEmpresaId(req));
      if (!bem) return err(res, 'Bem não encontrado', 404);
      ok(res, Bem.calcularResumo(bem));
    } catch (e) { err(res, e.message, 500); }
  },

  // POST /bens/calcular — cálculo avulso (sem persistir)
  async calcular(req, res) {
    try {
      const resumo = Bem.calcularResumo(req.body);
      ok(res, resumo);
    } catch (e) { err(res, e.message); }
  },

  // POST /bens
  async store(req, res) {
    try {
      const id = await Bem.criar({ ...req.body, empresa_id: getEmpresaId(req) });
      ok(res, { id }, 201);
    } catch (e) { err(res, e.message); }
  },

  // PUT /bens/:id
  async update(req, res) {
    try {
      await Bem.atualizar(req.params.id, getEmpresaId(req), req.body);
      ok(res, null);
    } catch (e) { err(res, e.message); }
  },

  // DELETE /bens/:id
  async destroy(req, res) {
    try {
      await Bem.desativar(req.params.id, getEmpresaId(req));
      ok(res, null);
    } catch (e) { err(res, e.message); }
  },
};
