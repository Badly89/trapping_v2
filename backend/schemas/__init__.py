# schemas/__init__.py
from .user import UserCreate, UserResponse, LoginRequest, TokenResponse
from .message import MessageCreate, MessageResponse, MessageUpdate
from .task import TaskCreate, TaskResponse, TaskUpdate
from .report import ReportCreate, ReportResponse

__all__ = [
    'UserCreate', 'UserResponse', 'LoginRequest', 'TokenResponse',
    'MessageCreate', 'MessageResponse', 'MessageUpdate',
    'TaskCreate', 'TaskResponse', 'TaskUpdate',
    'ReportCreate', 'ReportResponse'
]