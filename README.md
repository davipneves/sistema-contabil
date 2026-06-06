# NotaSystem v2.0 — Sistema de Gestão Contábil

Sistema de escrituração contábil completo com suporte a **múltiplas empresas**, **partidas simples e dobradas** e **cálculo de depreciação de bens**, construído sobre arquitetura MVC com Node.js, MySQL e interface web responsiva.

---

## Índice

1. [Pré-requisitos](#1-pré-requisitos)
2. [Instalação — banco novo](#2-instalação--banco-novo)
3. [Migração — banco existente (v1 → v2)](#3-migração--banco-existente-v1--v2)
4. [Configuração do ambiente (.env)](#4-configuração-do-ambiente-env)
5. [Iniciando o servidor](#5-iniciando-o-servidor)
6. [Estrutura do projeto](#6-estrutura-do-projeto)
7. [Módulos e funcionalidades](#7-módulos-e-funcionalidades)
8. [API REST — referência](#8-api-rest--referência)
9. [Exemplos de requisições](#9-exemplos-de-requisições)
10. [Tecnologias utilizadas](#10-tecnologias-utilizadas)
11. [Glossário de siglas e termos técnicos](#11-glossário-de-siglas-e-termos-técnicos)

---

## 1. Pré-requisitos

| Ferramenta | Versão mínima | Verificar |
|---|---|---|
| **Node.js** | 18.0 | `node -v` |
| **npm** | 9.0 | `npm -v` |
| **MySQL** | 8.0 | `mysql --version` |

> **Importante:** A versão 8.0+ do MySQL é necessária para a sintaxe `ADD COLUMN IF NOT EXISTS` usada no script de migração e para o suporte completo a `CHECK CONSTRAINTS` nas tabelas.

---

## 2. Instalação — banco novo

Use este caminho se estiver configurando o projeto pela primeira vez.

### Passo 1 — Clonar o repositório e instalar dependências

```bash
git clone <url-do-repositório>
cd contabil
npm install
```

### Passo 2 — Configurar o arquivo de ambiente

Crie o arquivo `.env` na raiz do projeto (pasta `contabil/`):

```bash
cp .env.example .env   # se existir o exemplo
# ou crie manualmente:
```

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha_aqui
DB_NAME=contabil_db
PORT=3000
```

> O campo `DB_PASSWORD` pode ficar vazio se o seu MySQL local não usar senha.

### Passo 3 — Criar o banco de dados e as tabelas

```bash
npm run setup
```

Esse comando executa `src/config/schema.sql`, que:

- Cria o banco `contabil_db` (se ainda não existir)
- Cria todas as tabelas: `empresas`, `sequencias`, `plano_contas`, `lancamentos`, `partidas` e `bens`
- Insere a **Empresa Padrão** (id = 1) com tipo **Partidas Dobradas**
- Popula o plano de contas padrão completo com 32 contas hierárquicas vinculadas à Empresa Padrão

### Passo 4 — (Opcional) Carregar dados de teste

```bash
mysql -u root -p contabil_db < src/config/data.sql
```

Isso insere 50 lançamentos de exemplo referentes ao mês de maio/2026.

### Passo 5 — Iniciar o servidor

```bash
npm start
```

Acesse **http://localhost:3000** no navegador.

---

## 3. Migração — banco existente (v1 → v2)

Se você já usa o sistema na versão anterior (sem o suporte a múltiplas empresas), execute o script de migração para atualizar o banco sem perder os dados.

```bash
mysql -u root -p contabil_db < src/config/migration.sql
```

O script executa, na ordem:

1. Cria a tabela `empresas` e insere a Empresa Padrão (id = 1)
2. Adiciona a coluna `empresa_id` à tabela `plano_contas` (default = 1)
3. Substitui o índice `UNIQUE(codigo)` pelo índice `UNIQUE(empresa_id, codigo)`
4. Adiciona a coluna `empresa_id` à tabela `lancamentos` (default = 1)
5. Substitui o índice `UNIQUE(numero)` pelo índice `UNIQUE(empresa_id, numero)`
6. Recria a tabela `sequencias` com chave primária composta `(nome, empresa_id)`, preservando o último número sequencial
7. Cria a tabela `bens` para controle de ativos imobilizados

Todos os registros históricos ficam automaticamente vinculados à Empresa Padrão (id = 1).

---

## 4. Configuração do ambiente (.env)

| Variável | Descrição | Padrão |
|---|---|---|
| `DB_HOST` | Endereço do servidor MySQL | `localhost` |
| `DB_USER` | Usuário do banco de dados | `root` |
| `DB_PASSWORD` | Senha do banco de dados | *(vazio)* |
| `DB_NAME` | Nome do banco de dados | `contabil_db` |
| `PORT` | Porta em que o servidor Express irá escutar | `3000` |

---

## 5. Iniciando o servidor

```bash
# Modo produção
npm start

# Modo desenvolvimento (reinicia automaticamente ao salvar arquivos)
npm run dev

# Recriar banco do zero
npm run setup
```

Após iniciar, o terminal exibirá:

```
  Projeto de Contábil  em  http://localhost:3000
```

O indicador no canto inferior esquerdo da interface mostrará **● conectado** em verde quando a comunicação com o banco estiver ativa.

---

## 6. Estrutura do projeto

```
contabil/
│
├── .env                            ← Variáveis de ambiente (não versionar)
├── package.json                    ← Dependências e scripts npm
│
├── src/                            ← BACKEND (Node.js / Express)
│   │
│   ├── server.js                   ← Entry point — configura e inicia o Express
│   │
│   ├── config/
│   │   ├── database.js             ← Pool de conexões MySQL via mysql2/promise
│   │   ├── schema.sql              ← DDL completo + plano de contas padrão (instalação nova)
│   │   ├── migration.sql           ← Script de migração v1 → v2 (banco existente)
│   │   ├── data.sql                ← Dados de teste: 50 lançamentos de maio/2026
│   │   └── setup.js                ← Runner do schema.sql (npm run setup)
│   │
│   ├── models/                     ← M do MVC — acesso ao banco de dados
│   │   ├── Empresa.js              ← CRUD de empresas + clonagem do plano de contas
│   │   ├── PlanoContas.js          ← CRUD do plano de contas filtrado por empresa
│   │   ├── Lancamento.js           ← Lançamentos, partidas e todos os relatórios
│   │   └── Bem.js                  ← Cálculo de depreciação (3 métodos) + CRUD de bens
│   │
│   ├── controllers/                ← C do MVC — recebe requisições, chama models
│   │   ├── EmpresaController.js
│   │   ├── PlanoContasController.js
│   │   ├── LancamentoController.js
│   │   └── BemController.js
│   │
│   └── routes/
│       └── api.js                  ← Mapeamento das rotas REST (Express Router)
│
└── public/                         ← V do MVC — interface SPA
    ├── index.html                  ← Estrutura HTML + estilos CSS inline
    └── js/
        └── app.js                  ← Toda a lógica do frontend (Fetch API, DOM)
```

---

## 7. Módulos e funcionalidades

### Gestão de Empresas

Permite criar e alternar entre múltiplos perfis de empresa. Cada empresa possui:

- Plano de contas próprio e isolado (gerado automaticamente na criação)
- Sequência de numeração de lançamentos independente
- Tipo de escrituração configurável: **Partidas Simples** ou **Partidas Dobradas**

A empresa ativa é exibida no topo da barra lateral e persiste entre sessões via `localStorage`. A troca de tipo de escrituração é bloqueada se a empresa já possuir lançamentos registrados.

### Lançamentos

Comportamento adaptado conforme o tipo de escrituração da empresa ativa:

**Partidas Dobradas:** exige exatamente 1 débito e 1 crédito com valores iguais. O indicador de equilíbrio é exibido em tempo real no formulário.

**Partidas Simples:** aceita apenas 1 partida por lançamento (débito ou crédito). Não há validação de equilíbrio. Indicado para controles simplificados.

Em ambos os casos: conta sintética (grupo) não pode receber lançamentos diretos; lançamentos de meses anteriores não podem ser excluídos (apenas estornados); cada partida valida se a conta pertence à empresa ativa.

### Plano de Contas

Estrutura hierárquica com até 5 níveis. Contas do nível 1 e 2 são sintéticas (grupos) e não aceitam lançamentos. Contas do nível 3 em diante são analíticas. Ao criar uma empresa, o plano padrão completo é clonado automaticamente. Contas com lançamentos históricos não podem ser desativadas.

### Livro Diário

Relatório cronológico de todos os lançamentos do período, agrupados por número sequencial, exibindo débitos e créditos com histórico e documento.

### Livro Razão

Movimentação detalhada de uma conta (ou grupo de contas), com saldo evolutivo calculado conforme a natureza da conta (devedora ou credora). Contas sintéticas exibem os lançamentos de todas as subcontas com indicação da conta de origem.

### Razonetes

Representação gráfica em "T" de uma ou mais contas simultaneamente. Exibe débitos à esquerda, créditos à direita, totais e saldo final classificado (SD — Saldo Devedor ou SC — Saldo Credor).

### Balancete de Verificação

Confere a igualdade entre o total de débitos e o total de créditos do período. Exibe movimentação (débitos e créditos) e saldos (devedor e credor) por conta. O indicador **✓ Conferido** confirma o equilíbrio.

### DRE — Demonstração do Resultado do Exercício

Apuração do resultado do período organizando receitas e despesas em grupos. Calcula automaticamente Lucro Líquido ou Prejuízo Líquido.

### Depreciação de Bens

#### Calculadora Rápida

Calcula a tabela de depreciação sem necessidade de salvar, direto no formulário. Útil para simulações.

#### Bens Cadastrados

Permite registrar ativos imobilizados com vínculo opcional a contas do plano (Imobilizado, Depreciação Acumulada, Despesa de Depreciação) para facilitar a geração de lançamentos.

#### Métodos disponíveis

| Método | Descrição |
|---|---|
| **Linear (Cotas Iguais)** | Deprecia o mesmo valor a cada período. `Dep/ano = (Valor Aquisição − Valor Residual) / Vida Útil` |
| **Soma dos Dígitos dos Anos (SDA)** | Aplica pesos decrescentes — maior depreciação nos anos iniciais. A taxa de cada ano é proporcional ao peso do ano na soma dos dígitos. |
| **Declínio Constante** | Aplica uma taxa constante sobre o *valor líquido contábil* de cada período. A taxa é calculada pela fórmula `1 − (VR/VA)^(1/n)`. |

A tabela gerada exibe, por ano: taxa aplicada (%), depreciação do período, depreciação acumulada e valor líquido contábil. Um ajuste final garante que o valor residual ao fim da vida útil seja exatamente o declarado.

---

## 8. API REST — referência

Todos os endpoints que retornam dados de uma empresa específica aceitam o parâmetro `empresaId` via query string (GET) ou body (POST/PUT). Se omitido, assume `empresaId = 1`.

### Resposta padrão

```json
{ "success": true, "data": { ... } }
{ "success": false, "message": "Descrição do erro" }
```

### Empresas

```
GET    /api/empresas          Lista todas as empresas ativas
GET    /api/empresas/:id      Busca empresa por id
POST   /api/empresas          Cria empresa (clona plano de contas padrão)
PUT    /api/empresas/:id      Atualiza nome, CNPJ e tipo de partida
DELETE /api/empresas/:id      Desativa empresa (soft delete)
```

### Plano de Contas

```
GET    /api/contas?empresaId=1       Lista contas da empresa
GET    /api/contas/:id               Busca conta por id
POST   /api/contas?empresaId=1       Cria nova conta
PUT    /api/contas/:id               Atualiza conta
DELETE /api/contas/:id               Desativa conta (soft delete)
```

### Lançamentos

```
GET    /api/lancamentos?empresaId=1&dataInicio=&dataFim=&historico=&limit=100&offset=0&ordem=DESC
GET    /api/lancamentos/:id
POST   /api/lancamentos
DELETE /api/lancamentos/:id
```

### Relatórios

```
GET /api/rel/diario?empresaId=1&dataInicio=&dataFim=
GET /api/rel/razao?empresaId=1&contaId=&dataInicio=&dataFim=
GET /api/rel/balancete?empresaId=1&dataInicio=&dataFim=
GET /api/rel/dre?empresaId=1&dataInicio=&dataFim=
```

### Bens e Depreciação

```
GET    /api/bens?empresaId=1              Lista bens da empresa
GET    /api/bens/:id?empresaId=1          Busca bem por id
GET    /api/bens/:id/tabela?empresaId=1   Tabela de depreciação do bem salvo
POST   /api/bens/calcular                 Cálculo avulso (sem persistir)
POST   /api/bens?empresaId=1              Cadastra novo bem
PUT    /api/bens/:id?empresaId=1          Atualiza bem
DELETE /api/bens/:id?empresaId=1          Desativa bem (soft delete)
```

---

## 9. Exemplos de requisições

### Criar empresa com Partidas Simples

```json
POST /api/empresas
{
  "nome": "Padaria do João ME",
  "cnpj": "12.345.678/0001-99",
  "tipo_partida": "SIMPLES"
}
```

### Lançamento — Partidas Dobradas

```json
POST /api/lancamentos
{
  "empresaId": 1,
  "data_lancamento": "2026-06-01",
  "historico": "Venda de mercadorias à vista",
  "documento": "NF-001",
  "partidas": [
    { "conta_id": 2, "tipo": "DEBITO",  "valor": 1500.00 },
    { "conta_id": 24, "tipo": "CREDITO", "valor": 1500.00 }
  ]
}
```

### Lançamento — Partidas Simples

```json
POST /api/lancamentos
{
  "empresaId": 2,
  "data_lancamento": "2026-06-01",
  "historico": "Receita de vendas do dia",
  "documento": "REC-045",
  "partidas": [
    { "conta_id": 15, "tipo": "CREDITO", "valor": 850.00 }
  ]
}
```

### Cálculo de depreciação avulso

```json
POST /api/bens/calcular
{
  "valor_aquisicao": 60000,
  "valor_residual": 6000,
  "vida_util": 5,
  "metodo": "SOMA_DIGITOS",
  "data_aquisicao": "2026-01-01"
}
```

### Cadastrar bem com vínculo contábil

```json
POST /api/bens?empresaId=1
{
  "empresaId": 1,
  "nome": "Veículo Fiat Strada",
  "descricao": "Placa ABC-1234",
  "valor_aquisicao": 95000,
  "valor_residual": 15000,
  "vida_util": 5,
  "metodo": "LINEAR",
  "data_aquisicao": "2026-03-15",
  "conta_ativo_id": 9,
  "conta_dep_id": 10,
  "conta_desp_id": 35
}
```

---

## 10. Tecnologias utilizadas

| Camada | Tecnologia | Função |
|---|---|---|
| Runtime | **Node.js 18** | Execução do JavaScript no servidor |
| Framework web | **Express 4** | Roteamento HTTP e middlewares |
| Banco de dados | **MySQL 8** | Persistência relacional com transações ACID |
| Driver de banco | **mysql2/promise** | Pool de conexões assíncrono com suporte a `async/await` |
| Variáveis de ambiente | **dotenv** | Carregamento do `.env` em `process.env` |
| Reinicialização | **nodemon** | Monitora alterações nos arquivos durante o desenvolvimento |
| Frontend | **HTML5 + CSS3 + JS ES2022** | Interface SPA sem frameworks |
| Estilos | **Tailwind CSS 3 (CDN)** | Utilitários CSS via CDN, sem compilação local |
| Tipografia | **Inter** (display) + **JetBrains Mono** | Google Fonts |
| Comunicação | **Fetch API** | Requisições HTTP assíncronas do frontend para o backend |
| Padrão arquitetural | **MVC** | Separação entre Model, View e Controller |

---

## 11. Glossário de siglas e termos técnicos

Esta seção explica todas as siglas, abreviações e termos de domínio utilizados no código, banco de dados e interface.

### Siglas contábeis

| Sigla / Termo | Significado | Contexto no sistema |
|---|---|---|
| **DRE** | Demonstração do Resultado do Exercício | Relatório que apura receitas e despesas de um período, chegando ao lucro ou prejuízo líquido |
| **PL** | Patrimônio Líquido | Grupo contábil que representa o valor líquido pertencente aos sócios (Ativo − Passivo) |
| **CMV** | Custo das Mercadorias Vendidas | Despesa com o valor de custo dos produtos efetivamente vendidos no período |
| **SD** | Saldo Devedor | Saldo de uma conta onde os débitos superam os créditos |
| **SC** | Saldo Credor | Saldo de uma conta onde os créditos superam os débitos |
| **SDA** | Soma dos Dígitos dos Anos | Método de depreciação acelerada que distribui maior depreciação nos anos iniciais |
| **VA** | Valor de Aquisição | Custo histórico de compra de um bem imobilizado |
| **VR** | Valor Residual | Valor estimado pelo qual um bem pode ser vendido ao fim de sua vida útil |
| **VL** | Valor Líquido (Contábil) | `VA − Depreciação Acumulada`; representa o valor atual do bem no balanço |
| **CNPJ** | Cadastro Nacional da Pessoa Jurídica | Número de identificação fiscal de empresas no Brasil, emitido pela Receita Federal |
| **NF** | Nota Fiscal | Documento fiscal que comprova uma operação comercial; usado no campo "Documento" dos lançamentos |
| **NFS** | Nota Fiscal de Serviços | Variante da Nota Fiscal usada para prestação de serviços |
| **CP** | Curto Prazo | Obrigações ou direitos com vencimento em até 12 meses (ex.: Empréstimos Bancários CP) |
| **LP** | Longo Prazo | Obrigações ou direitos com vencimento superior a 12 meses (ex.: Financiamentos LP) |

### Siglas de natureza e tipo de conta

| Sigla / Termo | Significado |
|---|---|
| **DEVEDORA** | Natureza de uma conta que tem saldo positivo quando acumulou mais débitos do que créditos. Contas do Ativo e de Despesa têm natureza devedora. |
| **CREDORA** | Natureza de uma conta que tem saldo positivo quando acumulou mais créditos do que débitos. Contas do Passivo, do PL e de Receita têm natureza credora. |
| **ATIVO** | Grupo de contas que representa os bens e direitos da empresa |
| **PASSIVO** | Grupo de contas que representa as obrigações da empresa com terceiros |
| **PATRIMONIO_LIQUIDO** | Grupo de contas que representa o capital próprio (recursos dos sócios) |
| **RECEITA** | Grupo de contas que registra as entradas de valor resultantes da atividade da empresa |
| **DESPESA** | Grupo de contas que registra os gastos incorridos para gerar receita |
| **retificadora** | Conta que reduz o saldo do grupo a que pertence (ex.: Depreciação Acumulada reduz o Ativo Imobilizado) |

### Siglas técnicas do código

| Sigla / Termo | Significado | Onde aparece |
|---|---|---|
| **MVC** | Model-View-Controller | Padrão arquitetural do projeto. Model = acesso ao banco; View = HTML/JS; Controller = lógica entre os dois |
| **API** | Application Programming Interface | Interface REST que o frontend consome via Fetch para buscar e enviar dados ao backend |
| **REST** | Representational State Transfer | Estilo arquitetural para APIs HTTP usando verbos (GET, POST, PUT, DELETE) e recursos |
| **SPA** | Single Page Application | A interface inteira é carregada em um único `index.html`; a navegação entre páginas é feita via JavaScript sem recarregar o servidor |
| **DDL** | Data Definition Language | Comandos SQL que definem estruturas: `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE` |
| **DML** | Data Manipulation Language | Comandos SQL que manipulam dados: `SELECT`, `INSERT`, `UPDATE`, `DELETE` |
| **ACID** | Atomicity, Consistency, Isolation, Durability | Propriedades que garantem a confiabilidade de transações no banco. Relevante nos lançamentos, que usam `BEGIN TRANSACTION / COMMIT / ROLLBACK` |
| **CDN** | Content Delivery Network | Rede de distribuição de conteúdo; o Tailwind CSS é carregado via CDN (`cdn.tailwindcss.com`) sem instalação local |
| **ENV** | Environment (variáveis de ambiente) | Configurações sensíveis armazenadas no arquivo `.env` e acessadas via `process.env.NOME_DA_VARIAVEL` |
| **CRUD** | Create, Read, Update, Delete | Conjunto das quatro operações básicas sobre dados persistidos |
| **FK** | Foreign Key (Chave Estrangeira) | Coluna que referencia a chave primária de outra tabela, garantindo integridade referencial |
| **PK** | Primary Key (Chave Primária) | Coluna (ou conjunto de colunas) que identifica unicamente cada linha de uma tabela |
| **pool** | Pool de conexões | Conjunto de conexões abertas com o banco que são reutilizadas, evitando o custo de abrir uma nova conexão a cada requisição |
| **soft delete** | Exclusão suave | Em vez de apagar o registro, marca-o como inativo (`ativa = 0`). Preserva o histórico contábil e a integridade referencial |
| **qs** | Query String helper | Função interna do `app.js` que constrói automaticamente a query string de cada requisição incluindo o `empresaId` ativo |
| **DOM** | Document Object Model | Representação em árvore do HTML acessada e manipulada pelo JavaScript do frontend |
| **CDN** | Content Delivery Network | Rede usada para carregar o Tailwind CSS sem instalação local |
| **CASCADE** | (SQL) ON DELETE CASCADE | Quando um lançamento é excluído, suas partidas filhas são excluídas automaticamente |
| **InnoDB** | Motor de armazenamento do MySQL | Utilizado em todas as tabelas por suportar transações, chaves estrangeiras e bloqueios a nível de linha |

### Termos do domínio contábil

| Termo | Significado |
|---|---|
| **Lançamento** | Registro de um fato contábil com data, histórico, documento e uma ou mais partidas |
| **Partida** | Linha de um lançamento indicando conta, tipo (débito/crédito) e valor |
| **Partidas Dobradas** | Método de escrituração em que todo lançamento tem débitos totais iguais a créditos totais (princípio da dualidade) |
| **Partidas Simples** | Método em que cada lançamento registra apenas um lado (débito ou crédito), sem exigir contrapartida |
| **Histórico** | Descrição textual do fato contábil registrado no lançamento |
| **Conta sintética** | Conta de agrupamento (níveis 1 e 2) que não aceita lançamentos diretos; serve apenas para consolidar saldos |
| **Conta analítica** | Conta de nível 3 ou superior que aceita lançamentos e onde os valores são efetivamente registrados |
| **Razonete** | Representação gráfica de uma conta em formato de "T" mostrando débitos (esquerda) e créditos (direita) |
| **Balancete** | Listagem de contas com seus débitos, créditos e saldos em um período; verifica se ∑ Débitos = ∑ Créditos |
| **Estorno** | Lançamento inverso que anula total ou parcialmente um lançamento anterior incorreto |
| **Livro Diário** | Registro cronológico obrigatório de todos os fatos contábeis de uma empresa |
| **Livro Razão** | Registro analítico de todas as movimentações de cada conta, em ordem cronológica |
| **Imobilizado** | Bens de uso duradouro da empresa (máquinas, veículos, imóveis) sujeitos à depreciação |
| **Depreciação** | Redução gradual do valor contábil de um bem pelo desgaste, obsolescência ou vida útil finita |
| **Depreciação Acumulada** | Total de depreciação já registrada de um bem desde a aquisição; conta retificadora do Ativo |
| **Vida útil** | Estimativa do período em que um bem gerará benefícios econômicos para a empresa |
| **Sequência** | Contador por empresa que garante numeração única e sequencial para os lançamentos |
| **Competência** | Princípio contábil pelo qual receitas e despesas são reconhecidas no período em que ocorrem, independentemente do pagamento |

---

*Sistema NotaSystem v2.0 — Trabalho Acadêmico de Gestão Contábil*