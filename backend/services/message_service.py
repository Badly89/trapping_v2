# services/message_service.py - Логика работы с сообщениями
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import Optional, List
from datetime import datetime

from models import Message, MessageStatus, Priority, User, UserRole


class MessageService:
    """Сервис для работы с сообщениями"""
    
    @staticmethod
    def get_by_id(db: Session, message_id: int) -> Optional[Message]:
        """Получить сообщение по ID"""
        return db.query(Message).filter(Message.id == message_id).first()
    
    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100, 
                status: Optional[str] = None, priority: Optional[str] = None,
                assigned_to: Optional[int] = None, has_location: Optional[bool] = None,
                user: Optional[User] = None) -> List[Message]:
        """Получить список сообщений с фильтрацией"""
        query = db.query(Message)
        
        if status:
            query = query.filter(Message.status == status)
        if priority:
            query = query.filter(Message.priority == priority)
        if assigned_to:
            query = query.filter(Message.assigned_to_id == assigned_to)
        if has_location is not None:
            if has_location:
                query = query.filter(Message.latitude.isnot(None))
            else:
                query = query.filter(Message.latitude.is_(None))
        
        # Исполнитель видит только свои сообщения
        if user and user.role == UserRole.EXECUTOR:
            query = query.filter(Message.assigned_to_id == user.id)
        
        return query.order_by(Message.created_at.desc()).offset(skip).limit(limit).all()
    
    @staticmethod
    def create(db: Session, **kwargs) -> Message:
        """Создать новое сообщение"""
        message = Message(**kwargs)
        db.add(message)
        db.commit()
        db.refresh(message)
        return message
    
    @staticmethod
    def update(db: Session, message_id: int, **kwargs) -> Optional[Message]:
        """Обновить сообщение"""
        message = MessageService.get_by_id(db, message_id)
        if not message:
            return None
        
        if 'status' in kwargs:
            kwargs['status'] = MessageStatus(kwargs['status'])
        if 'priority' in kwargs:
            kwargs['priority'] = Priority(kwargs['priority'])
        
        for key, value in kwargs.items():
            if hasattr(message, key):
                setattr(message, key, value)
        
        message.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(message)
        return message
    
    @staticmethod
    def assign_to(db: Session, message_id: int, user_id: int) -> Optional[Message]:
        """Назначить сообщение пользователю"""
        message = MessageService.get_by_id(db, message_id)
        if not message:
            return None
        message.assigned_to_id = user_id
        message.status = MessageStatus.ASSIGNED
        message.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(message)
        return message
    
    @staticmethod
    def complete(db: Session, message_id: int) -> Optional[Message]:
        """Завершить сообщение"""
        message = MessageService.get_by_id(db, message_id)
        if not message:
            return None
        message.status = MessageStatus.COMPLETED
        message.resolved_at = datetime.utcnow()
        if message.created_at:
            message.response_time = int((message.resolved_at - message.created_at).total_seconds())
        message.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(message)
        return message
    
    @staticmethod
    def get_statistics(db: Session, user: Optional[User] = None) -> dict:
        """Получить статистику по сообщениям"""
        query = db.query(Message)
        
        if user and user.role == UserRole.EXECUTOR:
            query = query.filter(Message.assigned_to_id == user.id)
        
        total = query.count()
        new = query.filter(Message.status == MessageStatus.NEW).count()
        processing = query.filter(Message.status == MessageStatus.PROCESSING).count()
        completed = query.filter(Message.status == MessageStatus.COMPLETED).count()
        assigned = query.filter(Message.status == MessageStatus.ASSIGNED).count()
        cancelled = query.filter(Message.status == MessageStatus.CANCELLED).count()
        
        with_location = query.filter(Message.latitude.isnot(None)).count()
        with_photos = query.filter(Message.photos != []).count()
        
        return {
            "total": total,
            "new": new,
            "processing": processing,
            "completed": completed,
            "assigned": assigned,
            "cancelled": cancelled,
            "with_location": with_location,
            "with_photos": with_photos
        }