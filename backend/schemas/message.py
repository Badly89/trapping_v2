# schemas/message.py - Pydantic схемы для сообщений
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class MessageBase(BaseModel):
    source: str = "max"
    chat_id: str
    user_id: str
    user_name: str
    text: str = ""
    photos: List[str] = []
    latitude: Optional[float] = None  # Добавить
    longitude: Optional[float] = None  # Добавить
    received_at: Optional[datetime] = None

class MessageCreate(MessageBase):
    received_at: Optional[datetime] = None  # <-- ДОБАВИТЬ ЭТУ СТРОКУ

class MessageUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to_id: Optional[int] = None
    notes: Optional[str] = None

class MessageResponse(MessageBase):
    id: int
    status: str
    priority: str
    assigned_to_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    response_time: Optional[int] = None
    latitude: Optional[float] = None  # Добавить
    longitude: Optional[float] = None  # Добавить

    class Config:
        from_attributes = True

class MessageWithDetails(MessageResponse):
    assignee_name: Optional[str] = None
    reports_count: int = 0
    tasks_count: int = 0