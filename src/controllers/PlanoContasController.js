// src/controllers/PlanoContasController.js  ── CONTROLLER
const PlanoContas = require('../models/PlanoContas');

const ok  = (res, data, status=200) => res.status(status).json({ success:true,  data });
const err = (res, msg,  status=400) => res.status(status).json({ success:false, message: msg });

module.exports = {
  async index(req, res) {
    try { ok(res, await PlanoContas.all()); }
    catch(e) { err(res, e.message, 500); }
  },

  async show(req, res) {
    try {
      const c = await PlanoContas.byId(req.params.id);
      c ? ok(res, c) : err(res, 'Conta não encontrada', 404);
    } catch(e) { err(res, e.message, 500); }
  },

  async store(req, res) {
    try { ok(res, { id: await PlanoContas.create(req.body) }, 201); }
    catch(e) { err(res, e.message); }
  },

  async update(req, res) {
    try { await PlanoContas.update(req.params.id, req.body); ok(res, null); }
    catch(e) { err(res, e.message); }
  },

  async destroy(req, res) {
    try { await PlanoContas.deactivate(req.params.id); ok(res, null); }
    catch(e) { err(res, e.message); }
  }
};
