const loginForm = document.getElementById('loginForm');
const loginBtn = loginForm.querySelector('button[type="submit"]');
const loginMessage = document.getElementById('loginMessage');

loginForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const data = new FormData(loginForm);

    const req = new XMLHttpRequest();
    req.onreadystatechange = function() {
        if (this.readyState != 4 || this.status != 200) return;

        const result = JSON.parse(this.responseText);
        if(result.success) {
            window.location.replace('/'+window.location.search);
        } else {
            loginMessage.classList.remove('d-none');
            loginForm.reset();
            loginBtn.disabled = true;
        }
    };
    req.open('POST', '/api/login');
    req.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    req.send(JSON.stringify({password: data.get('password')}));
});

loginForm.addEventListener('input', () => {
    loginBtn.disabled = !loginForm.checkValidity();
});
