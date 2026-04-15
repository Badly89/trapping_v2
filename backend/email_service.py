# backend/email_service.py
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import logging

logger = logging.getLogger(__name__)

# Глобальные настройки
_smtp_config = {
    "host": os.getenv("SMTP_HOST", ""),
    "port": int(os.getenv("SMTP_PORT", 465)),
    "user": os.getenv("SMTP_USER", ""),
    "password": os.getenv("SMTP_PASSWORD", ""),
    "from_email": os.getenv("SMTP_FROM", "")
}

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
    """Отправка уведомительного email"""
    
    templates = {
        "new_message": f"""
            <h2>📨 Новое сообщение в CRM</h2>
            <p>От: {data.get('user_name')}</p>
            <p>Текст: {data.get('text', '')[:200]}</p>
            <p>ID сообщения: {data.get('id')}</p>
            <br>
            <a href="http://10.87.0.59:85/messages">Перейти к сообщению</a>
        """,
        "new_task": f"""
            <h2>📋 Новая задача</h2>
            <p>Название: {data.get('title')}</p>
            <p>Описание: {data.get('description', '')[:200]}</p>
            <br>
            <a href="http://10.87.0.59:85/tasks">Перейти к задачам</a>
        """,
        "task_completed": f"""
            <h2>✅ Задача выполнена</h2>
            <p>Название: {data.get('title')}</p>
            <p>Исполнитель: {data.get('assignee_name')}</p>
            <br>
            <a href="http://10.87.0.59:85/tasks">Перейти к задачам</a>
        """,
        "status_changed": f"""
            <h2>🔄 Изменен статус сообщения</h2>
            <p>Сообщение #{data.get('message_id')}</p>
            <p>Статус: {data.get('old_status')} → {data.get('new_status')}</p>
            <br>
            <a href="http://10.87.0.59:85/messages">Перейти к сообщениям</a>
        """,
        "new_report": f"""
            <h2>📄 Новый отчет</h2>
            <p>Отчет #{data.get('id')}</p>
            <p>Текст: {data.get('text', '')[:200]}</p>
            <br>
            <a href="http://10.87.0.59:85/reports">Перейти к отчетам</a>
        """,
    }
    
    template = templates.get(notification_type, f"<h2>Уведомление</h2><p>{data}</p>")
    subject = f"CRM Уведомление: {notification_type.replace('_', ' ').title()}"
    
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