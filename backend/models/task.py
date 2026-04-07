# models/task.py - Модель задачи
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone, timedelta
import enum
from .base import Base

# Часовой пояс Екатеринбурга (UTC+5)
YEKATERINBURG_TZ = timezone(timedelta(hours=5))

def get_yekaterinburg_time():
    """Возвращает текущее время в Екатеринбурге (UTC+5)"""
    return datetime.now(YEKATERINBURG_TZ)


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    VERIFIED = "verified"
    REJECTED = "rejected"

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=get_yekaterinburg_time)  # <-- ИСПРАВЛЕНО
    updated_at = Column(DateTime, default=get_yekaterinburg_time, onupdate=get_yekaterinburg_time)
    completed_at = Column(DateTime, nullable=True)
    
    # Отношения
    message = relationship("Message", back_populates="tasks")
    assignee = relationship("User", foreign_keys=[assigned_to_id], back_populates="assigned_tasks")
    creator = relationship("User", foreign_keys=[created_by_id], back_populates="created_tasks")
    reports = relationship("Report", back_populates="task")