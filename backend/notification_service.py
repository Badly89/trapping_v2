# backend/notification_service.py
from models import SessionLocal, InternalNotification

def add_notification(user_id: int, message: str, notification_type: str, data: dict = None):
    """Добавить уведомление пользователю"""
    db = SessionLocal()
    try:
        notification = InternalNotification(
            user_id=user_id,
            message=message,
            notification_type=notification_type,
            data=data or {},
            is_read=False
        )
        db.add(notification)
        db.commit()
        print(f"✅ Уведомление добавлено пользователю {user_id}: {message[:50]}")
    except Exception as e:
        print(f"❌ Ошибка добавления уведомления: {e}")
    finally:
        db.close()