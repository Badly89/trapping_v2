# models/notification.py
from sqlalchemy import Column, Integer, String, DateTime, Boolean, JSON, ForeignKey
from datetime import datetime
from .base import Base

class InternalNotification(Base):
    __tablename__ = "internal_notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(String(500), nullable=False)
    notification_type = Column(String(50))  # new_message, task_assigned, task_completed, status_changed
    data = Column(JSON, default={})
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)