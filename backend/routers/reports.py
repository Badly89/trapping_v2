# routers/reports.py - Маршруты отчетов
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import shutil
import os
from models import get_db, Report, Message, Task, User
from auth import get_current_active_user

router = APIRouter(prefix="/api/reports", tags=["reports"])

# Директория для загрузки файлов
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/")
async def create_report(
    text: str = Form(...),
    message_id: int = Form(...),
    task_id: Optional[int] = Form(None),
    files: List[UploadFile] = File([]),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Сохранение фото
    photo_urls = []
    for file in files:
        file_path = os.path.join(UPLOAD_DIR, f"{datetime.utcnow().timestamp()}_{file.filename}")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        photo_urls.append(f"/uploads/{os.path.basename(file_path)}")
    
    report = Report(
        message_id=message_id,
        task_id=task_id,
        user_id=current_user.id,
        text=text,
        photos=photo_urls
    )
    db.add(report)
    
    # Обновление статуса сообщения
    message = db.query(Message).filter(Message.id == message_id).first()
    if message:
        from models import MessageStatus
        message.status = MessageStatus.PROCESSING
    
    # Обновление статуса задачи
    if task_id:
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            from models import TaskStatus
            task.status = TaskStatus.IN_PROGRESS
    
    db.commit()
    return {"status": "success", "report_id": report.id, "photos": photo_urls}

@router.get("/{message_id}")
def get_reports(
    message_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    reports = db.query(Report).filter(Report.message_id == message_id).order_by(Report.created_at.desc()).all()
    return reports