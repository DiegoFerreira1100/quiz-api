// Variáveis globais
let quiz = null;
let currentQuestion = 0;
let answers = [];
let score = 0;
let loading = false;

// Prevenir qualquer navegação acidental
window.addEventListener('beforeunload', function(e) {
    // Não faz nada, só previne
});

// Executar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('Play quiz carregado');
    
    // Se já carregou, não carregar de novo
    if (loading) {
        console.log('Já está carregando...');
        return;
    }
    loading = true;
    
    // Verificar token
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    // Pegar ID do quiz da URL
    const urlParams = new URLSearchParams(window.location.search);
    const quizId = urlParams.get('id');
    console.log('Quiz ID:', quizId);
    
    if (!quizId) {
        window.location.href = 'dashboard.html';
        return;
    }
    
    // Carregar o quiz
    loadQuiz(quizId);
});

async function loadQuiz(quizId) {
    try {
        console.log('Carregando quiz...');
        
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/quizzes/${quizId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Erro ao carregar quiz');
        }
        
        quiz = data.quiz;
        console.log('Quiz carregado:', quiz);
        
        // Verificar se tem perguntas
        if (!quiz.questions || quiz.questions.length === 0) {
            throw new Error('Este quiz não tem perguntas');
        }
        
        // Inicializar respostas
        answers = new Array(quiz.questions.length).fill(null);
        
        // Registrar jogada (não precisa esperar)
        fetch(`/api/quizzes/${quizId}/play`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }).catch(err => console.log('Erro ao registrar jogada:', err));
        
        // Atualizar a interface com os dados do quiz
        updateQuizInfo();
        showQuestion(0);
        
        // Importante: remover qualquer evento que possa estar causando reload
        document.querySelectorAll('a, button').forEach(el => {
            if (el.getAttribute('onclick')?.includes('window.location')) {
                // Manter apenas os que são intencionais
            }
        });
        
    } catch (error) {
        console.error('Erro:', error);
        showError(error.message);
    }
}

function updateQuizInfo() {
    const titleEl = document.getElementById('quizTitle');
    const categoryEl = document.getElementById('quizCategory');
    const totalEl = document.getElementById('totalQuestions');
    const countEl = document.getElementById('questionCount');
    
    if (titleEl) titleEl.textContent = quiz.title || 'Sem título';
    if (categoryEl) categoryEl.textContent = quiz.category || 'Sem categoria';
    if (totalEl) totalEl.textContent = quiz.questions.length;
    if (countEl) countEl.textContent = quiz.questions.length;
}

function showQuestion(index) {
    if (!quiz || !quiz.questions) return;
    
    const question = quiz.questions[index];
    
    const currentEl = document.getElementById('currentQuestion');
    const numberEl = document.getElementById('questionNumber');
    const textEl = document.getElementById('questionText');
    const progressFill = document.getElementById('progressFill');
    
    if (currentEl) currentEl.textContent = index + 1;
    if (numberEl) numberEl.textContent = `Pergunta ${index + 1}`;
    if (textEl) textEl.textContent = question.text;
    
    // Atualizar barra de progresso
    if (progressFill) {
        const progress = ((index + 1) / quiz.questions.length) * 100;
        progressFill.style.width = `${progress}%`;
    }
    
    // Mostrar alternativas
    const alternativesEl = document.getElementById('alternatives');
    if (alternativesEl) {
        alternativesEl.innerHTML = question.alternatives.map((alt, i) => {
            const isSelected = answers[index] === i;
            return `
                <div class="alternative ${isSelected ? 'selected' : ''}" onclick="selectAnswer(${index}, ${i})">
                    <div class="alternative-marker"></div>
                    <div class="alternative-text">${alt}</div>
                </div>
            `;
        }).join('');
    }
    
    // Atualizar pontuação
    updateScore();
    
    // Mostrar/esconder botões
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const finishSection = document.getElementById('finishSection');
    
    if (prevBtn) prevBtn.disabled = index === 0;
    
    if (index === quiz.questions.length - 1) {
        if (nextBtn) nextBtn.style.display = 'none';
        if (finishSection) finishSection.style.display = 'block';
    } else {
        if (nextBtn) nextBtn.style.display = 'flex';
        if (finishSection) finishSection.style.display = 'none';
    }
}

