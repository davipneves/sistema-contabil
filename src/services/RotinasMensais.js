// src/services/RotinasMensais.js
'use strict';
const pool = require('../config/database');
const Lancamento = require('../models/Lancamento');

class RotinasMensais {

  static async apurarICMS({ empresa_id, data_fechamento, conta_icms_recuperar, conta_icms_recolher }) {
    const [[recuperar]] = await pool.query(`
      SELECT COALESCE(SUM(CASE WHEN tipo = 'DEBITO' THEN valor ELSE -valor END), 0) AS saldo
      FROM partidas p
      JOIN lancamentos l ON l.id = p.lancamento_id
      WHERE p.conta_id = ? AND l.empresa_id = ? AND l.data_lancamento <= ?
    `, [conta_icms_recuperar, empresa_id, data_fechamento]);

    const [[recolher]] = await pool.query(`
      SELECT COALESCE(SUM(CASE WHEN tipo = 'CREDITO' THEN valor ELSE -valor END), 0) AS saldo
      FROM partidas p
      JOIN lancamentos l ON l.id = p.lancamento_id
      WHERE p.conta_id = ? AND l.empresa_id = ? AND l.data_lancamento <= ?
    `, [conta_icms_recolher, empresa_id, data_fechamento]);

    const saldoRecuperar = +recuperar.saldo;
    const saldoRecolher = +recolher.saldo;

    if (saldoRecuperar <= 0 || saldoRecolher <= 0) {
      return { message: 'Não há saldos suficientes para confronto de ICMS neste período.' };
    }

    const valorCompensacao = Math.min(saldoRecuperar, saldoRecolher);

    const lancamento = await Lancamento.create({
      empresa_id,
      data_lancamento: data_fechamento,
      historico: 'Apuração Mensal de ICMS - Encontro de Contas',
      partidas: [
        { conta_id: conta_icms_recolher, tipo: 'DEBITO', valor: valorCompensacao },
        { conta_id: conta_icms_recuperar, tipo: 'CREDITO', valor: valorCompensacao }
      ]
    });

    return { message: 'Apuração de ICMS realizada.', valor_compensado: valorCompensacao, lancamento };
  }

  static async provisionarFolha({ empresa_id, data_fechamento, base_salarios, contas }) {
    const provisaoBase = +(base_salarios / 12).toFixed(2);
    const fgtsSobreProvisao = +(provisaoBase * 0.08).toFixed(2);
    const inssSobreProvisao = +(provisaoBase * 0.20).toFixed(2);

    const partidas = [
      { conta_id: contas.despesa_ferias, tipo: 'DEBITO', valor: provisaoBase },
      { conta_id: contas.passivo_provisao_ferias, tipo: 'CREDITO', valor: provisaoBase },
      { conta_id: contas.despesa_13, tipo: 'DEBITO', valor: provisaoBase },
      { conta_id: contas.passivo_provisao_13, tipo: 'CREDITO', valor: provisaoBase },
      { conta_id: contas.despesa_fgts, tipo: 'DEBITO', valor: fgtsSobreProvisao },
      { conta_id: contas.passivo_fgts_ferias, tipo: 'CREDITO', valor: fgtsSobreProvisao },
      { conta_id: contas.despesa_inss, tipo: 'DEBITO', valor: inssSobreProvisao },
      { conta_id: contas.passivo_inss_ferias, tipo: 'CREDITO', valor: inssSobreProvisao },
      { conta_id: contas.despesa_fgts, tipo: 'DEBITO', valor: fgtsSobreProvisao },
      { conta_id: contas.passivo_fgts_13, tipo: 'CREDITO', valor: fgtsSobreProvisao },
      { conta_id: contas.despesa_inss, tipo: 'DEBITO', valor: inssSobreProvisao },
      { conta_id: contas.passivo_inss_13, tipo: 'CREDITO', valor: inssSobreProvisao }
    ];

    const lancamento = await Lancamento.create({
      empresa_id,
      data_lancamento: data_fechamento,
      historico: 'Provisão de Folha de Pagamento (Férias, 13º e Encargos)',
      partidas
    });

    return { message: 'Provisões geradas com sucesso.', lancamento };
  }
}

module.exports = RotinasMensais;