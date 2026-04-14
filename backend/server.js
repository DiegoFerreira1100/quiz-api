const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// ========== CONFIGURAÇÕES ==========
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'meu-segredo-super-secreto-para-estagio-2024';

// Configuração CORS simplificada
app.use(cors({
    origin: '*',
    credentials: true
}));

app.use(express.json());

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// ========== BANCO DE DADOS JSON ==========
const USERS_FILE = path.join(__dirname, 'users.json');
const QUIZZES_FILE = path.join(__dirname, 'quizzes.json');

// Inicializar arquivos se não existirem
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]');
if (!fs.existsSync(QUIZZES_FILE)) fs.writeFileSync(QUIZZES_FILE, '[]');

// ========== ROTAS DO FRONTEND ==========
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/login.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/dashboard.html'));
});

app.get('/create-quiz', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/quiz.html'));
});

app.get('/play-quiz', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/play-quiz.html'));
});

app.get('/quiz', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/quiz.html'));
});

// ========== ROTAS DE AUTENTICAÇÃO ==========
app.post('/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ message: 'Usuário e senha obrigatórios' });
        }
        
        const users = JSON.parse(fs.readFileSync(USERS_FILE));
        
        if (users.find(u => u.username === username)) {
            return res.status(400).json({ message: 'Usuário já existe' });
        }
        
        // Criptografar a senha
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = {
            id: Date.now().toString(),
            username,
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        
        res.json({ 
            message: 'Usuário registrado com sucesso',
            user: { id: newUser.id, username: newUser.username }
        });
    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({ message: 'Erro interno no servidor' });
    }
});

app.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const users = JSON.parse(fs.readFileSync(USERS_FILE));
        const user = users.find(u => u.username === username);
        
        if (!user) {
            return res.status(401).json({ message: 'Usuário ou senha inválidos' });
        }
        
        // Comparar a senha com o hash
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ message: 'Usuário ou senha inválidos' });
        }
        
        // Gerar token JWT
        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            message: 'Login bem-sucedido',
            token,
            user: {
                id: user.id,
                username: user.username,
                name: user.username
            }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro interno no servidor' });
    }
});

// ========== MIDDLEWARE DE AUTENTICAÇÃO ==========
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: 'Token não fornecido' });
    }
    
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token inválido ou expirado' });
    }
}

// ========== ROTAS DA API ==========
app.get('/api/quizzes', authenticate, (req, res) => {
    try {
        const quizzes = JSON.parse(fs.readFileSync(QUIZZES_FILE));
        const userQuizzes = quizzes.filter(q => q.userId === req.userId);
        res.json({ quizzes: userQuizzes });
    } catch (error) {
        console.error('Erro ao buscar quizzes:', error);
        res.status(500).json({ message: 'Erro ao buscar quizzes' });
    }
});

app.get('/api/quizzes/:id', authenticate, (req, res) => {
    try {
        const quizzes = JSON.parse(fs.readFileSync(QUIZZES_FILE));
        const quiz = quizzes.find(q => q.id === req.params.id);
        
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz não encontrado' });
        }
        
        // Permite acesso mesmo se não for o dono (para jogar)
        res.json({ quiz });
    } catch (error) {
        console.error('Erro ao buscar quiz:', error);
        res.status(500).json({ message: 'Erro ao buscar quiz' });
    }
});

app.post('/api/quizzes', authenticate, (req, res) => {
    try {
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
            category: category || 'Sem categoria',
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
    } catch (error) {
        console.error('Erro ao criar quiz:', error);
        res.status(500).json({ message: 'Erro ao criar quiz' });
    }
});

app.put('/api/quizzes/:id', authenticate, (req, res) => {
    try {
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
            category: category || quizzes[index].category,
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
    } catch (error) {
        console.error('Erro ao atualizar quiz:', error);
        res.status(500).json({ message: 'Erro ao atualizar quiz' });
    }
});

app.delete('/api/quizzes/:id', authenticate, (req, res) => {
    try {
        const quizzes = JSON.parse(fs.readFileSync(QUIZZES_FILE));
        const filteredQuizzes = quizzes.filter(q => !(q.id === req.params.id && q.userId === req.userId));
        
        if (filteredQuizzes.length === quizzes.length) {
            return res.status(404).json({ message: 'Quiz não encontrado' });
        }
        
        fs.writeFileSync(QUIZZES_FILE, JSON.stringify(filteredQuizzes, null, 2));
        
        res.json({ message: 'Quiz deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar quiz:', error);
        res.status(500).json({ message: 'Erro ao deletar quiz' });
    }
});

app.post('/api/quizzes/:id/play', authenticate, (req, res) => {
    try {
        const quizzes = JSON.parse(fs.readFileSync(QUIZZES_FILE));
        const quiz = quizzes.find(q => q.id === req.params.id);
        
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz não encontrado' });
        }
        
        quiz.plays = (quiz.plays || 0) + 1;
        fs.writeFileSync(QUIZZES_FILE, JSON.stringify(quizzes, null, 2));
        
        res.json({ message: 'Jogada registrada' });
    } catch (error) {
        console.error('Erro ao registrar jogada:', error);
        res.status(500).json({ message: 'Erro ao registrar jogada' });
    }
});

// ========== INICIALIZAÇÃO DO SERVIDOR ==========
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
    console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Acesse: http://localhost:${PORT}`);
});

module.exports = app;