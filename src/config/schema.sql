-- =========================================================
-- SISTEMA CONTÁBIL  —  Schema e Dados Iniciais
-- =========================================================

CREATE DATABASE IF NOT EXISTS contabil_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE contabil_db;

-- ---------------------------------------------------------
-- SEQUÊNCIA DE NUMERAÇÃO DE LANÇAMENTOS
-- FIX: evita race condition no número sequencial do lançamento.
-- Usar SELECT ... FOR UPDATE dentro de transação garante
-- que dois usuários simultâneos nunca recebam o mesmo número.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS sequencias (
  nome       VARCHAR(50)  NOT NULL PRIMARY KEY,
  ultimo     INT          NOT NULL DEFAULT 0
) ENGINE=InnoDB;

INSERT IGNORE INTO sequencias (nome, ultimo) VALUES ('lancamento', 0);

-- ---------------------------------------------------------
-- PLANO DE CONTAS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS plano_contas (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  codigo             VARCHAR(20)  NOT NULL UNIQUE,
  nome               VARCHAR(150) NOT NULL,
  tipo               ENUM('ATIVO','PASSIVO','PATRIMONIO_LIQUIDO','RECEITA','DESPESA') NOT NULL,
  natureza           ENUM('DEVEDORA','CREDORA') NOT NULL,
  nivel              TINYINT      NOT NULL DEFAULT 1,
  pai_id             INT          NULL,
  ativa              TINYINT(1)   NOT NULL DEFAULT 1,
  criado_em          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  -- FIX: contas sintéticas (nível 1 e 2) devem ter aceita_lancamentos = 0
  aceita_lancamentos TINYINT(1)   NOT NULL DEFAULT 1,
  -- FIX: coluna para identificar contas retificadoras (ex.: Depreciação Acumulada)
  retificadora       TINYINT(1)   NOT NULL DEFAULT 0,
  -- Nota: auto-referência (pai_id = id) é prevenida no backend (PlanoContas.js)
  -- pois MySQL não permite referenciar colunas AUTO_INCREMENT em CHECK constraints
  FOREIGN KEY (pai_id) REFERENCES plano_contas(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- LANÇAMENTOS (cabeçalho)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS lancamentos (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  numero             INT          NOT NULL UNIQUE,  -- FIX: UNIQUE garante integridade da numeração
  data_lancamento    DATE         NOT NULL,
  historico          TEXT         NOT NULL,
  documento          VARCHAR(60)  NULL,
  criado_em          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_data   (data_lancamento),
  INDEX idx_numero (numero)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- PARTIDAS (linhas de débito / crédito)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS partidas (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  lancamento_id  INT            NOT NULL,
  conta_id       INT            NOT NULL,
  tipo           ENUM('DEBITO','CREDITO') NOT NULL,
  valor          DECIMAL(15,2)  NOT NULL,
  -- FIX: valor deve ser sempre positivo; negativos distorceriam todos os relatórios
  CONSTRAINT chk_valor_positivo CHECK (valor > 0),
  FOREIGN KEY (lancamento_id) REFERENCES lancamentos(id) ON DELETE CASCADE,
  FOREIGN KEY (conta_id)      REFERENCES plano_contas(id)
) ENGINE=InnoDB;

-- =========================================================
-- PLANO DE CONTAS PADRÃO
-- =========================================================
INSERT INTO plano_contas (codigo, nome, tipo, natureza, nivel, aceita_lancamentos, retificadora) VALUES
-- ── ATIVO ────────────────────────────────────────────────
-- FIX: contas sintéticas (nível 1 e 2) com aceita_lancamentos = 0
('1',      'ATIVO',                          'ATIVO','DEVEDORA',1, 0, 0),
('1.1',    'Ativo Circulante',               'ATIVO','DEVEDORA',2, 0, 0),
('1.1.01', 'Caixa',                          'ATIVO','DEVEDORA',3, 1, 0),
('1.1.02', 'Banco Conta Corrente',           'ATIVO','DEVEDORA',3, 1, 0),
('1.1.03', 'Clientes a Receber',             'ATIVO','DEVEDORA',3, 1, 0),
('1.1.04', 'Estoques',                       'ATIVO','DEVEDORA',3, 1, 0),
('1.1.05', 'Adiantamentos',                  'ATIVO','DEVEDORA',3, 1, 0),
('1.2',    'Ativo Não Circulante',           'ATIVO','DEVEDORA',2, 0, 0),
('1.2.01', 'Imobilizado',                    'ATIVO','DEVEDORA',3, 1, 0),
-- FIX: Depreciação Acumulada é conta retificadora do Ativo (natureza CREDORA dentro do grupo ATIVO)
('1.2.02', 'Depreciação Acumulada',          'ATIVO','CREDORA', 3, 1, 1),
-- ── PASSIVO ──────────────────────────────────────────────
('2',      'PASSIVO',                        'PASSIVO','CREDORA',1, 0, 0),
('2.1',    'Passivo Circulante',             'PASSIVO','CREDORA',2, 0, 0),
('2.1.01', 'Fornecedores',                   'PASSIVO','CREDORA',3, 1, 0),
('2.1.02', 'Salários a Pagar',               'PASSIVO','CREDORA',3, 1, 0),
('2.1.03', 'Impostos a Recolher',            'PASSIVO','CREDORA',3, 1, 0),
('2.1.04', 'Empréstimos Bancários CP',       'PASSIVO','CREDORA',3, 1, 0),
('2.2',    'Passivo Não Circulante',         'PASSIVO','CREDORA',2, 0, 0),
('2.2.01', 'Financiamentos LP',              'PASSIVO','CREDORA',3, 1, 0),
-- ── PATRIMÔNIO LÍQUIDO ───────────────────────────────────
('3',      'PATRIMÔNIO LÍQUIDO',             'PATRIMONIO_LIQUIDO','CREDORA',1, 0, 0),
('3.1',    'Capital Social',                 'PATRIMONIO_LIQUIDO','CREDORA',2, 0, 0),
('3.2',    'Reservas de Lucros',             'PATRIMONIO_LIQUIDO','CREDORA',2, 0, 0),
('3.3',    'Lucros / Prejuízos Acumulados',  'PATRIMONIO_LIQUIDO','CREDORA',2, 0, 0),
-- ── RECEITAS ─────────────────────────────────────────────
('4',      'RECEITAS',                       'RECEITA','CREDORA',1, 0, 0),
('4.1',    'Receita Bruta de Vendas',        'RECEITA','CREDORA',2, 0, 0),
('4.2',    'Receitas Financeiras',           'RECEITA','CREDORA',2, 0, 0),
('4.3',    'Outras Receitas',                'RECEITA','CREDORA',2, 0, 0),
-- ── DESPESAS ─────────────────────────────────────────────
('5',      'DESPESAS',                       'DESPESA','DEVEDORA',1, 0, 0),
('5.1',    'Custo das Mercadorias Vendidas', 'DESPESA','DEVEDORA',2, 0, 0),
('5.2',    'Despesas com Pessoal',           'DESPESA','DEVEDORA',2, 0, 0),
('5.3',    'Despesas Administrativas',       'DESPESA','DEVEDORA',2, 0, 0),
('5.4',    'Despesas Financeiras',           'DESPESA','DEVEDORA',2, 0, 0),
('5.5',    'Depreciação',                    'DESPESA','DEVEDORA',2, 0, 0);

-- Contas analíticas de nível 3 dentro de grupos de nível 2 que ainda não têm filhos:
-- 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 5.5 são nível 2 mas
-- não têm sub-contas no seed padrão — habilitá-las para lançamentos diretos
UPDATE plano_contas SET aceita_lancamentos = 1
WHERE codigo IN ('3.1','3.2','3.3','4.1','4.2','4.3','5.1','5.2','5.3','5.4','5.5');

-- vínculos pai_id (nível 2 → nível 1)
UPDATE plano_contas SET pai_id=(SELECT id FROM (SELECT id FROM plano_contas WHERE codigo='1') t) WHERE codigo='1.1';
UPDATE plano_contas SET pai_id=(SELECT id FROM (SELECT id FROM plano_contas WHERE codigo='1') t) WHERE codigo='1.2';
UPDATE plano_contas SET pai_id=(SELECT id FROM (SELECT id FROM plano_contas WHERE codigo='2') t) WHERE codigo='2.1';
UPDATE plano_contas SET pai_id=(SELECT id FROM (SELECT id FROM plano_contas WHERE codigo='2') t) WHERE codigo='2.2';
UPDATE plano_contas SET pai_id=(SELECT id FROM (SELECT id FROM plano_contas WHERE codigo='3') t) WHERE codigo IN ('3.1','3.2','3.3');
UPDATE plano_contas SET pai_id=(SELECT id FROM (SELECT id FROM plano_contas WHERE codigo='4') t) WHERE codigo IN ('4.1','4.2','4.3');
UPDATE plano_contas SET pai_id=(SELECT id FROM (SELECT id FROM plano_contas WHERE codigo='5') t) WHERE codigo IN ('5.1','5.2','5.3','5.4','5.5');
-- nível 3 → nível 2
UPDATE plano_contas SET pai_id=(SELECT id FROM (SELECT id FROM plano_contas WHERE codigo='1.1') t) WHERE codigo LIKE '1.1.%';
UPDATE plano_contas SET pai_id=(SELECT id FROM (SELECT id FROM plano_contas WHERE codigo='1.2') t) WHERE codigo LIKE '1.2.%';
UPDATE plano_contas SET pai_id=(SELECT id FROM (SELECT id FROM plano_contas WHERE codigo='2.1') t) WHERE codigo LIKE '2.1.%';
UPDATE plano_contas SET pai_id=(SELECT id FROM (SELECT id FROM plano_contas WHERE codigo='2.2') t) WHERE codigo LIKE '2.2.%';