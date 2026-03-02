const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500'],
    credentials: true
}));
app.use(express.json());

// Configurar pasta frontend como estática
app.use(express.static(path.join(__dirname, '../frontend')));

// Rota raiz - redireciona para o dashboard ou login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

// Rota para login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Rota para dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

// Rota para criar quiz
app.get('/create-quiz', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/create-quiz.html'));
});

// Rota para jogar quiz (com parâmetro id)
app.get('/play-quiz', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/play-quiz.html'));
});


// IMPORTANTE: Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Rota para servir o dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

// Rota para servir o create-quiz
app.get('/create-quiz', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/create-quiz.html'));
});

// Rota para servir o play-quiz
app.get('/play-quiz', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/play-quiz.html'));
});

// Rota para servir o login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Rota para servir o register
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/register.html'));
});

// Rota raiz redireciona para dashboard ou login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Arquivos JSON para "banco de dados"
const USERS_FILE = path.join(__dirname, 'users.json');
const QUIZZES_FILE = path.join(__dirname, 'quizzes.json');

// Inicializar arquivos se não existirem
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]');
if (!fs.existsSync(QUIZZES_FILE)) fs.writeFileSync(QUIZZES_FILE, '[]');

// ========== ROTAS DE AUTENTICAÇÃO ==========
app.post('/auth/register', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ message: 'Usuário e senha obrigatórios' });
    }
    
    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    
    // Verificar se usuário já existe
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ message: 'Usuário já existe' });
    }
    
    // Criar novo usuário
    const newUser = {
        id: Date.now().toString(),
        username,
        password, // Em produção, hash a senha!
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    
    res.json({ 
        message: 'Usuário registrado com sucesso',
        user: { id: newUser.id, username: newUser.username }
    });
});

app.post('/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
        return res.status(401).json({ message: 'Usuário ou senha inválidos' });
    }
    
    // Gerar token simples
    const token = Buffer.from(JSON.stringify({ 
        id: user.id, 
        username: user.username 
    })).toString('base64');
    
    res.json({
        message: 'Login bem-sucedido',
        token,
        user: {
            id: user.id,
            username: user.username,
            name: user.username
        }
    });
});

// ========== ROTAS DE QUIZZES ==========

// Middleware de autenticação simples
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: 'Token não fornecido' });
    }
    
    const token = authHeader.split(' ')[1];
    try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
        req.userId = decoded.id;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token inválido' });
    }
}

// GET /api/quizzes - Listar quizzes do usuário
app.get('/api/quizzes', authenticate, (req, res) => {
    const quizzes = JSON.parse(fs.readFileSync(QUIZZES_FILE));
    const userQuizzes = quizzes.filter(q => q.userId === req.userId);
    res.json({ quizzes: userQuizzes });
});

// GET /api/quizzes/:id - Buscar quiz específico
app.get('/api/quizzes/:id', authenticate, (req, res) => {
    const quizzes = JSON.parse(fs.readFileSync(QUIZZES_FILE));
    const quiz = quizzes.find(q => q.id === req.params.id && q.userId === req.userId);
    
    if (!quiz) {
        return res.status(404).json({ message: 'Quiz não encontrado' });
    }
    
    res.json({ quiz });
});

// POST /api/quizzes - Criar novo quiz
app.post('/api/quizzes', authenticate, (req, res) => {
    const { title, description, category, questions } = req.body;
    
    if (!title || !description || !questions || questions.length === 0) {
        return res.status(400).json({ message: 'Dados incompletos' });
    }
    
    const quizzes = JSON.parse(fs.readFileSync(QUIZZES_FILE));
    
    const newQuiz = {
        id: Date.now().toString(),
        userId: req.userId,
        title,
        description,
        category,
        questions: questions.map((q, index) => ({
            id: index + 1,
            text: q.text,
            alternatives: q.alternatives,
            correctAnswer: q.correctAnswer
        })),
        createdAt: new Date().toISOString(),
        plays: 0
    };
    
    quizzes.push(newQuiz);
    fs.writeFileSync(QUIZZES_FILE, JSON.stringify(quizzes, null, 2));
    
    res.status(201).json({ 
        message: 'Quiz criado com sucesso',
        quiz: newQuiz 
    });
});

// PUT /api/quizzes/:id - Atualizar quiz
app.put('/api/quizzes/:id', authenticate, (req, res) => {
    const { title, description, category, questions } = req.body;
    const quizzes = JSON.parse(fs.readFileSync(QUIZZES_FILE));
    
    const index = quizzes.findIndex(q => q.id === req.params.id && q.userId === req.userId);
    
    if (index === -1) {
        return res.status(404).json({ message: 'Quiz não encontrado' });
    }
    
    quizzes[index] = {
        ...quizzes[index],
        title,
        description,
        category,
        questions: questions.map((q, idx) => ({
            id: idx + 1,
            text: q.text,
            alternatives: q.alternatives,
            correctAnswer: q.correctAnswer
        })),
        updatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(QUIZZES_FILE, JSON.stringify(quizzes, null, 2));
    
    res.json({ 
        message: 'Quiz atualizado com sucesso',
        quiz: quizzes[index]
    });
});

// DELETE /api/quizzes/:id - Deletar quiz
app.delete('/api/quizzes/:id', authenticate, (req, res) => {
    const quizzes = JSON.parse(fs.readFileSync(QUIZZES_FILE));
    const filteredQuizzes = quizzes.filter(q => !(q.id === req.params.id && q.userId === req.userId));
    
    if (filteredQuizzes.length === quizzes.length) {
        return res.status(404).json({ message: 'Quiz não encontrado' });
    }
    
    fs.writeFileSync(QUIZZES_FILE, JSON.stringify(filteredQuizzes, null, 2));
    
    res.json({ message: 'Quiz deletado com sucesso' });
});

// POST /api/quizzes/:id/play - Registrar uma jogada
app.post('/api/quizzes/:id/play', authenticate, (req, res) => {
    const quizzes = JSON.parse(fs.readFileSync(QUIZZES_FILE));
    const quiz = quizzes.find(q => q.id === req.params.id);
    
    if (!quiz) {
        return res.status(404).json({ message: 'Quiz não encontrado' });
    }
    
    quiz.plays = (quiz.plays || 0) + 1;
    fs.writeFileSync(QUIZZES_FILE, JSON.stringify(quizzes, null, 2));
    
    res.json({ message: 'Jogada registrada' });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
    console.log(`Frontend disponível em:`);
    console.log(`  - http://localhost:${PORT}/login`);
    console.log(`  - http://localhost:${PORT}/dashboard`);
    console.log(`  - http://localhost:${PORT}/create-quiz`);
    console.log(`  - http://localhost:${PORT}/play-quiz?id=ID_DO_QUIZ`);
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

module.exports = app;