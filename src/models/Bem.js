// src/models/Bem.js — Ativos Imobilizados e Cálculo de Depreciação
'use strict';
const pool = require('../config/database');

// ─────────────────────────────────────────────────────────
//  CÁLCULO DE DEPRECIAÇÃO (puro — sem banco de dados)
// ─────────────────────────────────────────────────────────

/**
 * Gera a tabela de depreciação de um bem.
 * @param {Object} p  - Parâmetros do bem
 * @param {number} p.valor_aquisicao  - Custo de aquisição (R$)
 * @param {number} p.valor_residual   - Valor residual ao final da vida útil (R$)
 * @param {number} p.vida_util        - Vida útil em anos
 * @param {string} p.metodo          - 'LINEAR' 
 * @param {string} p.data_aquisicao  - ISO date 'YYYY-MM-DD'
 * @returns {Array} linhas: { ano, anoExercicio, depAnual, depAcumulada, valorLiquido, taxa }
 */
function calcularTabela({ valor_aquisicao, valor_residual, vida_util, metodo, data_aquisicao }) {
  const VA  = +valor_aquisicao;
  const VR  = +valor_residual;
  const n   = +vida_util;
  const base = VA - VR; // base depreciável

  if (VA <= 0)    throw new Error('Valor de aquisição deve ser maior que zero');
  if (VR < 0)     throw new Error('Valor residual não pode ser negativo');
  if (VR >= VA)   throw new Error('Valor residual deve ser menor que o valor de aquisição');
  if (n <= 0 || !Number.isInteger(n)) throw new Error('Vida útil deve ser um inteiro positivo');

  const anoInicio = new Date(data_aquisicao).getFullYear();
  const linhas = [];
  let depAcum  = 0;
  let vl       = VA; // valor líquido (valor contábil)

  for (let k = 1; k <= n; k++) {
    let depAnual = 0;

    if (metodo === 'LINEAR') {
      // Cotas iguais ao longo da vida útil
      depAnual = base / n;

    } else if (metodo === 'SOMA_DIGITOS') {
      // SYD — pesos maiores nos anos iniciais
      // Soma dos dígitos = n*(n+1)/2
      const syd = (n * (n + 1)) / 2;
      depAnual  = ((n + 1 - k) / syd) * base;

    } else if (metodo === 'DECLINIO_CONSTANTE') {
      // Taxa constante sobre o valor líquido do exercício
      // Taxa = 1 - (VR/VA)^(1/n)
      const taxa = 1 - Math.pow(VR / VA, 1 / n);
      depAnual   = vl * taxa;
      // Garantir que não baixe abaixo do valor residual
      if (vl - depAnual < VR) depAnual = vl - VR;

    } else {
      throw new Error(`Método de depreciação inválido: ${metodo}`);
    }

    // Arredondar centavos; garantir que não depreciamos além da base
    depAnual = Math.min(Math.round(depAnual * 100) / 100, vl - VR);
    depAcum  = Math.round((depAcum + depAnual) * 100) / 100;
    vl       = Math.round((vl - depAnual) * 100) / 100;

    const taxaPct = VA > 0 ? (depAnual / VA) * 100 : 0;

    linhas.push({
      ano:          k,
      anoExercicio: anoInicio + k - 1,
      depAnual:     +depAnual.toFixed(2),
      depAcumulada: +depAcum.toFixed(2),
      valorLiquido: +vl.toFixed(2),
      taxa:         +taxaPct.toFixed(4),
    });
  }

  // Ajuste final: o valor líquido deve ser exatamente o VR
  if (linhas.length > 0) {
    const last = linhas[linhas.length - 1];
    if (Math.abs(last.valorLiquido - VR) > 0.01) {
      const diff = last.valorLiquido - VR;
      last.depAnual     = +(last.depAnual + diff).toFixed(2);
      last.depAcumulada = +base.toFixed(2);
      last.valorLiquido = +VR.toFixed(2);
    }
  }

  return linhas;
}

/**
 * Resumo estatístico rápido de um bem.
 */
