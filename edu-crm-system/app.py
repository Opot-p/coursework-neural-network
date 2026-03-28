import os
from flask import Flask, render_template, request, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

# Инициализация приложения
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///edu_crm.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# Модели базы данных
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), default='student')  # admin, teacher, student
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    courses_taught = db.relationship('Course', backref='teacher', lazy=True)
    enrollments = db.relationship('Enrollment', backref='student', lazy=True)

class Course(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    teacher_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    topics = db.relationship('Topic', backref='course', lazy=True, cascade='all, delete-orphan')
    enrollments = db.relationship('Enrollment', backref='course', lazy=True)

class Topic(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    materials = db.relationship('Material', backref='topic', lazy=True, cascade='all, delete-orphan')

class Material(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    material_type = db.Column(db.String(20), nullable=False)  # video, test, form, text, file
    content = db.Column(db.Text)  # URL для видео, вопросы для теста, HTML для формы
    topic_id = db.Column(db.Integer, db.ForeignKey('topic.id'), nullable=False)
    order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Enrollment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    enrolled_at = db.Column(db.DateTime, default=datetime.utcnow)
    progress = db.Column(db.Integer, default=0)  # 0-100%
    grade = db.Column(db.Float)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Маршруты
@app.route('/')
def index():
    courses = Course.query.all()
    return render_template('index.html', courses=courses)

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        role = request.form.get('role', 'student')
        
        if User.query.filter_by(username=username).first():
            flash('Пользователь с таким именем уже существует', 'error')
            return redirect(url_for('register'))
        
        if User.query.filter_by(email=email).first():
            flash('Email уже зарегистрирован', 'error')
            return redirect(url_for('register'))
        
        user = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password),
            role=role
        )
        db.session.add(user)
        db.session.commit()
        
        flash('Регистрация успешна! Теперь войдите.', 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username).first()
        
        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            next_page = request.args.get('next')
            return redirect(next_page or url_for('dashboard'))
        
        flash('Неверное имя пользователя или пароль', 'error')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/dashboard')
@login_required
def dashboard():
    if current_user.role == 'admin':
        users_count = User.query.count()
        courses_count = Course.query.count()
        students_count = User.query.filter_by(role='student').count()
        return render_template('dashboard.html', 
                             users_count=users_count, 
                             courses_count=courses_count,
                             students_count=students_count)
    elif current_user.role == 'teacher':
        courses = Course.query.filter_by(teacher_id=current_user.id).all()
        return render_template('dashboard_teacher.html', courses=courses)
    else:  # student
        enrollments = Enrollment.query.filter_by(student_id=current_user.id).all()
        return render_template('dashboard_student.html', enrollments=enrollments)

@app.route('/courses')
def courses():
    all_courses = Course.query.all()
    return render_template('courses.html', courses=all_courses)

@app.route('/course/<int:course_id>')
@login_required
def view_course(course_id):
    course = Course.query.get_or_404(course_id)
    enrollment = None
    if current_user.role == 'student':
        enrollment = Enrollment.query.filter_by(
            student_id=current_user.id, 
            course_id=course_id
        ).first()
    return render_template('course_detail.html', course=course, enrollment=enrollment)

@app.route('/enroll/<int:course_id>', methods=['POST'])
@login_required
def enroll_course(course_id):
    if current_user.role != 'student':
        flash('Только студенты могут записываться на курсы', 'error')
        return redirect(url_for('courses'))
    
    existing = Enrollment.query.filter_by(
        student_id=current_user.id, 
        course_id=course_id
    ).first()
    
    if not existing:
        enrollment = Enrollment(student_id=current_user.id, course_id=course_id)
        db.session.add(enrollment)
        db.session.commit()
        flash('Вы успешно записались на курс!', 'success')
    else:
        flash('Вы уже записаны на этот курс', 'info')
    
    return redirect(url_for('view_course', course_id=course_id))

@app.route('/create-course', methods=['GET', 'POST'])
@login_required
def create_course():
    if current_user.role not in ['admin', 'teacher']:
        flash('У вас нет прав для создания курсов', 'error')
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        title = request.form.get('title')
        description = request.form.get('description')
        
        course = Course(
            title=title,
            description=description,
            teacher_id=current_user.id
        )
        db.session.add(course)
        db.session.commit()
        
        flash('Курс успешно создан!', 'success')
        return redirect(url_for('dashboard'))
    
    return render_template('create_course.html')

@app.route('/course/<int:course_id>/add-topic', methods=['GET', 'POST'])
@login_required
def add_topic(course_id):
    if current_user.role not in ['admin', 'teacher']:
        flash('У вас нет прав для добавления тем', 'error')
        return redirect(url_for('index'))
    
    course = Course.query.get_or_404(course_id)
    
    if request.method == 'POST':
        title = request.form.get('title')
        description = request.form.get('description')
        order = request.form.get('order', 0)
        
        topic = Topic(
            title=title,
            description=description,
            course_id=course_id,
            order=int(order)
        )
        db.session.add(topic)
        db.session.commit()
        
        flash('Тема успешно добавлена!', 'success')
        return redirect(url_for('view_course', course_id=course_id))
    
    return render_template('add_topic.html', course=course)

@app.route('/topic/<int:topic_id>/add-material', methods=['GET', 'POST'])
@login_required
def add_material(topic_id):
    if current_user.role not in ['admin', 'teacher']:
        flash('У вас нет прав для добавления материалов', 'error')
        return redirect(url_for('index'))
    
    topic = Topic.query.get_or_404(topic_id)
    
    if request.method == 'POST':
        title = request.form.get('title')
        material_type = request.form.get('material_type')
        content = request.form.get('content')
        order = request.form.get('order', 0)
        
        material = Material(
            title=title,
            material_type=material_type,
            content=content,
            topic_id=topic_id,
            order=int(order)
        )
        db.session.add(material)
        db.session.commit()
        
        flash('Материал успешно добавлен!', 'success')
        return redirect(url_for('view_topic', topic_id=topic_id))
    
    return render_template('add_material.html', topic=topic)

@app.route('/topic/<int:topic_id>')
@login_required
def view_topic(topic_id):
    topic = Topic.query.get_or_404(topic_id)
    return render_template('view_topic.html', topic=topic)

@app.route('/material/<int:material_id>')
@login_required
def view_material(material_id):
    material = Material.query.get_or_404(material_id)
    return render_template('view_material.html', material=material)

# Инициализация БД и создание админа
def init_db():
    with app.app_context():
        db.create_all()
        # Создаем админа если нет
        if not User.query.filter_by(username='admin').first():
            admin = User(
                username='admin',
                email='admin@educrm.com',
                password_hash=generate_password_hash('admin123'),
                role='admin'
            )
            db.session.add(admin)
            db.session.commit()
            print("Администратор создан: admin / admin123")

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)
