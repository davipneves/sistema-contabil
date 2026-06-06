// src/models/PlanoContas.js  ── MODEL v2 (multi-empresa)
'use strict';
const db = require('../config/database');

class PlanoContas {

  static async all(empresaId = 1) {
    const [r] = await db.query(
      'SELECT * FROM plano_contas WHERE ativa=1 AND empresa_id=? ORDER BY codigo',
      [empresaId]
    );
    return r;
  }

  static async byId(id) {
    const [r] = await db.query('SELECT * FROM plano_contas WHERE id=?', [id]);
    return r[0];
  }

  static async create({ codigo, nome, tipo, natureza, nivel = 3, pai_id = null, empresa_id = 1 }) {
    if (pai_id) {
      const [[pai]] = await db.query('SELECT tipo, empresa_id FROM plano_contas WHERE id = ?', [pai_id]);
      if (pai) {
        tipo = pai.tipo;
        // Garantir que a subconta pertence à mesma empresa que o pai
        if (+pai.empresa_id !== +empresa_id) {
          throw new Error('A conta pai não pertence à mesma empresa');
        }
      }
    }
    const aceita_lancamentos = nivel >= 3 ? 1 : 0;
    const [r] = await db.query(
      'INSERT INTO plano_contas (empresa_id,codigo,nome,tipo,natureza,nivel,pai_id,aceita_lancamentos) VALUES (?,?,?,?,?,?,?,?)',
      [empresa_id, codigo, nome, tipo, natureza, nivel, pai_id || null, aceita_lancamentos]
    );
    return r.insertId;
  }

  static async update(id, { codigo, nome, tipo, natureza, nivel, pai_id, ativa }) {
    if (pai_id) {
      const [[pai]] = await db.query('SELECT tipo FROM plano_contas WHERE id = ?', [pai_id]);
      if (pai) tipo = pai.tipo;
    }
    if (pai_id && +pai_id === +id)
      throw new Error('Uma conta não pode ser pai de si mesma');

    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM partidas WHERE conta_id = ?', [id]);

    if (total > 0) {
      await db.query(
        'UPDATE plano_contas SET codigo=?,nome=?,nivel=?,pai_id=?,ativa=? WHERE id=?',
        [codigo, nome, nivel, pai_id || null, ativa ?? 1, id]
      );
    } else {
      await db.query(
        'UPDATE plano_contas SET codigo=?,nome=?,tipo=?,natureza=?,nivel=?,pai_id=?,ativa=? WHERE id=?',
        [codigo, nome, tipo, natureza, nivel, pai_id || null, ativa ?? 1, id]
      );
    }
  }

  static async deactivate(id) {
    const [[{ filhos }]] = await db.query(
      'SELECT COUNT(*) AS filhos FROM plano_contas WHERE pai_id = ? AND ativa = 1', [id]
    );
    if (filhos > 0)
      throw new Error('Esta conta possui subcontas ativas. Desative as contas filhas primeiro.');

    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) AS total FROM partidas WHERE conta_id = ?', [id]
    );
    if (total > 0)
      throw new Error(
        `Esta conta possui ${total} lançamento(s) histórico(s) e não pode ser desativada. ` +
        `Realize um estorno para zerar o saldo.`
      );
    await db.query('UPDATE plano_contas SET ativa=0 WHERE id=?', [id]);
  }
}

module.exports = PlanoContas;
