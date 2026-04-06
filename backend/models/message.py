# models/message.py - Модель сообщения
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, Float, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .base import Base

class MessageStatus(str, enum.Enum):
    NEW = "new"
    PROCESSING = "processing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ASSIGNED = "assigned"

class Priority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(50), default="max")
    chat_id = Column(String(100), index=True)
    user_id = Column(String(100), index=True)
    user_name = Column(String(100))
    text = Column(Text)
    photos = Column(JSON, default=list)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_address = Column(String(255), nullable=True)
    received_at = Column(DateTime, nullable=True)  # <-- ДОБАВИТЬ ЭТУ СТРОКУ
    status = Column(Enum(MessageStatus), default=MessageStatus.NEW)
    priority = Column(Enum(Priority), default=Priority.MEDIUM)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    response_time = Column(Integer, nullable=True)

    
    # Отношения
    assignee = relationship("User", foreign_keys=[assigned_to_id], back_populates="assigned_messages")
    tasks = relationship("Task", back_populates="message")
    reports = relationship("Report", back_populates="message")