# backend/max_notifications.py
import aiohttp
import os
from typing import Optional
from email_service import send_notification_email

MAX_BOT_TOKEN = os.getenv("MAX_BOT_TOKEN")
MAX_API_URL = "https://platform-api.max.ru"
CRM_URL = os.getenv("CRM_URL", "http://10.87.0.59:85")

# ID канала для уведомлений (получить из настроек)
NOTIFICATION_CHANNEL_ID = os.getenv("NOTIFICATION_CHANNEL_ID", "")  # например, "123456789"

async def send_notification_to_channel(message: str, parse_mode: str = "markdown") -> bool:
    """Отправить уведомление в канал MAX"""
    if not MAX_BOT_TOKEN or not NOTIFICATION_CHANNEL_ID:
        print("❌ Не настроен канал для уведомлений")
        return False
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{MAX_API_URL}/messages?chat_id={NOTIFICATION_CHANNEL_ID}",
                headers={"Authorization": MAX_BOT_TOKEN},
                json={"text": message, "format": parse_mode}
            ) as response:
                if response.status == 200:
                    print(f"✅ Уведомление отправлено в канал {NOTIFICATION_CHANNEL_ID}")
                    return True
                else:
                    print(f"❌ Ошибка отправки: {response.status}")
                    return False
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return False

async def notify_new_message(message_data: dict, assignee_id: Optional[int] = None):
    """Уведомление о новом сообщении"""
    from models import SessionLocal, User
    db = SessionLocal()
    
    try:
        # Отправка в канал (если настроен)
        text = f"📨 **Новое сообщение!**\n\n"
        text += f"От: {message_data.get('user_name')}\n"
        text += f"Текст: {message_data.get('text', '')[:200]}\n"
        text += f"ID: {message_data.get('id')}\n\n"
        text += f"[Открыть в CRM]({CRM_URL}/messages)"
        await send_notification_to_channel(text)
        
        # Email уведомления для администраторов и операторов
        users = db.query(User).filter(
            User.role.in_(['admin', 'operator']),
            User.is_active == True,
            User.email.isnot(None),  # используем email из профиля
            User.email != ''  # email не пустой
        ).all()
        
        for user in users:
            if user.email:
                send_notification_email(user.email, "new_message", message_data)
                
    except Exception as e:
        print(f"Ошибка в notify_new_message: {e}")
    finally:
        db.close()

async def notify_task_assigned(task_data: dict, assignee_id: int):
    """Уведомление о новой задаче в канал"""
    text = f"📋 **Новая задача!**\n\n"
    text += f"Название: {task_data.get('title')}\n"
    text += f"Описание: {task_data.get('description', '')[:200]}\n\n"
    text += f"[Открыть в CRM]({CRM_URL}/tasks)"
    
    await send_notification_to_channel(text)

async def notify_task_completed(task_data: dict, creator_id: int):
    """Уведомление о завершении задачи в канал"""
    text = f"✅ **Задача выполнена!**\n\n"
    text += f"Название: {task_data.get('title')}\n"
    text += f"Исполнитель: {task_data.get('assignee_name')}\n\n"
    text += f"[Открыть в CRM]({CRM_URL}/tasks)"
    
    await send_notification_to_channel(text)

async def notify_status_changed(message_id: int, old_status: str, new_status: str, user_id: int):
    """Уведомление об изменении статуса в канал"""
    text = f"🔄 **Изменен статус сообщения**\n\n"
    text += f"Сообщение #{message_id}\n"
    text += f"Статус: {old_status} → {new_status}\n\n"
    text += f"[Открыть в CRM]({CRM_URL}/messages)"
    
    await send_notification_to_channel(text)

async def notify_report_created(report_data: dict):
    """Уведомление о новом отчете в канал"""
    text = f"📄 **Новый отчет!**\n\n"
    text += f"Отчет #{report_data.get('id')}\n"
    text += f"Текст: {report_data.get('text', '')[:200]}\n\n"
    text += f"[Открыть в CRM]({CRM_URL}/reports)"
    
    await send_notification_to_channel(text)


async def notify_new_message(message_data: dict, assignee_id: Optional[int] = None):
    """Уведомление о новом сообщении (email + канал)"""
    from models import SessionLocal, User
    db = SessionLocal()
    
    try:
        # Отправка в канал (если настроен)
        text = f"📨 **Новое сообщение!**\n\n"
        text += f"От: {message_data.get('user_name')}\n"
        text += f"Текст: {message_data.get('text', '')[:200]}\n"
        text += f"ID: {message_data.get('id')}\n\n"
        text += f"[Открыть в CRM]({CRM_URL}/messages)"
        await send_notification_to_channel(text)
        
        # Email уведомления для администраторов и операторов
        users = db.query(User).filter(
            User.role.in_(['admin', 'operator']),
            User.is_active == True,
            User.email.isnot(None)
        ).all()
        
        for user in users:
            if user.email:
                send_notification_email(user.email, "new_message", message_data)
                
    except Exception as e:
        print(f"Ошибка в notify_new_message: {e}")
    finally:
        db.close()    