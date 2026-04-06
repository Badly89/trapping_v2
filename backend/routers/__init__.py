# routers/__init__.py
from .auth import router as auth_router
from .users import router as users_router
from .messages import router as messages_router
from .tasks import router as tasks_router
from .reports import router as reports_router
from .statistics import router as statistics_router

__all__ = [
    'auth_router',
    'users_router',
    'messages_router',
    'tasks_router',
    'reports_router',
    'statistics_router'
]