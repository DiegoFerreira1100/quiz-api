console.log("login.js carregado!");

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("Formulário enviado!");

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("http://localhost:3000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      document.getElementById("message").textContent = "Login bem-sucedido!";
      
      // Salvar token no localStorage
      localStorage.setItem("token", data.token);
      
      // Salvar dados do usuário no localStorage
      const userData = {
        name: username,
        username: username,
        email: username.includes('@') ? username : `${username}@exemplo.com`
      };
      localStorage.setItem("user", JSON.stringify(userData));
      
      // Redirecionar para dashboard
      window.location.href = "dashboard.html";
    } else {
      document.getElementById("message").textContent = data.message;
    }
  } catch (error) {
    document.getElementById("message").textContent = "Erro de conexão com servidor";
  }
});