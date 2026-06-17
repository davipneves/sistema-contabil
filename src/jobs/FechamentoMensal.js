// src/jobs/FechamentoMensal.js
'use strict';
const cron = require('node-cron');
const pool = require('../config/database');
const RotinasMensais = require('../services/RotinasMensais');

// Função auxiliar para buscar o ID da conta pelo código
async function obterContaId(codigo, empresaId) {
  const [rows] = await pool.query(
    'SELECT id FROM plano_contas WHERE codigo = ? AND empresa_id = ? AND ativa = 1',
    [codigo.trim(), empresaId]
  );
  return rows.length ? rows[0].id : null;
}

function iniciarAutomacoes() {
  console.log('🕒 Agendador de Fechamento Mensal ativado.');

  // Expressão Cron: '0 1 1 * *' significa:
  // Rodar no minuto 0, da hora 1 (01:00 da manhã), no dia 1 de todos os meses.
  cron.schedule('0 1 1 * *', async () => {
    console.log(' Iniciando rotinas automáticas de fechamento de mês...');
    
    try {
      // 1. Descobrir qual foi o último dia do mês que acabou de passar
      const dataAtual = new Date();
      dataAtual.setDate(0); // Volta para o último dia do mês anterior
      const dataFechamento = dataAtual.toISOString().slice(0, 10); // Formato YYYY-MM-DD

      // 2. Buscar todas as empresas ativas no sistema
      const [empresas] = await pool.query('SELECT id FROM empresas WHERE ativa = 1');

      // 3. Rodar as rotinas para cada empresa
      for (const empresa of empresas) {
        const empresaId = empresa.id;

        // --- AUTOMATIZAÇÃO DO ICMS ---
        const contaIcmsRecuperar = await obterContaId('1.1.05', empresaId);
        const contaIcmsRecolher  = await obterContaId('2.1.12', empresaId);

        if (contaIcmsRecuperar && contaIcmsRecolher) {
          await RotinasMensais.apurarICMS({
            empresa_id: empresaId,
            data_fechamento: dataFechamento,
            conta_icms_recuperar: contaIcmsRecuperar,
            conta_icms_recolher: contaIcmsRecolher
          });
          console.log(` ICMS apurado para a empresa ${empresaId}`);
        }

        /* Nota sobre a Folha de Pagamento:
          Para automatizar os salários e provisões (1/12 avos), o sistema precisaria de uma tabela 
          'funcionarios' ou 'folha_mensal' no banco de dados para o robô ler a "base_salarios" total do mês.
          Como os salários variam (horas extras, demissões, novas contratações), não é seguro 
          chutar um valor estático aqui sem consultar um módulo de RH.
        */
      }

      console.log('Rotinas de fechamento concluídas com sucesso!');
    } catch (error) {
      console.error('Erro na execução do fechamento automático:', error);
    }
  });
}

module.exports = iniciarAutomacoes;