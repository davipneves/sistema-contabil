// src/models/Empresa.js
'use strict';
const pool = require('../config/database');

// Plano de contas padrão — copiado para cada nova empresa
const CONTAS_PADRAO = [
  { codigo:'1',      nome:'ATIVO',                         tipo:'ATIVO',              natureza:'DEVEDORA', nivel:1, aceita:0, ret:0 },
  { codigo:'1.1',    nome:'Ativo Circulante',              tipo:'ATIVO',              natureza:'DEVEDORA', nivel:2, aceita:0, ret:0 },
  { codigo:'1.1.01', nome:'Caixa',                         tipo:'ATIVO',              natureza:'DEVEDORA', nivel:3, aceita:1, ret:0 },
  { codigo:'1.1.02', nome:'Banco Conta Corrente',          tipo:'ATIVO',              natureza:'DEVEDORA', nivel:3, aceita:1, ret:0 },
  { codigo:'1.1.03', nome:'Clientes a Receber',            tipo:'ATIVO',              natureza:'DEVEDORA', nivel:3, aceita:1, ret:0 },
  { codigo:'1.1.04', nome:'Estoques',                      tipo:'ATIVO',              natureza:'DEVEDORA', nivel:3, aceita:1, ret:0 },
  { codigo:'1.1.05', nome:'Adiantamentos',                 tipo:'ATIVO',              natureza:'DEVEDORA', nivel:3, aceita:1, ret:0 },
  { codigo:'1.2',    nome:'Ativo Não Circulante',          tipo:'ATIVO',              natureza:'DEVEDORA', nivel:2, aceita:0, ret:0 },
  { codigo:'1.2.01', nome:'Imobilizado',                   tipo:'ATIVO',              natureza:'DEVEDORA', nivel:3, aceita:1, ret:0 },
  { codigo:'1.2.02', nome:'Depreciação Acumulada',         tipo:'ATIVO',              natureza:'CREDORA',  nivel:3, aceita:1, ret:1 },
  { codigo:'2',      nome:'PASSIVO',                       tipo:'PASSIVO',            natureza:'CREDORA',  nivel:1, aceita:0, ret:0 },
  { codigo:'2.1',    nome:'Passivo Circulante',            tipo:'PASSIVO',            natureza:'CREDORA',  nivel:2, aceita:0, ret:0 },
  { codigo:'2.1.01', nome:'Fornecedores',                  tipo:'PASSIVO',            natureza:'CREDORA',  nivel:3, aceita:1, ret:0 },
  { codigo:'2.1.02', nome:'Salários a Pagar',              tipo:'PASSIVO',            natureza:'CREDORA',  nivel:3, aceita:1, ret:0 },
  { codigo:'2.1.03', nome:'Impostos a Recolher',           tipo:'PASSIVO',            natureza:'CREDORA',  nivel:3, aceita:1, ret:0 },
  { codigo:'2.1.04', nome:'Empréstimos Bancários CP',      tipo:'PASSIVO',            natureza:'CREDORA',  nivel:3, aceita:1, ret:0 },
  { codigo:'2.2',    nome:'Passivo Não Circulante',        tipo:'PASSIVO',            natureza:'CREDORA',  nivel:2, aceita:0, ret:0 },
  { codigo:'2.2.01', nome:'Financiamentos LP',             tipo:'PASSIVO',            natureza:'CREDORA',  nivel:3, aceita:1, ret:0 },
  { codigo:'3',      nome:'PATRIMÔNIO LÍQUIDO',            tipo:'PATRIMONIO_LIQUIDO', natureza:'CREDORA',  nivel:1, aceita:0, ret:0 },
  { codigo:'3.1',    nome:'Capital Social',                tipo:'PATRIMONIO_LIQUIDO', natureza:'CREDORA',  nivel:2, aceita:1, ret:0 },
  { codigo:'3.2',    nome:'Reservas de Lucros',            tipo:'PATRIMONIO_LIQUIDO', natureza:'CREDORA',  nivel:2, aceita:1, ret:0 },
  { codigo:'3.3',    nome:'Lucros / Prejuízos Acumulados', tipo:'PATRIMONIO_LIQUIDO', natureza:'CREDORA',  nivel:2, aceita:1, ret:0 },
  { codigo:'4',      nome:'RECEITAS',                      tipo:'RECEITA',            natureza:'CREDORA',  nivel:1, aceita:0, ret:0 },
  { codigo:'4.1',    nome:'Receita Bruta de Vendas',       tipo:'RECEITA',            natureza:'CREDORA',  nivel:2, aceita:1, ret:0 },
  { codigo:'4.2',    nome:'Receitas Financeiras',          tipo:'RECEITA',            natureza:'CREDORA',  nivel:2, aceita:1, ret:0 },
  { codigo:'4.3',    nome:'Outras Receitas',               tipo:'RECEITA',            natureza:'CREDORA',  nivel:2, aceita:1, ret:0 },
  { codigo:'5',      nome:'DESPESAS',                      tipo:'DESPESA',            natureza:'DEVEDORA', nivel:1, aceita:0, ret:0 },
  { codigo:'5.1',    nome:'Custo das Mercadorias Vendidas',tipo:'DESPESA',            natureza:'DEVEDORA', nivel:2, aceita:1, ret:0 },
  { codigo:'5.2',    nome:'Despesas com Pessoal',          tipo:'DESPESA',            natureza:'DEVEDORA', nivel:2, aceita:1, ret:0 },
  { codigo:'5.3',    nome:'Despesas Administrativas',      tipo:'DESPESA',            natureza:'DEVEDORA', nivel:2, aceita:1, ret:0 },
  { codigo:'5.4',    nome:'Despesas Financeiras',          tipo:'DESPESA',            natureza:'DEVEDORA', nivel:2, aceita:1, ret:0 },
  { codigo:'5.5',    nome:'Depreciação',                   tipo:'DESPESA',            natureza:'DEVEDORA', nivel:2, aceita:1, ret:0 },
];

