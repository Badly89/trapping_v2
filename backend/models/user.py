# models/user.py - Модель пользователя
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .base import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    OPERATOR = "operator"
    EXECUTOR = "executor"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.OPERATOR)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Новые поля для уведомлений в MAX
    max_user_id = Column(String(100), nullable=True)  # ID пользователя в MAX
    max_chat_id = Column(String(100), nullable=True) # ID чата для уведомлений
    notifications_enabled = Column(Boolean, default=True)  # Включены ли уведомления

    # Отношения
    assigned_messages = relationship("Message", foreign_keys="Message.assigned_to_id", back_populates="assignee")
    created_tasks = relationship("Task", foreign_keys="Task.created_by_id", back_populates="creator")
    assigned_tasks = relationship("Task", foreign_keys="Task.assigned_to_id", back_populates="assignee")
    reports = relationship("Report", back_populates="user")