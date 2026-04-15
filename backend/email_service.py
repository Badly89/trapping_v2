# backend/email_service.py
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import logging

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.yandex.ru")
SMTP_PORT = int(os.getenv("SMTP_PORT", 465))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)

def send_email(to_email: str, subject: str, body: str) -> bool:
    """Отправка email через SMTP"""
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("Email не настроен: отсутствуют SMTP_USER или SMTP_PASSWORD")
        return False
    
    try:
        # Создаем сообщение
        msg = MIMEMultipart()
        msg["From"] = SMTP_FROM
        msg["To"] = to_email
        msg["Subject"] = subject
        
        # Добавляем тело письма
        msg.attach(MIMEText(body, "html"))
        
        # Создаем SSL контекст
        context = ssl.create_default_context()
        
        # Отправляем
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
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
    
    template = templates.get(notification_type, f"<h2>Уведомление</h2><p>{body}</p>")
    subject = f"CRM Уведомление: {notification_type.replace('_', ' ').title()}"
    
    return send_email(to_email, subject, template)