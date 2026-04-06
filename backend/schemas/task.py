# schemas/task.py - Pydantic схемы для задач
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class TaskBase(BaseModel):
    message_id: int
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    assigned_to_id: Optional[int] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    assigned_to_id: Optional[int] = None

class TaskResponse(TaskBase):
    id: int
    status: str
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TaskWithDetails(TaskResponse):
    assignee_name: Optional[str] = None
    creator_name: Optional[str] = None
    message_text: Optional[str] = None
    reports: List['ReportResponse'] = []

# Для избежания циклических импортов
from .report import ReportResponse
TaskWithDetails.model_rebuild()