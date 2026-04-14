# backend/max_notifications.py
import aiohttp
import os
from typing import Optional
from datetime import datetime, timedelta

MAX_BOT_TOKEN = os.getenv("MAX_BOT_TOKEN")
MAX_API_URL = "https://platform-api.max.ru"
CRM_URL = os.getenv("CRM_URL", "http://10.87.0.59:85")

# Временное хранилище кодов (в продакшене используйте Redis)
verification_storage = {}

async def send_notification_to_user(chat_id: str, message: str) -> bool:
    """Отправить уведомление пользователю в MAX"""
    if not MAX_BOT_TOKEN or not chat_id:
        print(f"❌ Не удалось отправить уведомление: нет токена или chat_id={chat_id}")
        return False
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{MAX_API_URL}/messages?chat_id={chat_id}",
                headers={"Authorization": MAX_BOT_TOKEN},
                json={"text": message, "format": "markdown"}
            ) as response:
                if response.status == 200:
                    print(f"✅ Уведомление отправлено в чат {chat_id}")
                    return True
                else:
                    print(f"❌ Ошибка отправки: {response.status}")
                    return False
    except Exception as e:
        print(f"❌ Ошибка отправки уведомления: {e}")
        return False

async def notify_new_message(message_data: dict, assignee_id: Optional[int] = None):
    """Уведомление о новом сообщении"""
    from models import SessionLocal, User
    db = SessionLocal()
    
    try:
        print(f"📨 Отправка уведомления о новом сообщении #{message_data.get('id')}")
        
        if assignee_id:
            user = db.query(User).filter(User.id == assignee_id).first()
            if user and user.max_chat_id and user.notifications_enabled:
                text = f"📨 **Новое сообщение!**\n\n"
                text += f"От: {message_data.get('user_name')}\n"
                text += f"Текст: {message_data.get('text', '')[:100]}\n"
                text += f"ID: {message_data.get('id')}\n\n"
                text += f"[Открыть в CRM]({CRM_URL}/messages)"
                await send_notification_to_user(user.max_chat_id, text)
                print(f"✅ Уведомление отправлено пользователю {user.username}")
        else:
            users = db.query(User).filter(
                User.role.in_(['admin', 'operator']),
                User.is_active == True,
                User.notifications_enabled == True,
                User.max_chat_id.isnot(None)
            ).all()
            
            print(f"📨 Отправка уведомлений {len(users)} пользователям")
            for user in users:
                text = f"📨 **Новое сообщение!**\n\n"
                text += f"От: {message_data.get('user_name')}\n"
                text += f"Текст: {message_data.get('text', '')[:100]}\n\n"
                text += f"[Открыть в CRM]({CRM_URL}/messages)"
                await send_notification_to_user(user.max_chat_id, text)
    except Exception as e:
        print(f"❌ Ошибка в notify_new_message: {e}")
    finally:
        db.close()

async def notify_task_assigned(task_data: dict, assignee_id: int):
    """Уведомление о назначении задачи"""
    from models import SessionLocal, User
    db = SessionLocal()
    
    try:
        print(f"📋 Отправка уведомления о задаче #{task_data.get('id')} пользователю {assignee_id}")
        user = db.query(User).filter(User.id == assignee_id).first()
        if user and user.max_chat_id and user.notifications_enabled:
            text = f"📋 **Вам назначена новая задача!**\n\n"
            text += f"Название: {task_data.get('title')}\n"
            text += f"Описание: {task_data.get('description', '')[:100]}\n\n"
            text += f"[Открыть в CRM]({CRM_URL}/tasks)"
            await send_notification_to_user(user.max_chat_id, text)
            print(f"✅ Уведомление о задаче отправлено")
    except Exception as e:
        print(f"❌ Ошибка в notify_task_assigned: {e}")
    finally:
        db.close()

async def notify_task_completed(task_data: dict, creator_id: int):
    """Уведомление о завершении задачи"""
    from models import SessionLocal, User
    db = SessionLocal()
    
    try:
        user = db.query(User).filter(User.id == creator_id).first()
        if user and user.max_chat_id and user.notifications_enabled:
            text = f"✅ **Задача выполнена!**\n\n"
            text += f"Название: {task_data.get('title')}\n"
            text += f"Исполнитель: {task_data.get('assignee_name')}\n\n"
            text += f"[Открыть в CRM]({CRM_URL}/tasks)"
            await send_notification_to_user(user.max_chat_id, text)
    except Exception as e:
        print(f"❌ Ошибка в notify_task_completed: {e}")
    finally:
        db.close()

async def notify_status_changed(message_id: int, old_status: str, new_status: str, user_id: int):
    """Уведомление об изменении статуса сообщения"""
    from models import SessionLocal, User, Message
    db = SessionLocal()
    
    try:
        message = db.query(Message).filter(Message.id == message_id).first()
        user = db.query(User).filter(User.id == user_id).first()
        
        if user and user.max_chat_id and user.notifications_enabled and message:
            text = f"🔄 **Изменен статус сообщения**\n\n"
            text += f"Сообщение #{message_id}\n"
            text += f"Статус: {old_status} → {new_status}\n"
            text += f"Текст: {message.text[:100]}\n\n"
            text += f"[Открыть в CRM]({CRM_URL}/messages)"
            await send_notification_to_user(user.max_chat_id, text)
    except Exception as e:
        print(f"❌ Ошибка в notify_status_changed: {e}")
    finally:
        db.close()


def store_verification_code(user_id: int, code: str, chat_id: str):
    """Сохранить код верификации"""
    verification_storage[user_id] = {
        "code": code,
        "chat_id": chat_id,
        "expires_at": datetime.now() + timedelta(minutes=5)
    }
    print(f"✅ Код {code} сохранен для пользователя {user_id}")

def verify_code(user_id: int, code: str) -> tuple:
    """Проверить код верификации"""
    if user_id in verification_storage:
        stored = verification_storage[user_id]
        if stored["code"] == code and stored["expires_at"] > datetime.now():
            return True, stored["chat_id"]
    return False, None