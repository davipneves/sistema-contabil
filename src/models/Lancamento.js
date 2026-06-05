// src/models/Lancamento.js
const pool = require('../config/database');

// ─────────────────────────────────────────────────────────
//  LISTAGEM
// ─────────────────────────────────────────────────────────
async function listar({ dataInicio, dataFim, historico } = {}) {
  let sql = `
    SELECT l.id, l.numero, l.data_lancamento, l.historico, l.documento,
           SUM(CASE WHEN p.tipo = 'DEBITO' THEN p.valor ELSE 0 END) AS total
    FROM lancamentos l
    JOIN partidas p ON p.lancamento_id = l.id
    WHERE 1=1
  `;
  const params = [];
  if (dataInicio) { sql += ' AND l.data_lancamento >= ?'; params.push(dataInicio); }
  if (dataFim)    { sql += ' AND l.data_lancamento <= ?'; params.push(dataFim); }
  if (historico)  { sql += ' AND l.historico LIKE ?';     params.push(`%${historico}%`); }
  sql += ' GROUP BY l.id ORDER BY l.numero';
  const [rows] = await pool.query(sql, params);
  return rows;
}

// ─────────────────────────────────────────────────────────
//  BUSCA POR ID (com partidas)
// ─────────────────────────────────────────────────────────
async function buscarPorId(id) {
  const [[lanc]] = await pool.query(
    'SELECT * FROM lancamentos WHERE id = ?', [id]
  );
  if (!lanc) return null;
  const [partidas] = await pool.query(`
    SELECT p.*, c.codigo, c.nome
    FROM partidas p
    JOIN plano_contas c ON c.id = p.conta_id
    WHERE p.lancamento_id = ?
    ORDER BY p.tipo DESC, p.id
  `, [id]);
  lanc.partidas = partidas;
  return lanc;
}

