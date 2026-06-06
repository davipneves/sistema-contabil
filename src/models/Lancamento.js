// src/models/Lancamento.js  v2 (multi-empresa + partidas simples/dobradas)
'use strict';
const pool = require('../config/database');

// ─────────────────────────────────────────────────────────
//  LISTAGEM
// ─────────────────────────────────────────────────────────
async function listar({ empresaId = 1, dataInicio, dataFim, historico,
                         limit = 100, offset = 0, ordem = 'DESC' } = {}) {
  let sql = `
    SELECT l.id, l.numero, l.data_lancamento, l.historico, l.documento,
           SUM(CASE WHEN p.tipo = 'DEBITO' THEN p.valor ELSE 0 END) AS total
    FROM lancamentos l
    JOIN partidas p ON p.lancamento_id = l.id
    WHERE l.empresa_id = ?
  `;
  const params = [empresaId];

  if (dataInicio) { sql += ' AND l.data_lancamento >= ?'; params.push(dataInicio); }
  if (dataFim)    { sql += ' AND l.data_lancamento <= ?'; params.push(dataFim); }
  if (historico)  { sql += ' AND l.historico LIKE ?';     params.push(`%${historico}%`); }

  const dir = ordem.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  sql += ` GROUP BY l.id ORDER BY l.data_lancamento ${dir}, l.numero ${dir}`;

  const l = parseInt(limit)  || 100;
  const o = parseInt(offset) || 0;
  sql += ' LIMIT ? OFFSET ?';
  params.push(l, o);

  const [rows] = await pool.query(sql, params);
  return rows;
}

