# routers/tasks.py - Маршруты задач
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from models import get_db, Task, TaskStatus, Message, User, UserRole
from auth import get_current_active_user

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

class TaskCreate(BaseModel):
    message_id: int
    title: str
    description: str
    assigned_to_id: Optional[int] = None

class TaskResponse(BaseModel):
    id: int
    message_id: int
    title: str
    description: str
    status: str
    assigned_to_id: Optional[int]
    created_at: datetime

@router.post("/", response_model=TaskResponse)
def create_task(
    task: TaskCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Проверка существования сообщения
    message = db.query(Message).filter(Message.id == task.message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    db_task = Task(
        message_id=task.message_id,
        title=task.title,
        description=task.description,
        assigned_to_id=task.assigned_to_id,
        created_by_id=current_user.id
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.get("/", response_model=List[TaskResponse])
def get_tasks(
    status: Optional[str] = None,
    assigned_to: Optional[int] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(Task)
    
    if status:
        query = query.filter(Task.status == status)
    if assigned_to:
        query = query.filter(Task.assigned_to_id == assigned_to)
    
    # Исполнитель видит только свои задачи
    if current_user.role == UserRole.EXECUTOR:
        query = query.filter(Task.assigned_to_id == current_user.id)
    
    tasks = query.order_by(Task.created_at.desc()).all()
    return tasks

@router.patch("/{task_id}")
def update_task(
    task_id: int,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Проверка доступа
    if current_user.role == UserRole.EXECUTOR and task.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if status:
        task.status = TaskStatus(status)
        if status == TaskStatus.COMPLETED:
            task.completed_at = datetime.utcnow()
    
    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return task