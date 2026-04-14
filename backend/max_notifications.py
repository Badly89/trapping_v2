# backend/max_notifications.py
import aiohttp
import asyncio
import os
from typing import Optional

MAX_BOT_TOKEN = os.getenv("MAX_BOT_TOKEN")
MAX_API_URL = "https://platform-api.max.ru"

async def send_notification_to_user(chat_id: str, message: str) -> bool:
    """Отправить уведомление пользователю в MAX"""
    if not MAX_BOT_TOKEN:
        print("MAX_BOT_TOKEN не установлен")
        return False
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{MAX_API_URL}/messages?chat_id={chat_id}",
                headers={"Authorization": MAX_BOT_TOKEN},
                json={"text": message}
            ) as response:
                return response.status == 200
    except Exception as e:
        print(f"Ошибка отправки уведомления: {e}")
        return False

async def notify_new_message(message_data: dict, assignee_id: Optional[int] = None):
    """Уведомление о новом сообщении"""
    from models import SessionLocal, User
    db = SessionLocal()
    
    # Если указан исполнитель - уведомляем его
    if assignee_id:
        user = db.query(User).filter(User.id == assignee_id).first()
        if user and user.max_chat_id and user.notifications_enabled:
            text = f"📨 Новое сообщение!\n\n"
            text += f"От: {message_data.get('user_name')}\n"
            text += f"Текст: {message_data.get('text', '')[:100]}\n"
            text += f"ID сообщения: {message_data.get('id')}\n\n"
            text += f"Ссылка: http://10.87.0.59:85/messages"
            await send_notification_to_user(user.max_chat_id, text)
    else:
        # Уведомляем всех операторов и администраторов
        users = db.query(User).filter(
            User.role.in_([UserRole.ADMIN, UserRole.OPERATOR]),
            User.is_active == True,
            User.notifications_enabled == True,
            User.max_chat_id.isnot(None)
        ).all()
        
        for user in users:
            text = f"📨 Новое сообщение!\n\n"
            text += f"От: {message_data.get('user_name')}\n"
            text += f"Текст: {message_data.get('text', '')[:100]}\n\n"
            text += f"http://10.87.0.59:85/messages"
            await send_notification_to_user(user.max_chat_id, text)
    
    db.close()

async def notify_task_assigned(task_data: dict, assignee_id: int):
    """Уведомление о назначении задачи"""
    from models import SessionLocal, User
    db = SessionLocal()
    
    user = db.query(User).filter(User.id == assignee_id).first()
    if user and user.max_chat_id and user.notifications_enabled:
        text = f"📋 Вам назначена новая задача!\n\n"
        text += f"Название: {task_data.get('title')}\n"
        text += f"Описание: {task_data.get('description', '')[:100]}\n\n"
        text += f"http://10.87.0.59:85/tasks"
        await send_notification_to_user(user.max_chat_id, text)
    
    db.close()

async def notify_task_completed(task_data: dict, creator_id: int):
    """Уведомление о завершении задачи"""
    from models import SessionLocal, User
    db = SessionLocal()
    
    user = db.query(User).filter(User.id == creator_id).first()
    if user and user.max_chat_id and user.notifications_enabled:
        text = f"✅ Задача выполнена!\n\n"
        text += f"Название: {task_data.get('title')}\n"
        text += f"Исполнитель: {task_data.get('assignee_name')}\n\n"
        text += f"http://10.87.0.59:85/tasks"
        await send_notification_to_user(user.max_chat_id, text)
    
    db.close()

async def notify_status_changed(message_id: int, old_status: str, new_status: str, user_id: int):
    """Уведомление об изменении статуса сообщения"""
    from models import SessionLocal, User, Message
    db = SessionLocal()
    
    message = db.query(Message).filter(Message.id == message_id).first()
    if message and message.assigned_to_id:
        user = db.query(User).filter(User.id == message.assigned_to_id).first()
        if user and user.max_chat_id and user.notifications_enabled:
            text = f"🔄 Изменен статус сообщения #{message_id}\n\n"
            text += f"Статус: {old_status} → {new_status}\n"
            text += f"Текст: {message.text[:100]}\n\n"
            text += f"http://10.87.0.59:85/messages"
            await send_notification_to_user(user.max_chat_id, text)
    
    db.close()