// ─────────────────────────────────────────────────────────
//  BUSCA POR ID (com partidas)
// ─────────────────────────────────────────────────────────
async function buscarPorId(id) {
  const [[lanc]] = await pool.query('SELECT * FROM lancamentos WHERE id = ?', [id]);
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
//  CRIAÇÃO — respeita SIMPLES vs DOBRADA
// ─────────────────────────────────────────────────────────
async function create({ empresa_id = 1, data_lancamento, historico, documento, partidas }) {
  if (!data_lancamento || !historico)
    throw new Error('Data e histórico são obrigatórios');

  if (!partidas || partidas.length === 0)
    throw new Error('O lançamento deve ter pelo menos uma partida');

  if (partidas.some(p => !(+p.valor > 0)))
    throw new Error('O valor de cada partida deve ser maior que zero');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Buscar tipo_partida da empresa
    const [[empresa]] = await conn.query(
      'SELECT tipo_partida FROM empresas WHERE id = ? AND ativa = 1', [empresa_id]
    );
    if (!empresa) throw new Error('Empresa não encontrada ou inativa');

    const isSimples = empresa.tipo_partida === 'SIMPLES';

    // ── Validações para PARTIDAS DOBRADAS ────────────────
    if (!isSimples) {
      const debits  = partidas.filter(p => p.tipo === 'DEBITO');
      const credits = partidas.filter(p => p.tipo === 'CREDITO');

      if (debits.length !== 1 || credits.length !== 1) {
        throw new Error(
          'Partidas Dobradas exigem exatamente 1 Débito e 1 Crédito por lançamento.'
        );
      }

      const totalDeb  = debits.reduce( (s, p) => s + +p.valor, 0);
      const totalCred = credits.reduce((s, p) => s + +p.valor, 0);

      if (Math.abs(totalDeb - totalCred) > 0.01) {
        throw new Error(
          `Lançamento desequilibrado: débitos (${totalDeb.toFixed(2)}) ≠ créditos (${totalCred.toFixed(2)})`
        );
      }
    }

    // ── Validações para PARTIDAS SIMPLES ─────────────────
    if (isSimples) {
      if (partidas.length !== 1) {
        throw new Error(
          'Partidas Simples permitem apenas 1 partida por lançamento.'
        );
      }
      if (!['DEBITO','CREDITO'].includes(partidas[0].tipo)) {
        throw new Error('Tipo de partida inválido. Use DEBITO ou CREDITO.');
      }
    }

    // ── Validar contas ────────────────────────────────────
    for (const p of partidas) {
      const [[conta]] = await conn.query(
        'SELECT id, nome, aceita_lancamentos, ativa, empresa_id FROM plano_contas WHERE id = ?',
        [p.conta_id]
      );
      if (!conta) throw new Error(`Conta id=${p.conta_id} não encontrada`);

      if (+conta.empresa_id !== +empresa_id) {
        throw new Error(`A conta "${conta.nome}" não pertence a esta empresa`);
      }
      if (!conta.ativa) {
        throw new Error(`A conta "${conta.nome}" está desativada`);
      }
      if (!conta.aceita_lancamentos) {
        throw new Error(
          `A conta "${conta.nome}" é sintética e não aceita lançamentos diretos. ` +
          `Use uma conta analítica de nível inferior.`
        );
      }
    }

    // ── Gerar número sequencial ───────────────────────────
    await conn.query(
      'UPDATE sequencias SET ultimo = ultimo + 1 WHERE nome = ? AND empresa_id = ?',
      ['lancamento', empresa_id]
    );
    const [[seq]] = await conn.query(
      'SELECT ultimo FROM sequencias WHERE nome = ? AND empresa_id = ?',
      ['lancamento', empresa_id]
    );
    const numero = seq.ultimo;

    // ── Inserir cabeçalho ─────────────────────────────────
    const [result] = await conn.query(
      'INSERT INTO lancamentos (empresa_id, numero, data_lancamento, historico, documento) VALUES (?,?,?,?,?)',
      [empresa_id, numero, data_lancamento, historico, documento || null]
    );
    const lancId = result.insertId;

    // ── Inserir partidas ──────────────────────────────────
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
// ─────────────────────────────────────────────────────────
async function excluir(id) {
  const [[lanc]] = await pool.query(
    'SELECT id, numero, data_lancamento, empresa_id FROM lancamentos WHERE id = ?', [id]
  );
  if (!lanc) throw new Error('Lançamento não encontrado');

  const dataLancStr = new Date(lanc.data_lancamento).toISOString().slice(0, 7);
  const hojeStr     = new Date().toISOString().slice(0, 7);

  if (dataLancStr < hojeStr) {
    throw new Error(
      `Lançamentos de meses anteriores não podem ser excluídos. ` +
      `Para corrigir, registre um lançamento de estorno.`
    );
  }

  await pool.query('DELETE FROM lancamentos WHERE id = ?', [id]);
}

// ─────────────────────────────────────────────────────────
//  RELATÓRIOS (todos filtram por empresa_id)
// ─────────────────────────────────────────────────────────
async function diario({ empresaId = 1, dataInicio, dataFim }) {
  let sql = `
    SELECT l.numero, l.data_lancamento, l.historico, l.documento,
           p.tipo, p.valor, c.codigo, c.nome
    FROM lancamentos l
    JOIN partidas p ON p.lancamento_id = l.id
    JOIN plano_contas c ON c.id = p.conta_id
    WHERE l.empresa_id = ?
  `;
  const params = [empresaId];
  if (dataInicio && dataFim) {
    sql += ' AND l.data_lancamento BETWEEN ? AND ?';
    params.push(dataInicio, dataFim);
  }
  sql += ' ORDER BY l.numero, p.tipo DESC, p.id';
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function razao({ empresaId = 1, contaId, dataInicio, dataFim }) {
  const [[alvo]] = await pool.query(
    'SELECT codigo FROM plano_contas WHERE id = ? AND empresa_id = ?', [contaId, empresaId]
  );
  if (!alvo) return [];

  let sql = `
    SELECT l.numero, l.data_lancamento, l.historico,
           p.tipo, p.valor, c.codigo, c.nome, c.natureza
    FROM partidas p
    JOIN lancamentos l ON l.id = p.lancamento_id
    JOIN plano_contas c ON c.id = p.conta_id
    WHERE l.empresa_id = ?
      AND (c.codigo = ? OR c.codigo LIKE CONCAT(?, '.%'))
  `;
  const codigoLimpo = alvo.codigo.trim();
  const params = [empresaId, codigoLimpo, codigoLimpo];

  if (dataInicio && dataFim) {
    sql += ' AND l.data_lancamento BETWEEN ? AND ?';
    params.push(dataInicio, dataFim);
  }
  sql += ' ORDER BY l.data_lancamento, l.numero, p.id';
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function balancete({ empresaId = 1, dataInicio, dataFim }) {
  let sql = `
    SELECT c.id, c.codigo, c.nome, c.tipo, c.natureza, c.nivel,
           COALESCE(SUM(CASE WHEN p.tipo='DEBITO'  THEN p.valor ELSE 0 END), 0) AS deb,
           COALESCE(SUM(CASE WHEN p.tipo='CREDITO' THEN p.valor ELSE 0 END), 0) AS cred
    FROM plano_contas c
    LEFT JOIN partidas p ON p.conta_id = c.id
    LEFT JOIN lancamentos l ON l.id = p.lancamento_id AND l.empresa_id = ?
  `;
  const params = [empresaId];
  if (dataInicio && dataFim) {
    sql += ' AND l.data_lancamento BETWEEN ? AND ?';
    params.push(dataInicio, dataFim);
  }
  sql += `
    WHERE c.ativa = 1 AND c.empresa_id = ?
    GROUP BY c.id
    HAVING deb > 0 OR cred > 0
    ORDER BY c.codigo
  `;
  params.push(empresaId);
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function dre({ empresaId = 1, dataInicio, dataFim }) {
  let sql = `
    SELECT c.codigo, c.nome, c.tipo,
           COALESCE(SUM(CASE WHEN p.tipo='DEBITO'  THEN p.valor ELSE 0 END), 0) AS deb,
           COALESCE(SUM(CASE WHEN p.tipo='CREDITO' THEN p.valor ELSE 0 END), 0) AS cred
    FROM plano_contas c
    JOIN partidas p ON p.conta_id = c.id
    JOIN lancamentos l ON l.id = p.lancamento_id
    WHERE l.empresa_id = ? AND c.empresa_id = ?
      AND c.tipo IN ('RECEITA','DESPESA')
      AND c.ativa = 1 AND c.aceita_lancamentos = 1
  `;
  const params = [empresaId, empresaId];
  if (dataInicio && dataFim) {
    sql += ' AND l.data_lancamento BETWEEN ? AND ?';
    params.push(dataInicio, dataFim);
  }
  sql += ' GROUP BY c.id ORDER BY c.codigo';
  const [rows] = await pool.query(sql, params);
  return rows;
}

module.exports = { listar, buscarPorId, create, excluir, diario, razao, balancete, dre };
