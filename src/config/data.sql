-- =========================================================================
-- SEED DE TESTE PARA DRE E BALANCETE (50 Lançamentos)
-- Competência: Maio/2026
-- =========================================================================

START TRANSACTION;

-- 1. Captura dinâmica dos IDs das contas analíticas com base nos códigos
SELECT @c_banco := id FROM plano_contas WHERE codigo = '1.1.02';
SELECT @c_caixa := id FROM plano_contas WHERE codigo = '1.1.01';
SELECT @c_rec_v := id FROM plano_contas WHERE codigo = '4.1';
SELECT @c_rec_f := id FROM plano_contas WHERE codigo = '4.2';
SELECT @c_cmv   := id FROM plano_contas WHERE codigo = '5.1';
SELECT @c_pess  := id FROM plano_contas WHERE codigo = '5.2';
SELECT @c_adm   := id FROM plano_contas WHERE codigo = '5.3';
SELECT @c_fin   := id FROM plano_contas WHERE codigo = '5.4';

-- =========================================================================
-- BLOCO 1: RECEITAS DE VENDAS E SERVIÇOS (1 a 15)
-- =========================================================================
INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5001, '2026-05-02', 'Venda de Kit Volante e Pedais Logitech', 'NF-101');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_banco, 'DEBITO', 2100.50), (@l, @c_rec_v, 'CREDITO', 2100.50);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5002, '2026-05-03', 'Consultoria em modelagem de dados MySQL', 'NFS-001');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_banco, 'DEBITO', 3500.00), (@l, @c_rec_v, 'CREDITO', 3500.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5003, '2026-05-04', 'Venda de painel FanaLEDs GT3', 'NF-102');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_caixa, 'DEBITO', 850.00), (@l, @c_rec_v, 'CREDITO', 850.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5004, '2026-05-05', 'Desenvolvimento de módulo multithreading em Java', 'NFS-002');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_banco, 'DEBITO', 4200.00), (@l, @c_rec_v, 'CREDITO', 4200.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5005, '2026-05-06', 'Venda de base Direct Drive para simulador', 'NF-103');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_banco, 'DEBITO', 5400.00), (@l, @c_rec_v, 'CREDITO', 5400.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5006, '2026-05-07', 'Venda de banco concha de competição', 'NF-104');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_banco, 'DEBITO', 1150.00), (@l, @c_rec_v, 'CREDITO', 1150.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5007, '2026-05-08', 'Implantação de arquitetura FAS para cliente', 'NFS-003');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_banco, 'DEBITO', 6000.00), (@l, @c_rec_v, 'CREDITO', 6000.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5008, '2026-05-09', 'Venda de cockpit em perfil de alumínio', 'NF-105');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_banco, 'DEBITO', 2800.00), (@l, @c_rec_v, 'CREDITO', 2800.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5009, '2026-05-11', 'Licenciamento de software de telemetria', 'NFS-004');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_banco, 'DEBITO', 950.00), (@l, @c_rec_v, 'CREDITO', 950.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5010, '2026-05-12', 'Venda de luvas e sapatilhas de pilotagem', 'NF-106');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_caixa, 'DEBITO', 450.00), (@l, @c_rec_v, 'CREDITO', 450.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5011, '2026-05-14', 'Consultoria de otimização de banco de dados', 'NFS-005');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_banco, 'DEBITO', 1800.00), (@l, @c_rec_v, 'CREDITO', 1800.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5012, '2026-05-16', 'Venda de monitor ultrawide para setup', 'NF-107');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_banco, 'DEBITO', 2400.00), (@l, @c_rec_v, 'CREDITO', 2400.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5013, '2026-05-18', 'Customização de layout Figma para e-commerce', 'NFS-006');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_banco, 'DEBITO', 1200.00), (@l, @c_rec_v, 'CREDITO', 1200.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5014, '2026-05-20', 'Venda de freio de mão hidráulico', 'NF-108');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_banco, 'DEBITO', 750.00), (@l, @c_rec_v, 'CREDITO', 750.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5015, '2026-05-22', 'Venda de suporte de três telas', 'NF-109');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_banco, 'DEBITO', 1300.00), (@l, @c_rec_v, 'CREDITO', 1300.00);

