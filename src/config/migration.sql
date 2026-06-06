-- =========================================================
-- MIGRATION v1 → v2  (Multi-Empresa + Depreciação)
-- Execute em banco EXISTENTE com: mysql -u root -p contabil_db < migration.sql
-- Requer MySQL 8.0+
-- =========================================================
USE contabil_db;

-- 1. CRIAR TABELA EMPRESAS (caso não exista)
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

-- 2. PLANO DE CONTAS — adicionar empresa_id
ALTER TABLE plano_contas
  ADD COLUMN IF NOT EXISTS empresa_id INT NOT NULL DEFAULT 1 AFTER id;

ALTER TABLE plano_contas
  DROP INDEX IF EXISTS codigo;

ALTER TABLE plano_contas
  ADD UNIQUE IF NOT EXISTS uq_empresa_codigo (empresa_id, codigo);

-- FK só adiciona se não existir
SET @fk_pc := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'plano_contas'
    AND CONSTRAINT_NAME = 'fk_pc_empresa'
);
SET @sql_fk_pc := IF(@fk_pc = 0,
  'ALTER TABLE plano_contas ADD CONSTRAINT fk_pc_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id)',
  'SELECT 1');
PREPARE stmt FROM @sql_fk_pc; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. LANCAMENTOS — adicionar empresa_id
ALTER TABLE lancamentos
  ADD COLUMN IF NOT EXISTS empresa_id INT NOT NULL DEFAULT 1 AFTER id;

ALTER TABLE lancamentos
  DROP INDEX IF EXISTS numero;

ALTER TABLE lancamentos
  ADD UNIQUE IF NOT EXISTS uq_empresa_numero (empresa_id, numero);

SET @fk_lc := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'lancamentos'
    AND CONSTRAINT_NAME = 'fk_lanc_empresa'
);
SET @sql_fk_lc := IF(@fk_lc = 0,
  'ALTER TABLE lancamentos ADD CONSTRAINT fk_lanc_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id)',
  'SELECT 1');
PREPARE stmt FROM @sql_fk_lc; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. SEQUENCIAS — reestruturar para multi-empresa
-- Salvar valor atual
SET @ultimo_atual = COALESCE((SELECT ultimo FROM sequencias WHERE nome='lancamento' LIMIT 1), 0);

-- Recriar tabela com nova PK composta
DROP TABLE IF EXISTS sequencias;

CREATE TABLE sequencias (
  nome       VARCHAR(50) NOT NULL,
  empresa_id INT         NOT NULL DEFAULT 1,
  ultimo     INT         NOT NULL DEFAULT 0,
  PRIMARY KEY (nome, empresa_id),
  FOREIGN KEY (empresa_id) REFERENCES empresas(id)
) ENGINE=InnoDB;

INSERT IGNORE INTO sequencias (nome, empresa_id, ultimo)
VALUES ('lancamento', 1, @ultimo_atual);

-- 5. CRIAR TABELA BENS
CREATE TABLE IF NOT EXISTS bens (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id      INT            NOT NULL,
  nome            VARCHAR(150)   NOT NULL,
  descricao       TEXT           NULL,
  valor_aquisicao DECIMAL(15,2)  NOT NULL,
  valor_residual  DECIMAL(15,2)  NOT NULL DEFAULT 0,
  vida_util       INT            NOT NULL,
  metodo          ENUM('LINEAR','SOMA_DIGITOS','DECLINIO_CONSTANTE') NOT NULL DEFAULT 'LINEAR',
  data_aquisicao  DATE           NOT NULL,
  conta_ativo_id  INT            NULL,
  conta_dep_id    INT            NULL,
  conta_desp_id   INT            NULL,
  ativa           TINYINT(1)     NOT NULL DEFAULT 1,
  criado_em       TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id)     REFERENCES empresas(id),
  FOREIGN KEY (conta_ativo_id) REFERENCES plano_contas(id) ON DELETE SET NULL,
  FOREIGN KEY (conta_dep_id)   REFERENCES plano_contas(id) ON DELETE SET NULL,
  FOREIGN KEY (conta_desp_id)  REFERENCES plano_contas(id) ON DELETE SET NULL
) ENGINE=InnoDB;

SELECT 'Migration v2 concluída com sucesso!' AS resultado;
