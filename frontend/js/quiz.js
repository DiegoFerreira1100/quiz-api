let questions = [];

// Verificar autenticação
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    // Verificar se está editando um quiz
    const urlParams = new URLSearchParams(window.location.search);
    const quizId = urlParams.get('id');
    
    if (quizId) {
        loadQuiz(quizId);
    } else {
        // Adicionar primeira pergunta automaticamente
        addQuestion();
    }
});

// Carregar quiz para edição
async function loadQuiz(quizId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:3000/api/quizzes/${quizId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const quiz = data.quiz;
            
            // Preencher dados básicos
            document.getElementById('quizTitle').value = quiz.title;
            document.getElementById('quizDescription').value = quiz.description;
            document.getElementById('quizCategory').value = quiz.category;
            
            // Carregar perguntas
            questions = quiz.questions;
            renderQuestions();
        } else {
            showAlert('Erro ao carregar quiz', 'error');
        }
    } catch (error) {
        showAlert('Erro de conexão', 'error');
    }
}

// Adicionar nova pergunta
function addQuestion() {
    const question = {
        id: Date.now() + Math.random(),
        text: '',
        alternatives: ['', '', '', ''],
        correctAnswer: 0
    };
    
    questions.push(question);
    renderQuestions();
}

// Remover pergunta
function removeQuestion(questionId) {
    questions = questions.filter(q => q.id !== questionId);
    renderQuestions();
    
    if (questions.length === 0) {
        addQuestion(); // Sempre manter pelo menos uma pergunta
    }
}

// Adicionar alternativa
function addAlternative(questionId) {
    const question = questions.find(q => q.id === questionId);
    if (question && question.alternatives.length < 5) {
        question.alternatives.push('');
        renderQuestions();
    }
}

// Remover alternativa
function removeAlternative(questionId, altIndex) {
    const question = questions.find(q => q.id === questionId);
    if (question && question.alternatives.length > 2) {
        question.alternatives.splice(altIndex, 1);
        
        // Ajustar resposta correta se necessário
        if (question.correctAnswer >= question.alternatives.length) {
            question.correctAnswer = question.alternatives.length - 1;
        }
        
        renderQuestions();
    }
}

// Renderizar todas as perguntas
function renderQuestions() {
    const container = document.getElementById('questionsContainer');
    
    container.innerHTML = questions.map((question, qIndex) => `
        <div class="question-card" data-id="${question.id}">
            <div class="question-header">
                <h3>Pergunta ${qIndex + 1}</h3>
                <button class="btn-remove-question" onclick="removeQuestion(${question.id})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <input type="text" 
                   class="question-text" 
                   placeholder="Digite sua pergunta..." 
                   value="${question.text.replace(/"/g, '&quot;')}"
                   onchange="updateQuestionText(${question.id}, this.value)">
            
            <div class="alternatives-container">
                ${question.alternatives.map((alt, aIndex) => `
                    <div class="alternative-item ${aIndex === question.correctAnswer ? 'correct' : ''}">
                        <input type="radio" 
                               name="correct_${question.id}" 
                               ${aIndex === question.correctAnswer ? 'checked' : ''}
                               onchange="setCorrectAnswer(${question.id}, ${aIndex})">
                        <input type="text" 
                               class="alternative-input" 
                               placeholder="Alternativa ${aIndex + 1}"
                               value="${alt.replace(/"/g, '&quot;')}"
                               onchange="updateAlternative(${question.id}, ${aIndex}, this.value)">
                        ${question.alternatives.length > 2 ? `
                            <button class="btn-remove-alternative" onclick="removeAlternative(${question.id}, ${aIndex})">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            
            ${question.alternatives.length < 5 ? `
                <button class="btn-add-alternative" onclick="addAlternative(${question.id})">
                    <i class="fas fa-plus"></i> Adicionar Alternativa
                </button>
            ` : ''}
        </div>
    `).join('');
}

// Atualizar texto da pergunta
function updateQuestionText(questionId, text) {
    const question = questions.find(q => q.id === questionId);
    if (question) {
        question.text = text;
    }
}

// Atualizar alternativa
function updateAlternative(questionId, altIndex, text) {
    const question = questions.find(q => q.id === questionId);
    if (question) {
        question.alternatives[altIndex] = text;
    }
}

// Definir resposta correta
function setCorrectAnswer(questionId, altIndex) {
    const question = questions.find(q => q.id === questionId);
    if (question) {
        question.correctAnswer = altIndex;
        renderQuestions(); // Re-render para mostrar a alternativa correta destacada
    }
}

// Salvar quiz
async function saveQuiz() {
    // Validar dados básicos
    const title = document.getElementById('quizTitle').value;
    const description = document.getElementById('quizDescription').value;
    const category = document.getElementById('quizCategory').value;
    
    if (!title || !description || !category) {
        showAlert('Preencha todas as informações básicas', 'error');
        return;
    }
    
    // Validar perguntas
    if (questions.length === 0) {
        showAlert('Adicione pelo menos uma pergunta', 'error');
        return;
    }
    
    for (let q of questions) {
        if (!q.text.trim()) {
            showAlert('Todas as perguntas devem ter um texto', 'error');
            return;
        }
        
        for (let alt of q.alternatives) {
            if (!alt.trim()) {
                showAlert('Todas as alternativas devem ser preenchidas', 'error');
                return;
            }
        }
    }
    
    // Preparar dados para enviar
    const quizData = {
        title,
        description,
        category,
        questions: questions.map(q => ({
            text: q.text,
            alternatives: q.alternatives,
            correctAnswer: q.correctAnswer
        }))
    };
    
    try {
        const token = localStorage.getItem('token');
        const urlParams = new URLSearchParams(window.location.search);
        const quizId = urlParams.get('id');
        
        const url = quizId 
            ? `http://localhost:3000/api/quizzes/${quizId}`
            : 'http://localhost:3000/api/quizzes';
        
        const method = quizId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(quizData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert(quizId ? 'Quiz atualizado!' : 'Quiz criado com sucesso!', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            showAlert(data.message, 'error');
        }
    } catch (error) {
        showAlert('Erro ao salvar quiz', 'error');
    }
}

// Função para mostrar alertas
function showAlert(message, type) {
    const alert = document.getElementById('alert');
    const alertMessage = document.getElementById('alertMessage');
    const alertIcon = document.getElementById('alertIcon');
    
    alertMessage.textContent = message;
    alert.className = `alert ${type}`;
    alertIcon.className = `fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
    alert.style.display = 'flex';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, 3000);
}