// ─────────────────────────────────────────────────────────
//  CRIAÇÃO
// FIX: validações de regra de negócio antes de persistir
// ─────────────────────────────────────────────────────────
async function create({ data_lancamento, historico, documento, partidas }) {
  // 1. Validações básicas
  if (!data_lancamento || !historico) {
    throw new Error('Data e histórico são obrigatórios');
  }
  if (!Array.isArray(partidas) || partidas.length < 2) {
    throw new Error('Um lançamento requer no mínimo 2 partidas');
  }

  // FIX: valor deve ser positivo
  if (partidas.some(p => !(+p.valor > 0))) {
    throw new Error('O valor de cada partida deve ser maior que zero');
  }

  // 2. Validar equilíbrio (partidas dobradas: débitos = créditos)
  const totalDeb = partidas
    .filter(p => p.tipo === 'DEBITO')
    .reduce((s, p) => s + +p.valor, 0);
  const totalCred = partidas
    .filter(p => p.tipo === 'CREDITO')
    .reduce((s, p) => s + +p.valor, 0);

  if (Math.abs(totalDeb - totalCred) > 0.01) {
    throw new Error(
      `Lançamento desequilibrado: débitos (${totalDeb.toFixed(2)}) ≠ créditos (${totalCred.toFixed(2)})`
    );
  }

  // FIX: deve haver pelo menos uma partida a débito e uma a crédito
  if (!partidas.some(p => p.tipo === 'DEBITO')) {
    throw new Error('O lançamento deve conter pelo menos uma partida a débito');
  }
  if (!partidas.some(p => p.tipo === 'CREDITO')) {
    throw new Error('O lançamento deve conter pelo menos uma partida a crédito');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // FIX: verificar que todas as contas aceitam lançamentos (não são sintéticas)
    for (const p of partidas) {
      const [[conta]] = await conn.query(
        'SELECT id, nome, aceita_lancamentos, ativa FROM plano_contas WHERE id = ?',
        [p.conta_id]
      );
      if (!conta) {
        throw new Error(`Conta id=${p.conta_id} não encontrada`);
      }
      if (!conta.ativa) {
        throw new Error(`A conta "${conta.nome}" está desativada e não aceita lançamentos`);
      }
      if (!conta.aceita_lancamentos) {
        throw new Error(
          `A conta "${conta.nome}" é sintética (grupo) e não aceita lançamentos diretos. ` +
          `Use uma conta analítica de nível inferior.`
        );
      }
    }

    // FIX: número sequencial com lock para evitar race condition
    await conn.query(
      'UPDATE sequencias SET ultimo = ultimo + 1 WHERE nome = ?',
      ['lancamento']
    );
    const [[seq]] = await conn.query(
      'SELECT ultimo FROM sequencias WHERE nome = ?',
      ['lancamento']
    );
    const numero = seq.ultimo;

    const [result] = await conn.query(
      'INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (?,?,?,?)',
      [numero, data_lancamento, historico, documento || null]
    );
    const lancId = result.insertId;

    for (const p of partidas) {
      await conn.query(
        'INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (?,?,?,?)',
        [lancId, p.conta_id, p.tipo, +p.valor]
      );
    }

    await conn.commit();
    return { id: lancId, numero };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ─────────────────────────────────────────────────────────
//  EXCLUSÃO
// FIX: bloquear exclusão de lançamentos de períodos encerrados
// ─────────────────────────────────────────────────────────
async function excluir(id) {
  const [[lanc]] = await pool.query(
    'SELECT id, numero, data_lancamento FROM lancamentos WHERE id = ?', [id]
  );
  if (!lanc) throw new Error('Lançamento não encontrado');

  // Proteção: lançamentos de meses anteriores devem ser estornados, não excluídos
  const dataLanc = new Date(lanc.data_lancamento);
  const hoje     = new Date();
  const mesLanc  = dataLanc.getFullYear() * 12 + dataLanc.getMonth();
  const mesAtual = hoje.getFullYear() * 12 + hoje.getMonth();
  if (mesLanc < mesAtual) {
    throw new Error(
      `Lançamento #${String(lanc.numero).padStart(4,'0')} pertence a um período encerrado. ` +
      `Realize um estorno (lançamento inverso) em vez de excluí-lo.`
    );
  }

  // ON DELETE CASCADE cuida das partidas
  await pool.query('DELETE FROM lancamentos WHERE id = ?', [id]);
}

// ─────────────────────────────────────────────────────────
//  RELATÓRIOS
// ─────────────────────────────────────────────────────────
async function diario({ dataInicio, dataFim }) {
  const [rows] = await pool.query(`
    SELECT l.numero, l.data_lancamento, l.historico, l.documento,
           p.tipo, p.valor, c.codigo, c.nome
    FROM lancamentos l
    JOIN partidas p ON p.lancamento_id = l.id
    JOIN plano_contas c ON c.id = p.conta_id
    WHERE l.data_lancamento BETWEEN ? AND ?
    ORDER BY l.numero, p.tipo DESC, p.id
  `, [dataInicio, dataFim]);
  return rows;
}

async function razao({ contaId, dataInicio, dataFim }) {
  const [rows] = await pool.query(`
    SELECT l.numero, l.data_lancamento, l.historico,
           p.tipo, p.valor, c.codigo, c.nome, c.natureza
    FROM partidas p
    JOIN lancamentos l ON l.id = p.lancamento_id
    JOIN plano_contas c ON c.id = p.conta_id
    WHERE p.conta_id = ?
      AND l.data_lancamento BETWEEN ? AND ?
    ORDER BY l.data_lancamento, l.numero, p.id
  `, [contaId, dataInicio, dataFim]);
  return rows;
}

async function balancete({ dataInicio, dataFim }) {
  const [rows] = await pool.query(`
    SELECT c.id, c.codigo, c.nome, c.tipo, c.natureza, c.nivel,
           COALESCE(SUM(CASE WHEN p.tipo='DEBITO'  THEN p.valor ELSE 0 END), 0) AS deb,
           COALESCE(SUM(CASE WHEN p.tipo='CREDITO' THEN p.valor ELSE 0 END), 0) AS cred
    FROM plano_contas c
    LEFT JOIN partidas p ON p.conta_id = c.id
    LEFT JOIN lancamentos l ON l.id = p.lancamento_id
      AND l.data_lancamento BETWEEN ? AND ?
    WHERE c.ativa = 1
    GROUP BY c.id
    HAVING deb > 0 OR cred > 0
    ORDER BY c.codigo
  `, [dataInicio, dataFim]);
  return rows;
}

async function dre({ dataInicio, dataFim }) {
  const [rows] = await pool.query(`
    SELECT c.codigo, c.nome, c.tipo,
           COALESCE(SUM(CASE WHEN p.tipo='DEBITO'  THEN p.valor ELSE 0 END), 0) AS deb,
           COALESCE(SUM(CASE WHEN p.tipo='CREDITO' THEN p.valor ELSE 0 END), 0) AS cred
    FROM plano_contas c
    JOIN partidas p ON p.conta_id = c.id
    JOIN lancamentos l ON l.id = p.lancamento_id
      AND l.data_lancamento BETWEEN ? AND ?
    WHERE c.tipo IN ('RECEITA','DESPESA')
      AND c.ativa = 1
      AND c.aceita_lancamentos = 1
    GROUP BY c.id
    ORDER BY c.codigo
  `, [dataInicio, dataFim]);
  return rows;
}

module.exports = { listar, buscarPorId, create, excluir, diario, razao, balancete, dre };