CREATE DATABASE IF NOT EXISTS contabil_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE contabil_db;


-- EMPRESAS
CREATE TABLE IF NOT EXISTS empresas (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nome          VARCHAR(150) NOT NULL,
  cnpj          VARCHAR(18)  NULL,
  tipo_partida  ENUM('SIMPLES','DOBRADA') NOT NULL DEFAULT 'DOBRADA',
  ativa         TINYINT(1)   NOT NULL DEFAULT 1,
  criado_em     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO empresas (id, nome, tipo_partida)
VALUES (1, 'Empresa Padrão', 'DOBRADA');


-- SEQUÊNCIA DE NUMERAÇÃO — por empresa
CREATE TABLE IF NOT EXISTS sequencias (
  nome       VARCHAR(50) NOT NULL,
  empresa_id INT         NOT NULL DEFAULT 1,
  ultimo     INT         NOT NULL DEFAULT 0,
  PRIMARY KEY (nome, empresa_id),
  FOREIGN KEY (empresa_id) REFERENCES empresas(id)
) ENGINE=InnoDB;

INSERT IGNORE INTO sequencias (nome, empresa_id, ultimo) VALUES ('lancamento', 1, 0);

-- ---------------------------------------------------------
-- PLANO DE CONTAS (por empresa)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS plano_contas (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id         INT          NOT NULL DEFAULT 1,
  codigo             VARCHAR(20)  NOT NULL,
  nome               VARCHAR(150) NOT NULL,
  tipo               ENUM('ATIVO','PASSIVO','PATRIMONIO_LIQUIDO','RECEITA','DESPESA') NOT NULL,
  natureza           ENUM('DEVEDORA','CREDORA') NOT NULL,
  nivel              TINYINT      NOT NULL DEFAULT 1,
  pai_id             INT          NULL,
  ativa              TINYINT(1)   NOT NULL DEFAULT 1,
  criado_em          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  aceita_lancamentos TINYINT(1)   NOT NULL DEFAULT 1,
  retificadora       TINYINT(1)   NOT NULL DEFAULT 0,
  UNIQUE KEY uq_empresa_codigo (empresa_id, codigo),
  FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  FOREIGN KEY (pai_id)     REFERENCES plano_contas(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- LANÇAMENTOS (cabeçalho) — por empresa
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS lancamentos (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id         INT  NOT NULL DEFAULT 1,
  numero             INT  NOT NULL,
  data_lancamento    DATE NOT NULL,
  historico          TEXT NOT NULL,
  documento          VARCHAR(60) NULL,
  criado_em          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_empresa_numero (empresa_id, numero),
  INDEX idx_data    (data_lancamento),
  INDEX idx_empresa (empresa_id),
  FOREIGN KEY (empresa_id) REFERENCES empresas(id)
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
  CONSTRAINT chk_valor_positivo CHECK (valor > 0),
  FOREIGN KEY (lancamento_id) REFERENCES lancamentos(id) ON DELETE CASCADE,
  FOREIGN KEY (conta_id)      REFERENCES plano_contas(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- BENS (ativos imobilizados p/ cálculo de depreciação)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS bens (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id      INT            NOT NULL,
  nome            VARCHAR(150)   NOT NULL,
  descricao       TEXT           NULL,
  valor_aquisicao DECIMAL(15,2)  NOT NULL,
  valor_residual  DECIMAL(15,2)  NOT NULL DEFAULT 0,
  vida_util       INT            NOT NULL COMMENT 'Em anos',
  metodo          ENUM('LINEAR','SOMA_DIGITOS','DECLINIO_CONSTANTE') NOT NULL DEFAULT 'LINEAR',
  data_aquisicao  DATE           NOT NULL,
  conta_ativo_id  INT            NULL COMMENT 'Conta do imobilizado no plano de contas',
  conta_dep_id    INT            NULL COMMENT 'Conta de depreciação acumulada',
  conta_desp_id   INT            NULL COMMENT 'Conta de despesa de depreciação',
  ativa           TINYINT(1)     NOT NULL DEFAULT 1,
  criado_em       TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id)    REFERENCES empresas(id),
  FOREIGN KEY (conta_ativo_id) REFERENCES plano_contas(id) ON DELETE SET NULL,
  FOREIGN KEY (conta_dep_id)   REFERENCES plano_contas(id) ON DELETE SET NULL,
  FOREIGN KEY (conta_desp_id)  REFERENCES plano_contas(id) ON DELETE SET NULL
) ENGINE=InnoDB;


-- =========================================================
-- PLANO DE CONTAS PADRÃO  (empresa_id = 1)
-- =========================================================
INSERT INTO plano_contas (empresa_id,codigo,nome,tipo,natureza,nivel,aceita_lancamentos,retificadora) VALUES
(1,'1',      'ATIVO',                          'ATIVO','DEVEDORA',1, 0, 0),
(1,'1.1',    'Ativo Circulante',               'ATIVO','DEVEDORA',2, 0, 0),
(1,'1.1.01', 'Caixa',                          'ATIVO','DEVEDORA',3, 1, 0),
(1,'1.1.02', 'Banco Conta Corrente',           'ATIVO','DEVEDORA',3, 1, 0),
(1,'1.1.03', 'Clientes a Receber',             'ATIVO','DEVEDORA',3, 1, 0),
(1,'1.1.04', 'Estoques',                       'ATIVO','DEVEDORA',3, 1, 0),
(1,'1.1.05', 'Adiantamentos',                  'ATIVO','DEVEDORA',3, 1, 0),
(1,'1.2',    'Ativo Não Circulante',           'ATIVO','DEVEDORA',2, 0, 0),
(1,'1.2.01', 'Imobilizado',                    'ATIVO','DEVEDORA',3, 1, 0),
(1,'1.2.02', 'Depreciação Acumulada',          'ATIVO','CREDORA', 3, 1, 1),
(1,'2',      'PASSIVO',                        'PASSIVO','CREDORA',1, 0, 0),
(1,'2.1',    'Passivo Circulante',             'PASSIVO','CREDORA',2, 0, 0),
(1,'2.1.01', 'Fornecedores',                   'PASSIVO','CREDORA',3, 1, 0),
(1,'2.1.02', 'Salários a Pagar',               'PASSIVO','CREDORA',3, 1, 0),
(1,'2.1.03', 'Impostos a Recolher',            'PASSIVO','CREDORA',3, 1, 0),
(1,'2.1.04', 'Empréstimos Bancários CP',       'PASSIVO','CREDORA',3, 1, 0),
(1,'2.2',    'Passivo Não Circulante',         'PASSIVO','CREDORA',2, 0, 0),
(1,'2.2.01', 'Financiamentos LP',              'PASSIVO','CREDORA',3, 1, 0),
(1,'3',      'PATRIMÔNIO LÍQUIDO',             'PATRIMONIO_LIQUIDO','CREDORA',1, 0, 0),
(1,'3.1',    'Capital Social',                 'PATRIMONIO_LIQUIDO','CREDORA',2, 0, 0),
(1,'3.2',    'Reservas de Lucros',             'PATRIMONIO_LIQUIDO','CREDORA',2, 0, 0),
(1,'3.3',    'Lucros / Prejuízos Acumulados',  'PATRIMONIO_LIQUIDO','CREDORA',2, 0, 0),
(1,'4',      'RECEITAS',                       'RECEITA','CREDORA',1, 0, 0),
(1,'4.1',    'Receita Bruta de Vendas',        'RECEITA','CREDORA',2, 0, 0),
(1,'4.2',    'Receitas Financeiras',           'RECEITA','CREDORA',2, 0, 0),
(1,'4.3',    'Outras Receitas',                'RECEITA','CREDORA',2, 0, 0),
(1,'5',      'DESPESAS',                       'DESPESA','DEVEDORA',1, 0, 0),
(1,'5.1',    'Custo das Mercadorias Vendidas', 'DESPESA','DEVEDORA',2, 0, 0),
(1,'5.2',    'Despesas com Pessoal',           'DESPESA','DEVEDORA',2, 0, 0),
(1,'5.3',    'Despesas Administrativas',       'DESPESA','DEVEDORA',2, 0, 0),
(1,'5.4',    'Despesas Financeiras',           'DESPESA','DEVEDORA',2, 0, 0),
(1,'5.5',    'Depreciação',                    'DESPESA','DEVEDORA',2, 0, 0);

UPDATE plano_contas SET aceita_lancamentos = 1
WHERE empresa_id = 1 AND codigo IN ('3.1','3.2','3.3','4.1','4.2','4.3','5.1','5.2','5.3','5.4','5.5');

-- vínculos pai_id
UPDATE plano_contas SET pai_id=(SELECT id FROM (SELECT id FROM plano_contas WHERE codigo='1' AND empresa_id=1) t) WHERE codigo='1.1' AND empresa_id=1;
UPDATE plano_contas SET pai_id=(SELECT id FROM (SELECT id FROM plano_contas WHERE codigo='1' AND empresa_id=1) t) WHERE codigo='1.2' AND empresa_id=1;
UPDATE plano_contas SET pai_id=(SELECT id FROM (SELECT id FROM plano_contas WHERE codigo='2' AND empresa_id=1) t) WHERE codigo='2.1' AND empresa_id=1;
UPDATE plano_contas SET pai_id=(SELECT id FROM (SELECT id FROM plano_contas WHERE codigo='2' AND empresa_id=1) t) WHERE codigo='2.2' AND empresa_id=1;
UPDATE plano_contas SET pai_id=(SELECT id FROM (SELECT id FROM plano_contas WHERE codigo='3' AND empresa_id=1) t) WHERE codigo IN ('3.1','3.2','3.3') AND empresa_id=1;
UPDATE plano_contas SET pai_id=(SELECT id FROM (SELECT id FROM plano_contas WHERE codigo='4' AND empresa_id=1) t) WHERE codigo IN ('4.1','4.2','4.3') AND empresa_id=1;
UPDATE plano_contas SET pai_id=(SELECT id FROM (SELECT id FROM plano_contas WHERE codigo='5' AND empresa_id=1) t) WHERE codigo IN ('5.1','5.2','5.3','5.4','5.5') AND empresa_id=1;
UPDATE plano_contas SET pai_id=(SELECT id FROM (SELECT id FROM plano_contas WHERE codigo='1.1' AND empresa_id=1) t) WHERE codigo LIKE '1.1.%' AND empresa_id=1;
UPDATE plano_contas SET pai_id=(SELECT id FROM (SELECT id FROM plano_contas WHERE codigo='1.2' AND empresa_id=1) t) WHERE codigo LIKE '1.2.%' AND empresa_id=1;
UPDATE plano_contas SET pai_id=(SELECT id FROM (SELECT id FROM plano_contas WHERE codigo='2.1' AND empresa_id=1) t) WHERE codigo LIKE '2.1.%' AND empresa_id=1;
UPDATE plano_contas SET pai_id=(SELECT id FROM (SELECT id FROM plano_contas WHERE codigo='2.2' AND empresa_id=1) t) WHERE codigo LIKE '2.2.%' AND empresa_id=1;
