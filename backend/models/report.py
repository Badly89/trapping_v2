from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone, timedelta
from .base import Base

# Часовой пояс Екатеринбурга (UTC+5)
YEKATERINBURG_TZ = timezone(timedelta(hours=5))

def get_yekaterinburg_time():
    """Возвращает текущее время в Екатеринбурге (UTC+5)"""
    return datetime.now(YEKATERINBURG_TZ)


class Report(Base):
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    text = Column(Text, nullable=False)
    photos = Column(JSON, default=list)
    created_at = Column(DateTime, default=get_yekaterinburg_time)  # <-- ИСПРАВЛЕНО
    
    message = relationship("Message", back_populates="reports")
    task = relationship("Task", back_populates="reports")
    user = relationship("User", back_populates="reports")