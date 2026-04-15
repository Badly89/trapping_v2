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


        db.close()

async def notify_task_assigned(task_data: dict, assignee_id: int):
    """Уведомление о назначении задачи"""
    from notification_service import add_notification
    
    # Только исполнителю
    add_notification(
        assignee_id,
        f"📋 Новая задача: {task_data.get('title')}",
        "task_assigned",
        {"task_id": task_data.get('id')}
    )
    
    # В общий канал
    await send_notification_to_channel(f"📋 Новая задача: {task_data.get('title')} → назначена")

async def notify_task_completed(task_data: dict, creator_id: int):
    """Уведомление о завершении задачи"""
    from notification_service import add_notification
    
    # Создателю задачи
    add_notification(
        creator_id,
        f"✅ Задача выполнена: {task_data.get('title')}",
        "task_completed",
        {"task_id": task_data.get('id')}
    )
    
    await send_notification_to_channel(f"✅ Задача выполнена: {task_data.get('title')}")

async def notify_status_changed(message_id: int, old_status: str, new_status: str, user_id: int):
    """Уведомление об изменении статуса"""
    from models import SessionLocal, Message
    from notification_service import add_notification
    
    db = SessionLocal()
    try:
        message = db.query(Message).filter(Message.id == message_id).first()
        if message and message.assigned_to_id:
            add_notification(
                message.assigned_to_id,
                f"🔄 Изменен статус сообщения #{message_id}: {old_status} → {new_status}",
                "status_changed",
                {"message_id": message_id}
            )
        
        await send_notification_to_channel(f"🔄 Статус сообщения #{message_id}: {old_status} → {new_status}")
    finally:
        db.close()

async def notify_report_created(report_data: dict):
    """Уведомление о новом отчете в канал"""
    text = f"📄 **Новый отчет!**\n\n"
    text += f"Отчет #{report_data.get('id')}\n"
    text += f"Текст: {report_data.get('text', '')[:200]}\n\n"
    text += f"[Открыть в CRM]({CRM_URL}/reports)"
    
    await send_notification_to_channel(text)

def create_internal_notification(user_id: int, message: str, notification_type: str, data: dict):
    """Создание внутреннего уведомления в CRM"""
    from models import SessionLocal, InternalNotification
    db = SessionLocal()
    
    try:
        notification = InternalNotification(
            user_id=user_id,
            message=message,
            notification_type=notification_type,
            data=data,
            is_read=False
        )
        db.add(notification)
        db.commit()
    except Exception as e:
        print(f"Ошибка создания уведомления: {e}")
    finally:
        db.close()


async def notify_new_message(message_data: dict, assignee_id: int = None):
    """Уведомление о новом сообщении"""
    from models import SessionLocal, User
    from notification_service import add_notification
    
    db = SessionLocal()
    
    try:
        # 1. ВНУТРЕННЕЕ УВЕДОМЛЕНИЕ В CRM
        if assignee_id:
            create_internal_notification(
                assignee_id,
                f"📨 Новое сообщение #{message_data.get('id')} от {message_data.get('user_name')}",
                "new_message",
                {"message_id": message_data.get('id')}
            )
        else:
            users = db.query(User).filter(
                User.role.in_(['admin', 'operator']),
                User.is_active == True
            ).all()
            for user in users:
                create_internal_notification(
                    user.id,
                    f"📨 Новое сообщение #{message_data.get('id')} от {message_data.get('user_name')}",
                    "new_message",
                    {"message_id": message_data.get('id')}
                )
        
        # 2. ВНЕШНИЕ УВЕДОМЛЕНИЯ (общий канал MAX)
        await send_notification_to_channel(f"📨 Новое сообщение #{message_data.get('id')} от {message_data.get('user_name')}")
        
        # 3. EMAIL УВЕДОМЛЕНИЯ (для пользователей с включенной опцией)
        users_for_email = db.query(User).filter(
            User.role.in_(['admin', 'operator']),
            User.is_active == True,
            User.notifications_enabled == True
        ).all()
        
        for user in users_for_email:
            email = user.notification_email or user.email
            if email:
                send_notification_email(email, "new_message", message_data)
                
    except Exception as e:
        print(f"Ошибка в notify_new_message: {e}")
    finally:
        db.close()