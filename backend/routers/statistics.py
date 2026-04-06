# routers/statistics.py - Маршруты статистики
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from models import get_db, User, Message, Task, Report, UserRole, MessageStatus, TaskStatus, Priority
from auth import get_current_active_user

router = APIRouter(prefix="/api/statistics", tags=["statistics"])

@router.get("/summary")
def get_summary_statistics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Общая статистика по системе"""
    
    # Статистика сообщений
    total_messages = db.query(Message).count()
    new_messages = db.query(Message).filter(Message.status == MessageStatus.NEW).count()
    processing_messages = db.query(Message).filter(Message.status == MessageStatus.PROCESSING).count()
    completed_messages = db.query(Message).filter(Message.status == MessageStatus.COMPLETED).count()
    cancelled_messages = db.query(Message).filter(Message.status == MessageStatus.CANCELLED).count()
    assigned_messages = db.query(Message).filter(Message.status == MessageStatus.ASSIGNED).count()
    
    # Статистика по приоритетам
    priority_stats = {}
    for priority in Priority:
        count = db.query(Message).filter(Message.priority == priority).count()
        priority_stats[priority.value] = count
    
    # Статистика задач
    total_tasks = db.query(Task).count()
    pending_tasks = db.query(Task).filter(Task.status == TaskStatus.PENDING).count()
    in_progress_tasks = db.query(Task).filter(Task.status == TaskStatus.IN_PROGRESS).count()
    completed_tasks = db.query(Task).filter(Task.status == TaskStatus.COMPLETED).count()
    verified_tasks = db.query(Task).filter(Task.status == TaskStatus.VERIFIED).count()
    rejected_tasks = db.query(Task).filter(Task.status == TaskStatus.REJECTED).count()
    
    # Статистика пользователей
    total_users = db.query(User).count()
    admin_users = db.query(User).filter(User.role == UserRole.ADMIN).count()
    operator_users = db.query(User).filter(User.role == UserRole.OPERATOR).count()
    executor_users = db.query(User).filter(User.role == UserRole.EXECUTOR).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    
    # Сообщения с геолокацией
    messages_with_location = db.query(Message).filter(
        Message.latitude.isnot(None),
        Message.longitude.isnot(None)
    ).count()
    
    # Сообщения с фото
    messages_with_photos = db.query(Message).filter(
        Message.photos != []
    ).count()
    
    return {
        "messages": {
            "total": total_messages,
            "new": new_messages,
            "processing": processing_messages,
            "completed": completed_messages,
            "cancelled": cancelled_messages,
            "assigned": assigned_messages,
            "with_location": messages_with_location,
            "with_photos": messages_with_photos,
            "by_priority": priority_stats
        },
        "tasks": {
            "total": total_tasks,
            "pending": pending_tasks,
            "in_progress": in_progress_tasks,
            "completed": completed_tasks,
            "verified": verified_tasks,
            "rejected": rejected_tasks
        },
        "users": {
            "total": total_users,
            "admin": admin_users,
            "operator": operator_users,
            "executor": executor_users,
            "active": active_users
        }
    }

@router.get("/messages/daily")
def get_daily_message_stats(
    days: int = Query(7, ge=1, le=30),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Статистика сообщений по дням"""
    
    stats = []
    for i in range(days):
        date = datetime.utcnow().date() - timedelta(days=i)
        start_date = datetime(date.year, date.month, date.day)
        end_date = start_date + timedelta(days=1)
        
        total = db.query(Message).filter(
            and_(
                Message.created_at >= start_date,
                Message.created_at < end_date
            )
        ).count()
        
        new = db.query(Message).filter(
            and_(
                Message.created_at >= start_date,
                Message.created_at < end_date,
                Message.status == MessageStatus.NEW
            )
        ).count()
        
        completed = db.query(Message).filter(
            and_(
                Message.created_at >= start_date,
                Message.created_at < end_date,
                Message.status == MessageStatus.COMPLETED
            )
        ).count()
        
        stats.append({
            "date": date.isoformat(),
            "total": total,
            "new": new,
            "completed": completed
        })
    
    return stats

@router.get("/messages/by-status")
def get_messages_by_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Распределение сообщений по статусам"""
    
    stats = []
    for status in MessageStatus:
        count = db.query(Message).filter(Message.status == status).count()
        stats.append({
            "status": status.value,
            "count": count
        })
    
    return stats

@router.get("/messages/by-priority")
def get_messages_by_priority(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Распределение сообщений по приоритетам"""
    
    stats = []
    for priority in Priority:
        count = db.query(Message).filter(Message.priority == priority).count()
        stats.append({
            "priority": priority.value,
            "count": count
        })
    
    return stats