function selectAnswer(questionIndex, answerIndex) {
    answers[questionIndex] = answerIndex;
    
    // Atualizar visual da alternativa selecionada
    const alternatives = document.querySelectorAll('.alternative');
    alternatives.forEach((alt, i) => {
        if (i === answerIndex) {
            alt.classList.add('selected');
        } else {
            alt.classList.remove('selected');
        }
    });
    
    updateScore();
}

function previousQuestion() {
    if (currentQuestion > 0) {
        currentQuestion--;
        showQuestion(currentQuestion);
    }
}

function nextQuestion() {
    if (answers[currentQuestion] === null) {
        alert('Por favor, selecione uma resposta antes de continuar.');
        return;
    }
    
    if (currentQuestion < quiz.questions.length - 1) {
        currentQuestion++;
        showQuestion(currentQuestion);
    }
}

function updateScore() {
    if (!quiz || !quiz.questions) return;
    
    score = 0;
    quiz.questions.forEach((question, index) => {
        if (answers[index] === question.correctAnswer) {
            score++;
        }
    });
    
    const scoreEl = document.getElementById('score');
    if (scoreEl) scoreEl.textContent = score;
}

function finishQuiz() {
    if (!quiz || !quiz.questions) return;
    
    const unanswered = answers.filter(a => a === null).length;
    
    if (unanswered > 0) {
        if (!confirm(`Você ainda tem ${unanswered} pergunta(s) sem responder. Finalizar mesmo assim?`)) {
            return;
        }
    }
    
    const correctAnswers = answers.filter((answer, index) => 
        answer === quiz.questions[index].correctAnswer
    ).length;
    
    // Esconder elementos do quiz
    const elements = [
        '.quiz-progress',
        '.question-container',
        '.quiz-navigation',
        '.finish-section'
    ];
    
    elements.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) el.style.display = 'none';
    });
    
    // Mostrar resultado
    const resultContainer = document.getElementById('resultContainer');
    if (resultContainer) {
        resultContainer.style.display = 'block';
        
        const finalScore = document.getElementById('finalScore');
        const totalPossible = document.getElementById('totalPossible');
        const correctEl = document.getElementById('correctAnswers');
        const totalEl = document.getElementById('totalAnswers');
        
        if (finalScore) finalScore.textContent = correctAnswers;
        if (totalPossible) totalPossible.textContent = quiz.questions.length;
        if (correctEl) correctEl.textContent = correctAnswers;
        if (totalEl) totalEl.textContent = quiz.questions.length;
    }
}

function restartQuiz() {
    currentQuestion = 0;
    answers = new Array(quiz.questions.length).fill(null);
    score = 0;
    
    // Mostrar elementos do quiz
    const elements = [
        '.quiz-progress',
        '.question-container',
        '.quiz-navigation'
    ];
    
    elements.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) el.style.display = 'block';
    });
    
    const finishSection = document.querySelector('.finish-section');
    if (finishSection) finishSection.style.display = 'none';
    
    const resultContainer = document.getElementById('resultContainer');
    if (resultContainer) resultContainer.style.display = 'none';
    
    showQuestion(0);
}

function showError(message) {
    // Mostrar erro sem redirecionar
    const container = document.querySelector('.play-container');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #ef4444;"></i>
                <h2 style="margin: 20px 0;">Erro</h2>
                <p style="color: #666; margin-bottom: 20px;">${message}</p>
                <button onclick="window.location.href='dashboard.html'" 
                        style="padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Voltar ao Dashboard
                </button>
            </div>
        `;
    }
}