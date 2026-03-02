// Variáveis globais
let currentQuizzes = [];
let currentFilter = 'all';

// Carregar dados do usuário quando a página abrir
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se usuário está logado
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Carregar dados do usuário
    loadUserData();
    
    // Carregar quizzes
    loadQuizzes();
});

// Função para carregar dados do usuário
function loadUserData() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            
            // Atualizar nome na saudação
            const welcomeName = document.getElementById('welcomeName');
            if (welcomeName) {
                welcomeName.textContent = user.name || user.username || 'Usuário';
            }
            
            // Atualizar informações na sidebar
            const userName = document.getElementById('userName');
            const userEmail = document.getElementById('userEmail');
            const avatarInitial = document.getElementById('avatarInitial');
            
            if (userName) {
                userName.textContent = user.name || user.username || 'Usuário';
            }
            
            if (userEmail) {
                userEmail.textContent = user.email || 'email@exemplo.com';
            }
            
            // Atualizar avatar com a inicial
            if (avatarInitial) {
                const name = user.name || user.username || 'U';
                avatarInitial.textContent = name.charAt(0).toUpperCase();
            }
            
        } catch (e) {
            console.error('Erro ao carregar dados do usuário:', e);
        }
    }
}

// Função para carregar quizzes
async function loadQuizzes() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/quizzes', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentQuizzes = data.quizzes; // Salvar nos quizzes globais
            displayQuizzes(currentQuizzes);
        } else {
            showAlert('Erro ao carregar quizzes', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showAlert('Erro de conexão', 'error');
    }
}

// Função para exibir quizzes (APENAS UMA VEZ)
function displayQuizzes(quizzes) {
    const grid = document.getElementById('quizzesGrid');
    const emptyState = document.getElementById('emptyState');
    const quizzesCount = document.getElementById('quizzesCount');
    
    if (!grid) return;
    
    // Filtrar quizzes baseado no filtro atual
    let filteredQuizzes = quizzes;
    if (currentFilter !== 'all') {
        filteredQuizzes = quizzes.filter(q => q.status === currentFilter);
    }
    
    // Atualizar contador
    if (quizzesCount) {
        quizzesCount.textContent = `${filteredQuizzes.length} ${filteredQuizzes.length === 1 ? 'quiz' : 'quizzes'}`;
    }
    
    if (!filteredQuizzes || filteredQuizzes.length === 0) {
        grid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    grid.innerHTML = filteredQuizzes.map(quiz => `
        <div class="quiz-card" data-id="${quiz.id}">
            <div class="quiz-header">
                <h3>${quiz.title}</h3>
                <span class="quiz-category">${quiz.category}</span>
            </div>
            <div class="quiz-body">
                <p class="quiz-description">${quiz.description}</p>
                <div class="quiz-meta">
                    <span><i class="fas fa-question-circle"></i> ${quiz.questions?.length || quiz.questionsCount || 0} perguntas</span>
                    <span><i class="fas fa-play-circle"></i> ${quiz.plays || 0} jogadas</span>
                </div>
            </div>
            <div class="quiz-footer">
                <button class="btn-play" onclick="playQuiz('${quiz.id}')">
                    <i class="fas fa-play"></i> Jogar
                </button>
                <button class="btn-edit" onclick="editQuiz('${quiz.id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn-delete" onclick="deleteQuiz('${quiz.id}')">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </div>
        </div>
    `).join('');
}

// Função para filtrar quizzes
function filterQuizzes(filter) {
    currentFilter = filter;
    
    // Atualizar botões ativos
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    displayQuizzes(currentQuizzes);
}

// Função para buscar quizzes
function searchQuizzes() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    if (!searchTerm) {
        displayQuizzes(currentQuizzes);
        return;
    }
    
    const filtered = currentQuizzes.filter(quiz => 
        quiz.title.toLowerCase().includes(searchTerm) ||
        quiz.description.toLowerCase().includes(searchTerm) ||
        quiz.category.toLowerCase().includes(searchTerm)
    );
    
    displayQuizzes(filtered);
}

// Funções do Modal
function openCreateModal() {
    window.location.href = 'quiz.html'; // Redirecionar para página de criação
}

function editQuiz(id) {
    window.location.href = `quiz.html?id=${id}`; // Redirecionar para edição
}

function closeModal() {
    document.getElementById('quizModal').classList.remove('active');
}

// Função para deletar quiz
async function deleteQuiz(id) {
    if (!confirm('Tem certeza que deseja excluir este quiz?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/quizzes/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showAlert('Quiz excluído com sucesso!', 'success');
            loadQuizzes(); // Recarregar lista
        } else {
            const data = await response.json();
            showAlert(data.message, 'error');
        }
    } catch (error) {
        showAlert('Erro ao excluir quiz', 'error');
    }
}

// Função para jogar quiz
function playQuiz(id) {
    window.location.href = `play-quiz.html?id=${id}`;
}

// Função para mostrar alertas
function showAlert(message, type) {
    const alert = document.getElementById('alert');
    const alertMessage = document.getElementById('alertMessage');
    const alertIcon = document.getElementById('alertIcon');
    
    alertMessage.textContent = message;
    alert.className = `alert ${type}`;
    
    if (type === 'success') {
        alertIcon.className = 'fas fa-check-circle';
    } else {
        alertIcon.className = 'fas fa-exclamation-circle';
    }
    
    alert.style.display = 'flex';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, 3000);
}

// Função de logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const modal = document.getElementById('quizModal');
    if (event.target === modal) {
        closeModal();
    }
}