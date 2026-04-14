const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

// ========== CONFIGURAÇÕES ==========
const PORT = process.env.PORT || 3000;

// CORS configurado para produção
app.use(cors({
    origin: function(origin, callback) {
        // Permite requisições sem origin (ex: mobile apps) ou em desenvolvimento
        if (!origin) return callback(null, true);
        
        // Lista de origens permitidas
        const allowedOrigins = [
            'http://localhost:5500',
            'http://127.0.0.1:5500',
            'https://quiz-api.onrender.com/' 
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(new Error('CORS blocked'));
        }
    },
    credentials: true
}));

app.use(express.json());

// Servir arquivos estáticos do frontend (uma vez só)
app.use(express.static(path.join(__dirname, '../frontend')));

// ========== ROTAS DO FRONTEND ==========
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

app.get('/create-quiz', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/create-quiz.html'));
});

app.get('/play-quiz', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/play-quiz.html'));
});

// ========== BANCO DE DADOS JSON ==========
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
    
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ message: 'Usuário já existe' });
    }
    
    const newUser = {
        id: Date.now().toString(),
        username,
        password,
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

// ========== MIDDLEWARE DE AUTENTICAÇÃO ==========
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

// ========== ROTAS DA API ==========
app.get('/api/quizzes', authenticate, (req, res) => {
    const quizzes = JSON.parse(fs.readFileSync(QUIZZES_FILE));
    const userQuizzes = quizzes.filter(q => q.userId === req.userId);
    res.json({ quizzes: userQuizzes });
});

app.get('/api/quizzes/:id', authenticate, (req, res) => {
    const quizzes = JSON.parse(fs.readFileSync(QUIZZES_FILE));
    const quiz = quizzes.find(q => q.id === req.params.id && q.userId === req.userId);
    
    if (!quiz) {
        return res.status(404).json({ message: 'Quiz não encontrado' });
    }
    
    res.json({ quiz });
});

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

app.delete('/api/quizzes/:id', authenticate, (req, res) => {
    const quizzes = JSON.parse(fs.readFileSync(QUIZZES_FILE));
    const filteredQuizzes = quizzes.filter(q => !(q.id === req.params.id && q.userId === req.userId));
    
    if (filteredQuizzes.length === quizzes.length) {
        return res.status(404).json({ message: 'Quiz não encontrado' });
    }
    
    fs.writeFileSync(QUIZZES_FILE, JSON.stringify(filteredQuizzes, null, 2));
    
    res.json({ message: 'Quiz deletado com sucesso' });
});

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

// ========== INICIALIZAÇÃO DO SERVIDOR ==========
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
    console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Acesse: http://localhost:${PORT}`);
});

module.exports = app;