-- =========================================================================
-- BLOCO 2: CUSTO DAS MERCADORIAS E SERVIÇOS - CMV (16 a 25)
-- =========================================================================
INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5016, '2026-05-02', 'Baixa de estoque - Kit Logitech', 'BX-01');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_cmv, 'DEBITO', 1100.00), (@l, @c_caixa, 'CREDITO', 1100.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5017, '2026-05-04', 'Baixa de estoque - FanaLEDs', 'BX-02');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_cmv, 'DEBITO', 420.00), (@l, @c_banco, 'CREDITO', 420.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5018, '2026-05-06', 'Baixa de estoque - Direct Drive', 'BX-03');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_cmv, 'DEBITO', 3200.00), (@l, @c_banco, 'CREDITO', 3200.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5019, '2026-05-07', 'Baixa de estoque - Banco concha', 'BX-04');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_cmv, 'DEBITO', 600.00), (@l, @c_banco, 'CREDITO', 600.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5020, '2026-05-09', 'Baixa de estoque - Cockpit alumínio', 'BX-05');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_cmv, 'DEBITO', 1400.00), (@l, @c_banco, 'CREDITO', 1400.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5021, '2026-05-12', 'Baixa de estoque - Vestuário pilotagem', 'BX-06');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_cmv, 'DEBITO', 210.00), (@l, @c_caixa, 'CREDITO', 210.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5022, '2026-05-16', 'Baixa de estoque - Monitor Ultrawide', 'BX-07');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_cmv, 'DEBITO', 1600.00), (@l, @c_banco, 'CREDITO', 1600.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5023, '2026-05-20', 'Baixa de estoque - Freio de mão', 'BX-08');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_cmv, 'DEBITO', 380.00), (@l, @c_banco, 'CREDITO', 380.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5024, '2026-05-22', 'Baixa de estoque - Suporte telas', 'BX-09');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_cmv, 'DEBITO', 700.00), (@l, @c_banco, 'CREDITO', 700.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5025, '2026-05-28', 'Compra de licenças de software para revenda', 'NF-998');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_cmv, 'DEBITO', 450.00), (@l, @c_banco, 'CREDITO', 450.00);

-- =========================================================================
-- BLOCO 3: DESPESAS ADMINISTRATIVAS E OPERACIONAIS (26 a 38)
-- =========================================================================
INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5026, '2026-05-10', 'Pagamento de aluguel comercial (ajuste para o dia 10 ref. Cláusula Segunda)', 'REC-01');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_adm, 'DEBITO', 2500.00), (@l, @c_banco, 'CREDITO', 2500.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5027, '2026-05-12', 'Conta de energia elétrica - Cemig Montes Claros', 'FAT-CEMIG');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_adm, 'DEBITO', 425.30), (@l, @c_banco, 'CREDITO', 425.30);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5028, '2026-05-15', 'Fatura de água e esgoto - Copasa', 'FAT-COPASA');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_adm, 'DEBITO', 110.80), (@l, @c_banco, 'CREDITO', 110.80);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5029, '2026-05-16', 'Internet Fibra Óptica', 'FAT-NET');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_adm, 'DEBITO', 149.90), (@l, @c_banco, 'CREDITO', 149.90);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5030, '2026-05-18', 'Assinatura GitHub Copilot e serviços Vercel', 'INV-GH');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_adm, 'DEBITO', 285.50), (@l, @c_banco, 'CREDITO', 285.50);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5031, '2026-05-20', 'Material de escritório e limpeza', 'NF-112');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_adm, 'DEBITO', 180.00), (@l, @c_caixa, 'CREDITO', 180.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5032, '2026-05-21', 'Manutenção de computadores da equipe', 'NFS-008');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_adm, 'DEBITO', 450.00), (@l, @c_banco, 'CREDITO', 450.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5033, '2026-05-22', 'Marketing e anúncios digitais', 'FAT-ADS');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_adm, 'DEBITO', 600.00), (@l, @c_banco, 'CREDITO', 600.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5034, '2026-05-24', 'Patrocínio institucional - Evento CA Unimontes', 'REC-02');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_adm, 'DEBITO', 350.00), (@l, @c_banco, 'CREDITO', 350.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5035, '2026-05-26', 'Compra de licença software de design visual', 'INV-DSG');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_adm, 'DEBITO', 120.00), (@l, @c_banco, 'CREDITO', 120.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5036, '2026-05-27', 'Serviço de contabilidade terceirizada', 'NFS-009');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_adm, 'DEBITO', 800.00), (@l, @c_banco, 'CREDITO', 800.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5037, '2026-05-28', 'Despesa com cartório e reconhecimento de firma', 'REC-03');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_adm, 'DEBITO', 85.00), (@l, @c_caixa, 'CREDITO', 85.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5038, '2026-05-29', 'Assinatura pacote Office e nuvem', 'FAT-MS');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_adm, 'DEBITO', 190.00), (@l, @c_banco, 'CREDITO', 190.00);

