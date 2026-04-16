# backend/email_service.py
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

# Глобальные настройки
_smtp_config = {
    "host": os.getenv("SMTP_HOST", ""),
    "port": int(os.getenv("SMTP_PORT", 465)),
    "user": os.getenv("SMTP_USER", ""),
    "password": os.getenv("SMTP_PASSWORD", ""),
    "from_email": os.getenv("SMTP_FROM", "")
}

# Часовой пояс Екатеринбурга (UTC+5)
YEKATERINBURG_TZ = timezone(timedelta(hours=5))

def get_yekaterinburg_time():
    return datetime.now(YEKATERINBURG_TZ)

def format_yekaterinburg_time(dt=None):
    if dt is None:
        dt = get_yekaterinburg_time()
    return dt.strftime('%Y-%m-%d %H:%M:%S')


def update_smtp_config(config: dict):
    """Обновить SMTP конфигурацию"""
    global _smtp_config
    _smtp_config.update(config)

def send_email(to_email: str, subject: str, body: str) -> bool:
    """Отправка email через SMTP"""
    if not _smtp_config["user"] or not _smtp_config["password"]:
        logger.warning("Email не настроен: отсутствуют SMTP_USER или SMTP_PASSWORD")
        return False
    
    try:
        msg = MIMEMultipart()
        msg["From"] = _smtp_config["from_email"] or _smtp_config["user"]
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "html"))
        
        context = ssl.create_default_context()
        
        if _smtp_config["port"] == 465:
            with smtplib.SMTP_SSL(_smtp_config["host"], _smtp_config["port"], context=context) as server:
                server.login(_smtp_config["user"], _smtp_config["password"])
                server.send_message(msg)
        else:
            with smtplib.SMTP(_smtp_config["host"], _smtp_config["port"]) as server:
                server.starttls(context=context)
                server.login(_smtp_config["user"], _smtp_config["password"])
                server.send_message(msg)
        
        logger.info(f"✅ Email отправлен на {to_email}")
        return True
    except Exception as e:
        logger.error(f"❌ Ошибка отправки email: {e}")
        return False

def send_notification_email(to_email: str, notification_type: str, data: dict) -> bool:
    """Отправка уведомительного email с правильным временем"""
    
    now = get_yekaterinburg_time()
    time_str = format_yekaterinburg_time(now)
    
    templates = {
        "new_message": f"""
            <h2>📨 Новое сообщение в CRM</h2>
            <p>От: {data.get('user_name')}</p>
            <p>Текст: {data.get('text', '')[:200]}</p>
            <p>ID сообщения: {data.get('id')}</p>
            <p>Время: {time_str} (Екатеринбург)</p>
            <br>
            <a href="http://10.87.0.59:85/messages">Перейти к сообщению</a>
        """,
        "new_task": f"""
            <h2>📋 Новая задача</h2>
            <p>Название: {data.get('title')}</p>
            <p>Описание: {data.get('description', '')[:200]}</p>
            <p>Время: {time_str} (Екатеринбург)</p>
            <br>
            <a href="http://10.87.0.59:85/tasks">Перейти к задачам</a>
        """,
        # ... остальные шаблоны
    }
    
    template = templates.get(notification_type, f"<h2>Уведомление</h2><p>{data}</p><p>Время: {time_str} (Екатеринбург)</p>")
    subject = f"CRM Уведомление: {notification_type.replace('_', ' ').title()}"
    
    from email_service import send_email
    return send_email(to_email, subject, template)

def test_smtp_connection(host: str, port: int, user: str, password: str) -> bool:
    """Тестирование SMTP подключения"""
    try:
        context = ssl.create_default_context()
        
        if port == 465:
            with smtplib.SMTP_SSL(host, port, context=context) as server:
                server.login(user, password)
        else:
            with smtplib.SMTP(host, port) as server:
                server.starttls(context=context)
                server.login(user, password)
        
        logger.info(f"✅ SMTP подключение успешно к {host}:{port}")
        return True
    except Exception as e:
        logger.error(f"❌ Ошибка SMTP подключения: {e}")
        return False