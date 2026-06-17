// src/controllers/RotinasMensaisController.js
'use strict';
const pool = require('../config/database');
const RotinasMensais = require('../services/RotinasMensais');

/**
 * BUSCA INTELIGENTE: Procura a conta no banco de dados baseando-se em palavras do nome.
 */
async function buscarConta(tipo, palavrasInclusas, palavrasExclusas, empresaId) {
  let sql = `SELECT id, nome FROM plano_contas WHERE empresa_id = ? AND ativa = 1 AND tipo = ?`;
  let params = [empresaId, tipo];
  
  for (const termo of palavrasInclusas) {
    sql += ` AND nome LIKE ?`;
    params.push(`%${termo}%`);
  }
  for (const termo of palavrasExclusas) {
    sql += ` AND nome NOT LIKE ?`;
    params.push(`%${termo}%`);
  }
  
  sql += ` ORDER BY id DESC LIMIT 1`;
  const [rows] = await pool.query(sql, params);
  
  if (rows.length === 0) {
    throw new Error(`Não achei a conta de ${tipo} com o termo "${palavrasInclusas[0]}". Verifique o Plano de Contas.`);
  }
  return rows[0].id;
}

async function apurarICMS(req, res) {
  const { empresa_id, data_fechamento } = req.body;
  if (!empresa_id || !data_fechamento) return res.status(400).json({ error: 'Dados incompletos.' });

  try {
    const conta_icms_recuperar = await buscarConta('ATIVO', ['ICMS', 'Recuperar'], [], empresa_id);
    const conta_icms_recolher  = await buscarConta('PASSIVO', ['ICMS', 'Recolher'], [], empresa_id);

    const resultado = await RotinasMensais.apurarICMS({
      empresa_id,
      data_fechamento,
      conta_icms_recuperar,
      conta_icms_recolher
    });

    return res.status(200).json(resultado);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function provisionarFolha(req, res) {
  const { empresa_id, data_fechamento } = req.body;
  if (!empresa_id || !data_fechamento) return res.status(400).json({ error: 'Dados incompletos.' });

  try {
    // 1. Achar o total da folha no mês a partir da conta de Salários
    const conta_despesa_salarios = await buscarConta('DESPESA', ['Sal_rio'], ['13', 'INSS', 'FGTS'], empresa_id);
    const anoMes = data_fechamento.substring(0, 7);

    const [[saldoFolha]] = await pool.query(`
      SELECT SUM(p.valor) as total
      FROM partidas p
      JOIN lancamentos l ON l.id = p.lancamento_id
      WHERE p.conta_id = ? AND p.tipo = 'DEBITO' AND l.data_lancamento LIKE ?
    `, [conta_despesa_salarios, `${anoMes}-%`]);

    const base_salarios = parseFloat(saldoFolha.total || 0);

    if (base_salarios <= 0) {
      throw new Error(`O sistema não encontrou lançamentos de Salário no mês ${anoMes}. É necessário registrar o pagamento primeiro.`);
    }

    // 2. Achar os IDs das contas envolvidas na provisão
    const contas = {
      passivo_provisao_ferias: await buscarConta('PASSIVO', ['F_rias'], ['FGTS', 'INSS'], empresa_id),
      passivo_provisao_13:     await buscarConta('PASSIVO', ['13'], ['FGTS', 'INSS'], empresa_id),
      passivo_fgts_ferias:     await buscarConta('PASSIVO', ['FGTS', 'F_rias'], [], empresa_id),
      passivo_inss_ferias:     await buscarConta('PASSIVO', ['INSS', 'F_rias'], [], empresa_id),
      passivo_fgts_13:         await buscarConta('PASSIVO', ['FGTS', '13'], [], empresa_id),
      passivo_inss_13:         await buscarConta('PASSIVO', ['INSS', '13'], [], empresa_id),

      despesa_ferias:          await buscarConta('DESPESA', ['F_rias'], ['FGTS', 'INSS'], empresa_id),
      despesa_13:              await buscarConta('DESPESA', ['13'], ['FGTS', 'INSS'], empresa_id),
      despesa_fgts:            await buscarConta('DESPESA', ['FGTS'], ['F_rias', '13'], empresa_id),
      despesa_inss:            await buscarConta('DESPESA', ['INSS'], ['F_rias', '13'], empresa_id)
    };

    const resultado = await RotinasMensais.provisionarFolha({
      empresa_id,
      data_fechamento,
      base_salarios,
      contas
    });

    return res.status(200).json(resultado);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = { apurarICMS, provisionarFolha };