-- =========================================================================
-- BLOCO 4: DESPESAS COM PESSOAL (39 a 43)
-- =========================================================================
INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5039, '2026-05-05', 'Pagamento de Salários - Competência anterior', 'FOLHA-04');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_pess, 'DEBITO', 3200.00), (@l, @c_banco, 'CREDITO', 3200.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5040, '2026-05-06', 'Recolhimento de INSS', 'GUIA-INSS');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_pess, 'DEBITO', 450.00), (@l, @c_banco, 'CREDITO', 450.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5041, '2026-05-07', 'Recolhimento de FGTS', 'GUIA-FGTS');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_pess, 'DEBITO', 256.00), (@l, @c_banco, 'CREDITO', 256.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5042, '2026-05-15', 'Vale-alimentação e transporte da equipe', 'FAT-BENEF');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_pess, 'DEBITO', 800.00), (@l, @c_banco, 'CREDITO', 800.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5043, '2026-05-20', 'Mensalidade Academia Judô/Capoeira (Benefício colaborador)', 'REC-04');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_pess, 'DEBITO', 220.00), (@l, @c_banco, 'CREDITO', 220.00);

-- =========================================================================
-- BLOCO 5: DESPESAS E RECEITAS FINANCEIRAS (44 a 50)
-- =========================================================================
INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5044, '2026-05-05', 'Tarifa bancária - Manutenção de conta', 'EXTRATO');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_fin, 'DEBITO', 75.00), (@l, @c_banco, 'CREDITO', 75.00);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5045, '2026-05-10', 'Tarifas de cobrança e PIX B3', 'EXTRATO');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_fin, 'DEBITO', 45.30), (@l, @c_banco, 'CREDITO', 45.30);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5046, '2026-05-12', 'Juros pagos sobre atraso de fornecedor', 'NF-JUROS');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_fin, 'DEBITO', 18.50), (@l, @c_banco, 'CREDITO', 18.50);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5047, '2026-05-30', 'IOF s/ operações financeiras', 'EXTRATO');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_fin, 'DEBITO', 12.10), (@l, @c_banco, 'CREDITO', 12.10);

-- Receitas Financeiras (FIIs e Juros)
INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5048, '2026-05-14', 'Rendimentos recebidos - FII MXRF11', 'EXTRATO-XP');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_banco, 'DEBITO', 145.20), (@l, @c_rec_f, 'CREDITO', 145.20);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5049, '2026-05-14', 'Rendimentos recebidos - FII KNCR11', 'EXTRATO-XP');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_banco, 'DEBITO', 210.80), (@l, @c_rec_f, 'CREDITO', 210.80);

INSERT INTO lancamentos (numero, data_lancamento, historico, documento) VALUES (5050, '2026-05-14', 'Rendimentos recebidos - FII BTLG11', 'EXTRATO-XP');
SET @l = LAST_INSERT_ID(); INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (@l, @c_banco, 'DEBITO', 185.00), (@l, @c_rec_f, 'CREDITO', 185.00);

-- =========================================================================
-- SINCRONIZAÇÃO DA SEQUÊNCIA DO SISTEMA
-- =========================================================================
UPDATE sequencias SET ultimo = GREATEST(ultimo, 5050) WHERE nome = 'lancamento';

COMMIT;