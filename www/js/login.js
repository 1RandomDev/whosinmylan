const loginForm = document.getElementById('loginForm');
const loginBtn = loginForm.querySelector('button[type="submit"]');
const loginPassword = loginForm.querySelector('input');
const loginMessage = document.getElementById('loginMessage');

loginForm.addEventListener('submit', function(event) {
    event.preventDefault();

    const req = new XMLHttpRequest();
    req.onreadystatechange = function() {
        if (this.readyState != 4 || this.status != 200) return;

        const result = JSON.parse(this.responseText);
        if(result.success) {
            window.location.replace('/');
        } else {
            loginMessage.style.display = null;
            loginPassword.value = '';
            loginBtn.disabled = true;
        }
    };
    req.open('POST', '/api/login');
    req.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    req.send(JSON.stringify({password: loginPassword.value}));
});

loginPassword.addEventListener('input', () => {
    loginBtn.disabled = loginPassword.value == '';
});
