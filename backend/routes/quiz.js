const express = require('express');
const router = express.Router();

// Exemplo de rota de teste
router.get('/', (req, res) => {
  res.json({ message: "Rota de quiz funcionando!" });
});

module.exports = router;
