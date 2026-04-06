# models/report.py - Модель отчета
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base

class Report(Base):
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    text = Column(Text, nullable=False)
    photos = Column(JSON, default=list)
    status = Column(String(50), default="report")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Отношения
    message = relationship("Message", back_populates="reports")
    task = relationship("Task", back_populates="reports")
    user = relationship("User", back_populates="reports")