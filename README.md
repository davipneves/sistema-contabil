# ContabiSystem — Sistema de Gestão Contábil (MVC)

Sistema contábil completo com **arquitetura MVC**, backend Node.js + MySQL e frontend HTML + Tailwind CSS + JavaScript.

---

## 🏗 Arquitetura MVC

```
contabil/
│
├── src/                            ← BACKEND (Node.js / Express)
│   ├── server.js                   ← Entry point — inicializa Express
│   │
│   ├── config/
│   │   ├── database.js             ← Conexão MySQL via pool (mysql2)
│   │   ├── schema.sql              ← DDL + plano de contas padrão
│   │   └── setup.js                ← Script npm run setup
│   │
│   ├── models/                     ◄── M (Model) — acesso ao banco
│   │   ├── PlanoContas.js          ← CRUD do plano de contas
│   │   └── Lancamento.js           ← Lançamentos + todos os relatórios
│   │
│   ├── controllers/                ◄── C (Controller) — lógica de negócio
│   │   ├── PlanoContasController.js
│   │   └── LancamentoController.js
│   │
│   └── routes/
│       └── api.js                  ← Rotas REST (Express Router)
│
└── public/                         ◄── V (View) — SPA frontend
    ├── index.html                  ← UI completa (Tailwind CDN)
    └── js/
        └── app.js                  ← Lógica de interface (fetch API)
```

---

## 🚀 Instalação

### 1. Pré-requisitos
- Node.js 18+
- MySQL 8.0+

### 2. Clonar e instalar
```bash
cd contabil
npm install
```

### 3. Configurar banco
```bash
cp .env.example .env
# Edite o .env:
#   DB_HOST=localhost
#   DB_USER=root
#   DB_PASSWORD=sua_senha
#   DB_NAME=contabil_db
#   PORT=3000
```

### 4. Criar banco e popular
```bash
npm run setup
```
> Cria `contabil_db`, todas as tabelas e o plano de contas padrão.

### 5. Iniciar servidor
```bash
npm start          # produção
npm run dev        # desenvolvimento (nodemon)
```

Abra: **http://localhost:3000**

---

## 📊 Módulos

| Módulo | Descrição |
|---|---|
| **Dashboard** | Estatísticas do período — receitas, despesas, resultado, lançamentos |
| **Lançamentos** | CRUD com partidas dobradas; validação débito = crédito; transação MySQL |
| **Plano de Contas** | 5 tipos (Ativo, Passivo, PL, Receita, Despesa); hierarquia; soft delete |
| **Livro Diário** | Registro cronológico agrupado por lançamento com débitos e créditos |
| **Livro Razão** | Movimentação por conta com saldo evolutivo (devedor/credor) |
| **Razonetes** | Representação em T com totais e saldo final — múltiplas contas simultâneas |
| **Balancete** | Conferência dos movimentos e saldos; indicador de equilíbrio automático |
| **DRE** | Demonstração do Resultado com apuração automática de lucro/prejuízo |

---

## 🔌 API REST

### Plano de Contas
```
GET    /api/contas          — lista todas
GET    /api/contas/:id      — busca por id
POST   /api/contas          — cria nova
PUT    /api/contas/:id      — atualiza
DELETE /api/contas/:id      — desativa (soft delete)
```

### Lançamentos
```
GET    /api/lancamentos                     — lista (filtros: dataInicio, dataFim, historico)
GET    /api/lancamentos/:id                 — com partidas
POST   /api/lancamentos                     — cria (valida equilíbrio; usa transação)
DELETE /api/lancamentos/:id                 — exclui em cascata
```

### Relatórios
```
GET /api/rel/diario?dataInicio=&dataFim=
GET /api/rel/razao?contaId=&dataInicio=&dataFim=
GET /api/rel/balancete?dataInicio=&dataFim=
GET /api/rel/dre?dataInicio=&dataFim=
```

---

## 📦 Exemplo de Lançamento (POST)

```json
POST /api/lancamentos
{
  "data_lancamento": "2025-06-01",
  "historico": "Venda de mercadorias à vista",
  "documento": "NF-001",
  "partidas": [
    { "conta_id": 2, "tipo": "DEBITO",  "valor": 10000 },
    { "conta_id": 24, "tipo": "CREDITO", "valor": 10000 }
  ]
}
```

---

## 🛠 Tecnologias

| Camada | Tecnologia |
|---|---|
| Servidor | Node.js 18 + Express 4 |
| Banco | MySQL 8 · mysql2 (connection pool) |
| Frontend | HTML5 · JavaScript ES2022 (fetch API) |
| CSS | Tailwind CSS 3 (CDN) |
| Tipografia | Syne (display) + JetBrains Mono |
| Padrão | MVC — Model / View / Controller |
