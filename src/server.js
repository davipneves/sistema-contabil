// src/server.js
const express    = require('express');
const cors       = require('cors');
const bodyParser = require('body-parser');
const path       = require('path');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api', require('./routes/api'));

// SPA fallback
app.get('*', (_, res) =>
  res.sendFile(path.join(__dirname, '../public/index.html'))
);

// Error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Erro interno' });
});

app.listen(PORT, () =>
  console.log(`\n  Projeto de Contábil  em  http://localhost:${PORT}\n`)
);
