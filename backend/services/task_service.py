# services/task_service.py - Логика работы с задачами
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from models import Task, TaskStatus, User, UserRole


class TaskService:
    """Сервис для работы с задачами"""
    
    @staticmethod
    def get_by_id(db: Session, task_id: int) -> Optional[Task]:
        """Получить задачу по ID"""
        return db.query(Task).filter(Task.id == task_id).first()
    
    @staticmethod
    def get_all(db: Session, status: Optional[str] = None, 
                assigned_to: Optional[int] = None,
                user: Optional[User] = None) -> List[Task]:
        """Получить список задач с фильтрацией"""
        query = db.query(Task)
        
        if status:
            query = query.filter(Task.status == status)
        if assigned_to:
            query = query.filter(Task.assigned_to_id == assigned_to)
        
        # Исполнитель видит только свои задачи
        if user and user.role == UserRole.EXECUTOR:
            query = query.filter(Task.assigned_to_id == user.id)
        
        return query.order_by(Task.created_at.desc()).all()
    
    @staticmethod
    def get_by_message(db: Session, message_id: int) -> List[Task]:
        """Получить задачи по сообщению"""
        return db.query(Task).filter(Task.message_id == message_id).order_by(Task.created_at.desc()).all()
    
    @staticmethod
    def create(db: Session, message_id: int, title: str, description: str,
               created_by_id: int, assigned_to_id: Optional[int] = None) -> Task:
        """Создать новую задачу"""
        task = Task(
            message_id=message_id,
            title=title,
            description=description,
            created_by_id=created_by_id,
            assigned_to_id=assigned_to_id
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return task
    
    @staticmethod
    def update(db: Session, task_id: int, **kwargs) -> Optional[Task]:
        """Обновить задачу"""
        task = TaskService.get_by_id(db, task_id)
        if not task:
            return None
        
        if 'status' in kwargs:
            kwargs['status'] = TaskStatus(kwargs['status'])
            if kwargs['status'] == TaskStatus.COMPLETED:
                kwargs['completed_at'] = datetime.utcnow()
        
        for key, value in kwargs.items():
            if hasattr(task, key):
                setattr(task, key, value)
        
        task.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(task)
        return task
    
    @staticmethod
    def assign_to(db: Session, task_id: int, user_id: int) -> Optional[Task]:
        """Назначить задачу пользователю"""
        task = TaskService.get_by_id(db, task_id)
        if not task:
            return None
        task.assigned_to_id = user_id
        task.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(task)
        return task
    
    @staticmethod
    def complete(db: Session, task_id: int) -> Optional[Task]:
        """Завершить задачу"""
        task = TaskService.get_by_id(db, task_id)
        if not task:
            return None
        task.status = TaskStatus.COMPLETED
        task.completed_at = datetime.utcnow()
        task.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(task)
        return task