@router.get("/tasks/by-status")
def get_tasks_by_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Распределение задач по статусам"""
    
    stats = []
    for status in TaskStatus:
        count = db.query(Task).filter(Task.status == status).count()
        stats.append({
            "status": status.value,
            "count": count
        })
    
    return stats

@router.get("/users/performance")
def get_user_performance(
    days: int = Query(30, ge=1, le=90),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """Статистика эффективности пользователей"""
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    users_stats = []
    users = db.query(User).filter(User.is_active == True).all()
    
    for user in users:
        # Завершенные задачи
        completed_tasks = db.query(Task).filter(
            and_(
                Task.assigned_to_id == user.id,
                Task.status == TaskStatus.COMPLETED,
                Task.completed_at >= start_date
            )
        ).count()
        
        # Назначенные сообщения
        assigned_messages = db.query(Message).filter(
            and_(
                Message.assigned_to_id == user.id,
                Message.created_at >= start_date
            )
        ).count()
        
        # Отчеты
        reports_count = db.query(Report).filter(
            and_(
                Report.user_id == user.id,
                Report.created_at >= start_date
            )
        ).count()
        
        users_stats.append({
            "user_id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role.value,
            "completed_tasks": completed_tasks,
            "assigned_messages": assigned_messages,
            "reports": reports_count
        })
    
    return users_stats

@router.get("/response-time")
def get_response_time_stats(
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """Статистика времени ответа на сообщения"""
    
    # Среднее время ответа
    avg_response_time = db.query(func.avg(Message.response_time)).filter(
        Message.response_time.isnot(None)
    ).scalar() or 0
    
    # Максимальное время ответа
    max_response_time = db.query(func.max(Message.response_time)).filter(
        Message.response_time.isnot(None)
    ).scalar() or 0
    
    # Минимальное время ответа
    min_response_time = db.query(func.min(Message.response_time)).filter(
        Message.response_time.isnot(None)
    ).scalar() or 0
    
    # Распределение по времени ответа
    fast = db.query(Message).filter(
        and_(
            Message.response_time.isnot(None),
            Message.response_time < 3600  # менее часа
        )
    ).count()
    
    medium = db.query(Message).filter(
        and_(
            Message.response_time.isnot(None),
            Message.response_time >= 3600,
            Message.response_time < 86400  # от часа до дня
        )
    ).count()
    
    slow = db.query(Message).filter(
        and_(
            Message.response_time.isnot(None),
            Message.response_time >= 86400  # более дня
        )
    ).count()
    
    return {
        "average_seconds": round(avg_response_time, 2),
        "average_hours": round(avg_response_time / 3600, 2),
        "max_seconds": max_response_time,
        "max_hours": round(max_response_time / 3600, 2),
        "min_seconds": min_response_time,
        "distribution": {
            "fast_less_1hour": fast,
            "medium_1hour_1day": medium,
            "slow_more_1day": slow
        }
    }

@router.get("/reports")
def get_reports_statistics(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """Статистика по отчетам"""
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    total_reports = db.query(Report).filter(
        Report.created_at >= start_date
    ).count()
    
    # Отчеты с фото
    reports_with_photos = db.query(Report).filter(
        and_(
            Report.created_at >= start_date,
            Report.photos != []
        )
    ).count()
    
    # Отчеты по дням
    daily_stats = []
    for i in range(min(days, 30)):
        date = datetime.utcnow().date() - timedelta(days=i)
        start = datetime(date.year, date.month, date.day)
        end = start + timedelta(days=1)
        
        count = db.query(Report).filter(
            and_(
                Report.created_at >= start,
                Report.created_at < end
            )
        ).count()
        
        daily_stats.append({
            "date": date.isoformat(),
            "count": count
        })
    
    return {
        "period_days": days,
        "total_reports": total_reports,
        "reports_with_photos": reports_with_photos,
        "photos_percentage": round((reports_with_photos / total_reports * 100) if total_reports > 0 else 0, 2),
        "daily": daily_stats
    }

@router.get("/dashboard")
def get_dashboard_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Сводная статистика для дашборда"""
    
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    week_start = today_start - timedelta(days=now.weekday())
    month_start = datetime(now.year, now.month, 1)
    
    # Статистика для разных ролей
    if current_user.role == UserRole.EXECUTOR:
        # Для исполнителя - только его задачи
        my_tasks = db.query(Task).filter(Task.assigned_to_id == current_user.id).count()
        my_pending_tasks = db.query(Task).filter(
            and_(
                Task.assigned_to_id == current_user.id,
                Task.status == TaskStatus.PENDING
            )
        ).count()
        my_completed_tasks = db.query(Task).filter(
            and_(
                Task.assigned_to_id == current_user.id,
                Task.status == TaskStatus.COMPLETED
            )
        ).count()
        
        return {
            "my_tasks": {
                "total": my_tasks,
                "pending": my_pending_tasks,
                "completed": my_completed_tasks
            }
        }
    
    # Для администратора и оператора - полная статистика
    messages_today = db.query(Message).filter(Message.created_at >= today_start).count()
    messages_week = db.query(Message).filter(Message.created_at >= week_start).count()
    messages_month = db.query(Message).filter(Message.created_at >= month_start).count()
    
    tasks_today = db.query(Task).filter(Task.created_at >= today_start).count()
    tasks_completed_today = db.query(Task).filter(
        and_(
            Task.completed_at >= today_start,
            Task.status == TaskStatus.COMPLETED
        )
    ).count()
    
    return {
        "messages": {
            "today": messages_today,
            "week": messages_week,
            "month": messages_month
        },
        "tasks": {
            "created_today": tasks_today,
            "completed_today": tasks_completed_today
        },
        "efficiency": {
            "completion_rate": round((tasks_completed_today / tasks_today * 100) if tasks_today > 0 else 0, 2)
        }
    }