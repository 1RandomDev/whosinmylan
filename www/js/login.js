const loginForm = document.getElementById('loginForm');
const loginBtn = loginForm.querySelector('button[type="submit"]');
const loginMessage = document.getElementById('loginMessage');

loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(loginForm);

    let res = await fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({password: data.get('password')})
    });
    if(res.ok) {
        res = await res.json();
        if(res.success) {
            window.location.replace('/'+window.location.search);
        } else {
            loginMessage.classList.remove('d-none');
            loginForm.reset();
            loginBtn.disabled = true;
        }
    }
});

loginForm.addEventListener('input', () => {
    loginBtn.disabled = !loginForm.checkValidity();
});
