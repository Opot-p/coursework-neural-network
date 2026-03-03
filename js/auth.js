// Скрипт для регистрации и аутентификации
class AuthManager {
    constructor() {
        this.init();
    }
    
    init() {
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Проверяем, если это страница регистрации
        if (document.getElementById('registerForm')) {
            this.setupRegisterForm();
        }
        
        // Проверяем, если это страница входа
        if (document.getElementById('loginForm')) {
            this.setupLoginForm();
        }
    }
    
    setupRegisterForm() {
        // Переключение типа пользователя
        const userTypeRadios = document.querySelectorAll('input[name="userType"]');
        const studentFields = document.querySelectorAll('.student-fields');
        const teacherFields = document.querySelectorAll('.teacher-fields');
        
        userTypeRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.value === 'student') {
                    studentFields.forEach(field => field.style.display = 'block');
                    teacherFields.forEach(field => field.style.display = 'none');
                } else if (this.value === 'teacher') {
                    studentFields.forEach(field => field.style.display = 'none');
                    teacherFields.forEach(field => field.style.display = 'block');
                } else {
                    // Для администратора поля скрыты
                    studentFields.forEach(field => field.style.display = 'none');
                    teacherFields.forEach(field => field.style.display = 'none');
                }
            });
        });
        
        // Переключение видимости пароля
        this.setupPasswordToggle('togglePassword', 'password');
        this.setupPasswordToggle('toggleConfirmPassword', 'confirmPassword');
        
        // Валидация формы
        const form = document.getElementById('registerForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.validateRegisterForm();
            });
        }
        
        // Валидация в реальном времени
        this.setupRealTimeValidation(form);
    }
    
    setupLoginForm() {
        // Переключение видимости пароля
        this.setupPasswordToggle('toggleLoginPassword', 'loginPassword');
        
        // Валидация формы входа
        const form = document.getElementById('loginForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.validateLoginForm();
            });
        }
        
        // Валидация в реальном времени
        this.setupRealTimeValidation(form);
    }
    
    setupPasswordToggle(toggleId, inputId) {
        const toggleBtn = document.getElementById(toggleId);
        const input = document.getElementById(inputId);
        
        if (toggleBtn && input) {
            toggleBtn.addEventListener('click', function() {
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
                this.querySelector('i').classList.toggle('fa-eye');
                this.querySelector('i').classList.toggle('fa-eye-slash');
            });
        }
    }
    
    setupRealTimeValidation(form) {
        if (!form) return;
        
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                if (input.required && !input.value.trim()) {
                    this.showError(input.id, 'Это поле обязательно для заполнения');
                } else {
                    this.removeError(input.id);
                }
            });
            
            input.addEventListener('input', () => {
                if (input.classList.contains('is-invalid')) {
                    if (input.value.trim()) {
                        this.removeError(input.id);
                    }
                }
            });
        });
    }
    
    validateRegisterForm() {
        let isValid = true;
        
        // Проверка паролей
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            this.showError('confirmPassword', 'Пароли не совпадают');
            isValid = false;
        } else {
            this.removeError('confirmPassword');
        }
        
        // Проверка сложности пароля
        if (!this.isValidPassword(password)) {
            this.showError('password', 'Пароль должен содержать не менее 8 символов, включая заглавные и строчные буквы, цифры и специальные символы');
            isValid = false;
        }
        
        // Проверка email
        const email = document.getElementById('email').value;
        if (!this.isValidEmail(email)) {
            this.showError('email', 'Пожалуйста, введите действительный email адрес');
            isValid = false;
        }
        
        // Проверка телефона
        const phone = document.getElementById('phone').value;
        if (!this.isValidPhone(phone)) {
            this.showError('phone', 'Пожалуйста, введите действительный номер телефона');
            isValid = false;
        }
        
        // Проверка имени и фамилии
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        
        if (!firstName.trim()) {
            this.showError('firstName', 'Пожалуйста, введите ваше имя');
            isValid = false;
        }
        
        if (!lastName.trim()) {
            this.showError('lastName', 'Пожалуйста, введите вашу фамилию');
            isValid = false;
        }
        
        if (isValid) {
            this.submitRegistration();
        }
    }
    
    validateLoginForm() {
        let isValid = true;
        
        // Проверка email
        const email = document.getElementById('loginEmail').value;
        if (!email.trim()) {
            this.showError('loginEmail', 'Пожалуйста, введите ваш email или имя пользователя');
            isValid = false;
        } else {
            this.removeError('loginEmail');
        }
        
        // Проверка пароля
        const password = document.getElementById('loginPassword').value;
        if (!password.trim()) {
            this.showError('loginPassword', 'Пожалуйста, введите ваш пароль');
            isValid = false;
        } else {
            this.removeError('loginPassword');
        }
        
        if (isValid) {
            this.submitLogin();
        }
    }
    
    isValidPassword(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
    }
    
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    isValidPhone(phone) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
    }
    
    showError(inputId, message) {
        const input = document.getElementById(inputId);
        const feedback = input.parentNode.querySelector('.invalid-feedback');
        if (feedback) {
            feedback.textContent = message;
        }
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');
    }
    
    removeError(inputId) {
        const input = document.getElementById(inputId);
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
    }
    
    submitRegistration() {
        const form = document.getElementById('registerForm');
        const formData = new FormData(form);
        const userData = {};
        
        for (let [key, value] of formData.entries()) {
            userData[key] = value;
        }
        
        // Исключаем администратора из регистрации
        if (userData.userType === 'admin') {
            this.showErrorMessage('Администраторы не могут регистрироваться через эту форму. Пожалуйста, обратитесь к системному администратору.');
            return;
        }
        
        // Показываем индикатор загрузки
        this.showLoading();
        
        // Имитация отправки данных
        setTimeout(() => {
            this.hideLoading();
            this.showSuccessMessage('Регистрация успешно завершена! Проверьте ваш email для подтверждения.');
            
            // Перенаправление через 3 секунды
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);
        }, 2000);
    }
    
    submitLogin() {
        // Показываем индикатор загрузки
        this.showLoading();
        
        // Имитация отправки данных
        setTimeout(() => {
            this.hideLoading();
            
            // Проверяем учетные данные (демо)
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            // Демо учетные данные
            const demoUsers = {
                'student@example.com': { password: 'Password123!', role: 'student' },
                'teacher@example.com': { password: 'Password123!', role: 'teacher' },
                'admin@example.com': { password: 'Password123!', role: 'admin' }
            };
            
            if (demoUsers[email] && demoUsers[email].password === password) {
                // Сохраняем информацию о пользователе в sessionStorage
                sessionStorage.setItem('currentUser', JSON.stringify({
                    email: email,
                    role: demoUsers[email].role,
                    name: this.getUserNameFromEmail(email)
                }));
                
                this.showSuccessMessage('Успешный вход! Переадресация...');
                
                // Перенаправление через 2 секунды
                setTimeout(() => {
                    this.redirectAfterLogin(demoUsers[email].role);
                }, 2000);
            } else {
                this.showErrorMessage('Неверный email или пароль. Пожалуйста, попробуйте снова.');
            }
        }, 2000);
    }
    
    getUserNameFromEmail(email) {
        const namePart = email.split('@')[0];
        return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
    
    redirectAfterLogin(role) {
        switch(role) {
            case 'student':
                window.location.href = 'dashboard/student.html';
                break;
            case 'teacher':
                window.location.href = 'dashboard/teacher.html';
                break;
            case 'admin':
                window.location.href = 'dashboard/admin.html';
                break;
            default:
                window.location.href = 'index.html';
        }
    }
    
    showLoading() {
        const form = document.getElementById('registerForm') || document.getElementById('loginForm');
        if (!form) return;
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span> Обработка...';
        
        // Сохраняем оригинальный текст для восстановления
        submitBtn.dataset.originalText = originalText;
    }
    
    hideLoading() {
        const form = document.getElementById('registerForm') || document.getElementById('loginForm');
        if (!form) return;
        
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = submitBtn.dataset.originalText || submitBtn.innerHTML;
    }
    
    showSuccessMessage(message) {
        this.createAlert('alert-success', message);
    }
    
    showErrorMessage(message) {
        this.createAlert('alert-danger', message);
    }
    
    createAlert(type, message) {
        // Создаем алерт
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert ${type} alert-dismissible fade show`;
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `
            <i class="fas fa-check-circle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Вставляем перед формой
        const form = document.getElementById('registerForm') || document.getElementById('loginForm');
        if (form) {
            form.parentNode.insertBefore(alertDiv, form);
            
            // Автоматически скрываем через 5 секунд
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 5000);
        }
    }
}

// Инициализация при загрузке документа
document.addEventListener('DOMContentLoaded', function() {
    new AuthManager();
});