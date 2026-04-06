# schemas/report.py - Pydantic схемы для отчетов
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ReportBase(BaseModel):
    message_id: int
    task_id: Optional[int] = None
    text: str
    photos: List[str] = []

class ReportCreate(ReportBase):
    pass

class ReportUpdate(BaseModel):
    text: Optional[str] = None
    photos: Optional[List[str]] = None
    status: Optional[str] = None

class ReportResponse(ReportBase):
    id: int
    user_id: int
    status: str = "report"
    created_at: datetime

    class Config:
        from_attributes = True

class ReportWithDetails(ReportResponse):
    user_name: Optional[str] = None
    task_title: Optional[str] = None
    message_text: Optional[str] = None