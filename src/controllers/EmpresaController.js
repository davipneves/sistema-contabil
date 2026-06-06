// src/controllers/EmpresaController.js
'use strict';
const Empresa = require('../models/Empresa');

const ok  = (res, data, status = 200) => res.status(status).json({ success: true,  data });
const err = (res, msg,  status = 400) => res.status(status).json({ success: false, message: msg });

module.exports = {
  async index(req, res) {
    try { ok(res, await Empresa.listar()); }
    catch (e) { err(res, e.message, 500); }
  },

  async show(req, res) {
    try {
      const emp = await Empresa.buscarPorId(req.params.id);
      emp ? ok(res, emp) : err(res, 'Empresa não encontrada', 404);
    } catch (e) { err(res, e.message, 500); }
  },

  async store(req, res) {
    try {
      const id = await Empresa.criar(req.body);
      ok(res, { id }, 201);
    } catch (e) { err(res, e.message); }
  },

  async update(req, res) {
    try {
      await Empresa.atualizar(req.params.id, req.body);
      ok(res, null);
    } catch (e) { err(res, e.message); }
  },

  async destroy(req, res) {
    try {
      await Empresa.desativar(req.params.id);
      ok(res, null);
    } catch (e) { err(res, e.message); }
  },
};
