# backend/main.py - добавьте импорты
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Настройки email (добавьте в .env)
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.yandex.ru")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "your-email@yandex.ru")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "your-password")
SMTP_FROM = os.getenv("SMTP_FROM", "your-email@yandex.ru")

def send_verification_email(to_email: str, code: str, user_name: str):
    """Отправка кода подтверждения на email"""
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_FROM
        msg['To'] = to_email
        msg['Subject'] = 'Подтверждение привязки MAX аккаунта к CRM'
        
        body = f"""
        <html>
        <body>
            <h2>Здравствуйте, {user_name}!</h2>
            <p>Вы запросили привязку вашего MAX аккаунта к CRM системе.</p>
            <p>Ваш код подтверждения: <b style="font-size: 24px; color: #1976d2;">{code}</b></p>
            <p>Код действителен в течение 5 минут.</p>
            <p>Введите этот код в настройках CRM для завершения привязки.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">Если вы не запрашивали эту операцию, проигнорируйте данное письмо.</p>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        logger.info(f"✅ Email с кодом отправлен на {to_email}")
        return True
    except Exception as e:
        logger.error(f"❌ Ошибка отправки email: {e}")
        return False

@app.post("/api/bot/request-verification-code")
def request_verification_code(
    request: EmailVerificationRequest,
    db: Session = Depends(get_db)
):
    """Проверка email и отправка кода на почту"""
    from redis_client import store_verification_code
    import random
    import string
    
    email = request.email.lower()
    
    # Проверяем, существует ли пользователь с таким email
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        return {"exists": False, "message": "Email не найден в CRM"}
    
    # Генерируем 6-значный код
    verification_code = ''.join(random.choices(string.digits, k=6))
    
    # Сохраняем код в Redis
    store_verification_code(email, verification_code, request.chat_id)
    
    # Отправляем код на email
    email_sent = send_verification_email(email, verification_code, user.full_name)
    
    if email_sent:
        return {
            "exists": True,
            "code": verification_code,
            "user_id": user.id,
            "user_name": user.full_name,
            "email_sent": True
        }
    else:
        return {
            "exists": True,
            "code": verification_code,
            "user_id": user.id,
            "user_name": user.full_name,
            "email_sent": False,
            "message": "Ошибка отправки email"
        }