// Hierarquia pai → código pai para cada conta
const PAI_MAP = {
  '1.1': '1', '1.2': '1',
  '2.1': '2', '2.2': '2',
  '3.1': '3', '3.2': '3', '3.3': '3',
  '4.1': '4', '4.2': '4', '4.3': '4',
  '5.1': '5', '5.2': '5', '5.3': '5', '5.4': '5', '5.5': '5',
  '1.1.01': '1.1', '1.1.02': '1.1', '1.1.03': '1.1', '1.1.04': '1.1', '1.1.05': '1.1',
  '1.2.01': '1.2', '1.2.02': '1.2',
  '2.1.01': '2.1', '2.1.02': '2.1', '2.1.03': '2.1', '2.1.04': '2.1',
  '2.2.01': '2.2',
};

// Clonar o plano de contas padrão para uma nova empresa
async function _clonarPlanoContas(conn, empresaId) {
  const idMap = {}; // codigo -> novo id

  for (const c of CONTAS_PADRAO) {
    const paiCodigo = PAI_MAP[c.codigo];
    const pai_id   = paiCodigo ? idMap[paiCodigo] || null : null;

    const [r] = await conn.query(
      `INSERT INTO plano_contas
         (empresa_id, codigo, nome, tipo, natureza, nivel, pai_id, aceita_lancamentos, retificadora)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [empresaId, c.codigo, c.nome, c.tipo, c.natureza, c.nivel, pai_id, c.aceita, c.ret]
    );
    idMap[c.codigo] = r.insertId;
  }
}

// ─────────────────────────────────────────────────────────
//  LISTAGEM
// ─────────────────────────────────────────────────────────
async function listar() {
  const [rows] = await pool.query(
    'SELECT * FROM empresas ORDER BY nome'
  );
  return rows;
}

// ─────────────────────────────────────────────────────────
//  BUSCA POR ID
// ─────────────────────────────────────────────────────────
async function buscarPorId(id) {
  const [[row]] = await pool.query(
    'SELECT * FROM empresas WHERE id = ?', [id]
  );
  return row || null;
}

// ─────────────────────────────────────────────────────────
//  CRIAÇÃO
// ─────────────────────────────────────────────────────────
async function criar({ nome, cnpj, tipo_partida }) {
  if (!nome || !nome.trim())
    throw new Error('Nome da empresa é obrigatório');

  if (!['SIMPLES', 'DOBRADA'].includes(tipo_partida))
    throw new Error('Tipo de partida inválido. Use SIMPLES ou DOBRADA');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [r] = await conn.query(
      'INSERT INTO empresas (nome, cnpj, tipo_partida) VALUES (?, ?, ?)',
      [nome.trim(), cnpj || null, tipo_partida]
    );
    const empresaId = r.insertId;

    // Criar sequência de numeração para a nova empresa
    await conn.query(
      'INSERT INTO sequencias (nome, empresa_id, ultimo) VALUES (?, ?, 0)',
      ['lancamento', empresaId]
    );

    // Clonar plano de contas padrão
    await _clonarPlanoContas(conn, empresaId);

    await conn.commit();
    return empresaId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ─────────────────────────────────────────────────────────
//  ATUALIZAÇÃO
  
async function atualizar(id, { nome, cnpj, tipo_partida }) {
  if (!nome || !nome.trim())
    throw new Error('Nome da empresa é obrigatório');

  if (!['SIMPLES', 'DOBRADA'].includes(tipo_partida))
    throw new Error('Tipo de partida inválido');

  // Verificar se já há lançamentos ao tentar mudar o tipo de partida
  const [[emp]] = await pool.query('SELECT tipo_partida FROM empresas WHERE id = ?', [id]);
  if (!emp) throw new Error('Empresa não encontrada');

  if (emp.tipo_partida !== tipo_partida) {
    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM lancamentos WHERE empresa_id = ?', [id]
    );
    if (total > 0) {
      throw new Error(
        `Não é possível alterar o tipo de partida: a empresa já possui ${total} lançamento(s) registrado(s). ` +
        `Alterar o método de escrituração com lançamentos existentes comprometeria a integridade contábil.`
      );
    }
  }

  await pool.query(
    'UPDATE empresas SET nome = ?, cnpj = ?, tipo_partida = ? WHERE id = ?',
    [nome.trim(), cnpj || null, tipo_partida, id]
  );
}

// ─────────────────────────────────────────────────────────
//  DESATIVAÇÃO (nunca excluir — preservar histórico)
// ─────────────────────────────────────────────────────────
async function desativar(id) {
  if (+id === 1) throw new Error('A empresa padrão não pode ser desativada');

  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) AS total FROM lancamentos WHERE empresa_id = ?', [id]
  );
  if (total > 0) {
    throw new Error(
      `Esta empresa possui ${total} lançamento(s) e não pode ser desativada. ` +
      `Desative-a somente após exportar ou arquivar seus dados.`
    );
  }

  await pool.query('UPDATE empresas SET ativa = 0 WHERE id = ?', [id]);
}

module.exports = { listar, buscarPorId, criar, atualizar, desativar };
