// src/models/PlanoContas.js  ── MODEL
const db = require('../config/database');

class PlanoContas {

  static async all() {
    const [r] = await db.query(
      'SELECT * FROM plano_contas WHERE ativa=1 ORDER BY codigo'
    );
    return r;
  }

  static async byId(id) {
    const [r] = await db.query('SELECT * FROM plano_contas WHERE id=?', [id]);
    return r[0];
  }

  static async create({ codigo, nome, tipo, natureza, nivel = 3, pai_id = null }) {
    // Contas sintéticas (nível 1 e 2) nunca aceitam lançamentos diretos
    const aceita_lancamentos = nivel >= 3 ? 1 : 0;
    const [r] = await db.query(
      'INSERT INTO plano_contas (codigo,nome,tipo,natureza,nivel,pai_id,aceita_lancamentos) VALUES (?,?,?,?,?,?,?)',
      [codigo, nome, tipo, natureza, nivel, pai_id || null, aceita_lancamentos]
    );
    return r.insertId;
  }

  static async update(id, { codigo, nome, tipo, natureza, nivel, pai_id, ativa }) {
    if (pai_id && +pai_id === +id)
      throw new Error('Uma conta não pode ser pai de si mesma');
    await db.query(
      'UPDATE plano_contas SET codigo=?,nome=?,tipo=?,natureza=?,nivel=?,pai_id=?,ativa=? WHERE id=?',
      [codigo, nome, tipo, natureza, nivel, pai_id || null, ativa ?? 1, id]
    );
  }

  static async deactivate(id) {
    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) AS total FROM partidas WHERE conta_id = ?', [id]
    );
    if (total > 0)
      throw new Error(
        `Esta conta possui ${total} lançamento(s) histórico(s) e não pode ser desativada. ` +
        `Realize um estorno para zerar o saldo e mantenha a conta ativa para preservar a integridade dos relatórios.`
      );
    await db.query('UPDATE plano_contas SET ativa=0 WHERE id=?', [id]);
  }
}

module.exports = PlanoContas;
