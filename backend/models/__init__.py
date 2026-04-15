# backend/models/__init__.py
from .base import Base, engine, SessionLocal, get_db
from .user import User, UserRole
from .message import Message, MessageStatus, Priority
from .task import Task, TaskStatus
from .report import Report
from .notification import InternalNotification  # Добавить

__all__ = [
    'Base', 'engine', 'SessionLocal', 'get_db',
    'User', 'UserRole',
    'Message', 'MessageStatus', 'Priority',
    'Task', 'TaskStatus',
    'Report',
    'InternalNotification',  # Добавить
]