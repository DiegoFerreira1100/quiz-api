console.log("register.js carregado!");

document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("http://localhost:3000/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      document.getElementById("message").textContent = "Usuário registrado com sucesso!";
      
      // Salvar dados temporariamente para usar após o login
      localStorage.setItem("tempUser", JSON.stringify({ 
        username: username,
        name: username 
      }));
      
      // Redirecionar para login
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);
    } else {
      document.getElementById("message").textContent = data.message;
    }
  } catch (error) {
    document.getElementById("message").textContent = "Erro de conexão com servidor";
  }
});