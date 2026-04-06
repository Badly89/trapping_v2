# schemas/__init__.py
from .user import (
    UserCreate, 
    UserResponse, 
    UserUpdate,  # Добавить
    LoginRequest, 
    TokenResponse
)
from .message import MessageCreate, MessageResponse, MessageUpdate
from .task import TaskCreate, TaskResponse, TaskUpdate
from .report import ReportCreate, ReportResponse

__all__ = [
    'UserCreate', 'UserResponse', 'UserUpdate', 'LoginRequest', 'TokenResponse',  # Добавить UserUpdate
    'MessageCreate', 'MessageResponse', 'MessageUpdate',
    'TaskCreate', 'TaskResponse', 'TaskUpdate',
    'ReportCreate', 'ReportResponse'
]