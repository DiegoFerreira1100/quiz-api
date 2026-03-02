const express = require('express');
const bcrypt = require('bcryptjs'); // ou bcrypt
const jwt = require('jsonwebtoken');
const { readUsers, writeUsers } = require('../utils/jsonHandler');

const router = express.Router();
const SECRET = "segredoSuperSecreto";

// Registro
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const users = readUsers();

    if (users.find(u => u.username === username)) {
      return res.status(400).json({ message: "Usuário já existe" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { id: Date.now(), username, password: hashedPassword };

    users.push(newUser);
    writeUsers(users);

    res.status(201).json({ message: "Usuário registrado com sucesso" });
  } catch (err) {
    console.error("Erro no register:", err);
    res.status(500).json({ message: "Erro interno no servidor" });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const users = readUsers();

    const user = users.find(u => u.username === username);
    if (!user) return res.status(400).json({ message: "Usuário não encontrado" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Senha incorreta" });

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '1h' });
    res.json({ message: "Login bem-sucedido", token });
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ message: "Erro interno no servidor" });
  }
});

module.exports = router;