function calcularResumo(bem) {
  const tabela  = calcularTabela(bem);
  const VA      = +bem.valor_aquisicao;
  const VR      = +bem.valor_residual;
  const base    = VA - VR;
  const txMedia = bem.vida_util > 0 ? (base / VA / bem.vida_util) * 100 : 0;

  return {
    tabela,
    totalDepreciado: base,
    taxaMediaAnual:  +txMedia.toFixed(4),
    depPorMes:       +(base / bem.vida_util / 12).toFixed(2),
  };
}

// ─────────────────────────────────────────────────────────
//  CRUD — BENS
// ─────────────────────────────────────────────────────────
async function listar(empresaId) {
  const [rows] = await pool.query(
    `SELECT b.*,
            ca.codigo AS cod_ativo, ca.nome AS nm_ativo,
            cd.codigo AS cod_dep,   cd.nome AS nm_dep,
            cx.codigo AS cod_desp,  cx.nome AS nm_desp
     FROM bens b
     LEFT JOIN plano_contas ca ON ca.id = b.conta_ativo_id
     LEFT JOIN plano_contas cd ON cd.id = b.conta_dep_id
     LEFT JOIN plano_contas cx ON cx.id = b.conta_desp_id
     WHERE b.empresa_id = ? AND b.ativa = 1
     ORDER BY b.nome`,
    [empresaId]
  );
  return rows;
}

async function buscarPorId(id, empresaId) {
  const [[row]] = await pool.query(
    'SELECT * FROM bens WHERE id = ? AND empresa_id = ?', [id, empresaId]
  );
  return row || null;
}

async function criar({ empresa_id, nome, descricao, valor_aquisicao, valor_residual,
                        vida_util, metodo, data_aquisicao,
                        conta_ativo_id, conta_dep_id, conta_desp_id }) {
  // Validações
  if (!nome || !nome.trim()) throw new Error('Nome do bem é obrigatório');
  if (!data_aquisicao)       throw new Error('Data de aquisição é obrigatória');

  // Dispara o cálculo para validar os parâmetros antes de salvar
  calcularTabela({ valor_aquisicao, valor_residual, vida_util, metodo, data_aquisicao });

  const [r] = await pool.query(
    `INSERT INTO bens
       (empresa_id, nome, descricao, valor_aquisicao, valor_residual, vida_util,
        metodo, data_aquisicao, conta_ativo_id, conta_dep_id, conta_desp_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [empresa_id, nome.trim(), descricao || null,
     +valor_aquisicao, +(valor_residual || 0), +vida_util,
     metodo, data_aquisicao,
     conta_ativo_id || null, conta_dep_id || null, conta_desp_id || null]
  );
  return r.insertId;
}

async function atualizar(id, empresaId, dados) {
  const bem = await buscarPorId(id, empresaId);
  if (!bem) throw new Error('Bem não encontrado');

  // Validar se há lançamentos gerados; aqui só avisamos, pois recalcular é OK
  calcularTabela({
    valor_aquisicao: dados.valor_aquisicao,
    valor_residual:  dados.valor_residual,
    vida_util:       dados.vida_util,
    metodo:          dados.metodo,
    data_aquisicao:  dados.data_aquisicao,
  });

  await pool.query(
    `UPDATE bens SET nome=?, descricao=?, valor_aquisicao=?, valor_residual=?,
     vida_util=?, metodo=?, data_aquisicao=?,
     conta_ativo_id=?, conta_dep_id=?, conta_desp_id=?
     WHERE id=? AND empresa_id=?`,
    [dados.nome, dados.descricao || null,
     +dados.valor_aquisicao, +(dados.valor_residual || 0), +dados.vida_util,
     dados.metodo, dados.data_aquisicao,
     dados.conta_ativo_id || null, dados.conta_dep_id || null, dados.conta_desp_id || null,
     id, empresaId]
  );
}

async function desativar(id, empresaId) {
  const bem = await buscarPorId(id, empresaId);
  if (!bem) throw new Error('Bem não encontrado');
  await pool.query('UPDATE bens SET ativa = 0 WHERE id = ? AND empresa_id = ?', [id, empresaId]);
}

module.exports = { calcularTabela, calcularResumo, listar, buscarPorId, criar, atualizar, desativar };
