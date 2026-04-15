# main.py - Полный исправленный листинг
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Query, Response, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
import mimetypes
import shutil
import os
import logging

# Загружаем переменные окружения
from dotenv import load_dotenv
load_dotenv()

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Импорты уведомлений
from max_notifications import notify_new_message, notify_task_assigned, notify_task_completed, notify_status_changed

# Импорты из модулей
from models import (
    User, Message, Task, Report, UserRole, 
    MessageStatus, TaskStatus, Priority, get_db
)
from auth import (
    authenticate_user, create_access_token, get_current_active_user, 
    require_role, get_password_hash
)
from schemas import (
    UserCreate, UserResponse, UserUpdate,
    LoginRequest, TokenResponse,
    MessageCreate, MessageResponse, MessageUpdate,
    TaskCreate, TaskResponse, TaskUpdate,
    ReportCreate, ReportResponse
)

# Импорт email сервиса
from email_service import send_email, update_smtp_config

app = FastAPI(
    title="CRM System", 
    version="3.0", 
    docs_url=None,
    redoc_url=None,
    openapi_url=None
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:85",
        "http://10.87.0.59:85",
        "http://10.87.0.59:6005",
        "http://10.87.0.59:81",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Директория для загрузки файлов
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ========== Pydantic Models ==========
class TestEmailRequest(BaseModel):
    email: str

class ChannelSettings(BaseModel):
    channel_id: str
    enabled: bool = True

class SmtpSettings(BaseModel):
    host: str
    port: int
    user: str
    password: str
    from_email: str

class NotificationEmailRequest(BaseModel):
    email: str    

# ========== Auth Endpoints ==========
@app.post("/api/auth/login", response_model=TokenResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, login_data.username, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    access_token = create_access_token(data={"sub": user.username})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        username=user.username,
        role=user.role.value
    )

@app.get("/api/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_active_user)):
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role.value,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at
    )

@app.patch("/api/auth/change-password")
def change_password(
    old_password: str,
    new_password: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    from auth import verify_password
    if not verify_password(old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Wrong password")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password too short")
    current_user.hashed_password = get_password_hash(new_password)
    current_user.updated_at = datetime.utcnow()
    db.commit()
    return {"status": "success", "message": "Password changed"}

# ========== User Management ==========
@app.post("/api/users", response_model=UserResponse)
def create_user(
    user_data: UserCreate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=get_password_hash(user_data.password),
        role=UserRole(user_data.role)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return UserResponse(
        id=new_user.id,
        username=new_user.username,
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role.value,
        is_active=new_user.is_active,
        created_at=new_user.created_at,
        updated_at=new_user.updated_at
    )

@app.get("/api/users", response_model=List[UserResponse])
def get_users(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.OPERATOR]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    users = db.query(User).all()
    return [
        UserResponse(
            id=u.id,
            username=u.username,
            email=u.email,
            full_name=u.full_name,
            role=u.role.value,
            is_active=u.is_active,
            created_at=u.created_at,
            updated_at=u.updated_at
        ) for u in users
    ]

@app.patch("/api/users/{user_id}")
def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot update yourself here")
    
    if user_data.email is not None:
        user.email = user_data.email
    if user_data.full_name is not None:
        user.full_name = user_data.full_name
    if user_data.role is not None:
        user.role = UserRole(user_data.role)
    if user_data.password is not None and user_data.password:
        user.hashed_password = get_password_hash(user_data.password)
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
    
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return user

@app.patch("/api/users/{user_id}/toggle")
def toggle_user(
    user_id: int,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    
    user.is_active = not user.is_active
    db.commit()
    return {"status": "success", "is_active": user.is_active}

# backend/main.py
@app.patch("/api/user/update-email")
def update_user_email(
    email: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Обновить email пользователя"""
    current_user.email = email
    db.commit()
    return {"status": "success", "email": email}

# ========== Messages ==========
@app.post("/api/messages", response_model=MessageResponse)
def create_message(
    message: MessageCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    db_message = Message(
        source=message.source,
        chat_id=message.chat_id,
        user_id=message.user_id,
        user_name=message.user_name,
        text=message.text,
        photos=message.photos,
        latitude=message.latitude,
        longitude=message.longitude
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    
    background_tasks.add_task(
        notify_new_message,
        {
            "id": db_message.id,
            "user_name": db_message.user_name,
            "text": db_message.text
        },
        db_message.assigned_to_id
    )
    
    logger.info(f"📨 Сообщение #{db_message.id} создано")
    return db_message

@app.get("/api/messages", response_model=List[MessageResponse])
def get_messages(
    response: Response,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to: Optional[int] = None,
    has_location: Optional[bool] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    order_by: str = Query("created_at", pattern="^(id|created_at)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(Message)
    
    if status:
        query = query.filter(Message.status == status)
    if priority:
        query = query.filter(Message.priority == priority)
    if assigned_to:
        query = query.filter(Message.assigned_to_id == assigned_to)
    if has_location is not None:
        if has_location:
            query = query.filter(Message.latitude.isnot(None))
        else:
            query = query.filter(Message.latitude.is_(None))
    
    if current_user.role == UserRole.EXECUTOR:
        query = query.filter(Message.assigned_to_id == current_user.id)
    
    total_count = query.count()
    response.headers["X-Total-Count"] = str(total_count)
    
    if order_by == "id":
        if order == "asc":
            query = query.order_by(Message.id.asc())
        else:
            query = query.order_by(Message.id.desc())
    else:
        if order == "asc":
            query = query.order_by(Message.created_at.asc())
        else:
            query = query.order_by(Message.created_at.desc())
    
    messages = query.offset(offset).limit(limit).all()
    return messages

@app.patch("/api/messages/{message_id}", response_model=MessageResponse)
def update_message(
    message_id: int,
    update: MessageUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    old_status = message.status.value
    
    if update.status:
        message.status = MessageStatus(update.status)
    if update.priority:
        message.priority = Priority(update.priority)
    if update.assigned_to_id:
        message.assigned_to_id = update.assigned_to_id
        message.status = MessageStatus.ASSIGNED
    if update.notes:
        message.notes = update.notes
    
    message.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(message)
    
    if update.status and old_status != update.status:
        background_tasks.add_task(
            notify_status_changed,
            message.id,
            old_status,
            update.status,
            message.assigned_to_id
        )
    
    return message

# ========== Tasks ==========
@app.post("/api/tasks", response_model=TaskResponse)
def create_task(
    task: TaskCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
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
    
    if task.assigned_to_id:
        background_tasks.add_task(
            notify_task_assigned,
            {
                "id": db_task.id,
                "title": db_task.title,
                "description": db_task.description
            },
            task.assigned_to_id
        )
    
    return db_task

@app.get("/api/tasks", response_model=List[TaskResponse])
def get_tasks(
    status: Optional[str] = None,
    assigned_to: Optional[int] = None,
    message_id: Optional[int] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(Task)
    if status:
        query = query.filter(Task.status == status)
    if assigned_to:
        query = query.filter(Task.assigned_to_id == assigned_to)
    if message_id:
        query = query.filter(Task.message_id == message_id)
    if current_user.role == UserRole.EXECUTOR:
        query = query.filter(Task.assigned_to_id == current_user.id)
    
    tasks = query.order_by(Task.created_at.desc()).offset(offset).limit(limit).all()
    return tasks

@app.patch("/api/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    update: TaskUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if current_user.role == UserRole.EXECUTOR and task.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    old_status = task.status.value
    
    if update.title:
        task.title = update.title
    if update.description is not None:
        task.description = update.description
    if update.status:
        task.status = TaskStatus(update.status)
        if update.status == TaskStatus.COMPLETED:
            task.completed_at = datetime.utcnow()
            background_tasks.add_task(
                notify_task_completed,
                {
                    "id": task.id,
                    "title": task.title,
                    "assignee_name": current_user.full_name
                },
                task.created_by_id
            )
    if update.assigned_to_id:
        task.assigned_to_id = update.assigned_to_id
    
    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    
    if update.status and old_status != update.status:
        background_tasks.add_task(
            notify_status_changed,
            task.message_id,
            old_status,
            update.status,
            task.assigned_to_id
        )
    
    return task

# ========== Reports ==========
@app.post("/api/reports")
async def create_report(
    text: str = Form(...),
    message_id: int = Form(...),
    task_id: Optional[int] = Form(None),
    files: List[UploadFile] = File([]),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    photo_urls = []
    for file in files:
        timestamp = int(datetime.utcnow().timestamp())
        filename = f"{timestamp}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        photo_url = f"http://10.87.0.59:6005/uploads/{filename}"
        photo_urls.append(photo_url)
    
    report = Report(
        message_id=message_id,
        task_id=task_id,
        user_id=current_user.id,
        text=text,
        photos=photo_urls
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    
    return {
        "status": "success",
        "report_id": report.id,
        "photos": photo_urls,
        "created_at": report.created_at
    }

@app.get("/api/reports/{message_id}", response_model=List[ReportResponse])
def get_reports(
    message_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    reports = db.query(Report).filter(Report.message_id == message_id).order_by(Report.created_at.desc()).all()
    return reports

# ========== Statistics ==========
@app.get("/api/statistics")
def get_statistics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    total_messages = db.query(Message).count()
    new_messages = db.query(Message).filter(Message.status == MessageStatus.NEW).count()
    processing = db.query(Message).filter(Message.status == MessageStatus.PROCESSING).count()
    completed = db.query(Message).filter(Message.status == MessageStatus.COMPLETED).count()
    cancelled = db.query(Message).filter(Message.status == MessageStatus.CANCELLED).count()
    assigned = db.query(Message).filter(Message.status == MessageStatus.ASSIGNED).count()
    
    priority_stats = {}
    for priority in Priority:
        count = db.query(Message).filter(Message.priority == priority).count()
        priority_stats[priority.value] = count
    
    messages_with_location = db.query(Message).filter(Message.latitude.isnot(None)).count()
    messages_with_photos = db.query(Message).filter(Message.photos != []).count()
    
    total_tasks = db.query(Task).count()
    pending_tasks = db.query(Task).filter(Task.status == TaskStatus.PENDING).count()
    in_progress = db.query(Task).filter(Task.status == TaskStatus.IN_PROGRESS).count()
    completed_tasks = db.query(Task).filter(Task.status == TaskStatus.COMPLETED).count()
    
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    
    avg_response_time = db.query(func.avg(Message.response_time)).filter(
        Message.response_time.isnot(None)
    ).scalar() or 0
    
    return {
        "messages": {
            "total": total_messages,
            "new": new_messages,
            "processing": processing,
            "completed": completed,
            "cancelled": cancelled,
            "assigned": assigned,
            "with_location": messages_with_location,
            "with_photos": messages_with_photos,
            "by_priority": priority_stats
        },
        "tasks": {
            "total": total_tasks,
            "pending": pending_tasks,
            "in_progress": in_progress,
            "completed": completed_tasks
        },
        "users": {
            "total": total_users,
            "active": active_users
        },
        "average_response_time_seconds": round(avg_response_time, 2)
    }

# ========== Debug Endpoints ==========
@app.get("/api/debug/time")
def debug_time(db: Session = Depends(get_db)):
    YEKATERINBURG_OFFSET = timedelta(hours=5)
    now_utc = datetime.utcnow()
    now_yekat = now_utc + YEKATERINBURG_OFFSET
    last_messages = db.query(Message).order_by(Message.id.desc()).limit(5).all()
    
    messages_data = []
    for msg in last_messages:
        created_at_local = None
        if msg.created_at:
            created_at_local = msg.created_at + YEKATERINBURG_OFFSET
        messages_data.append({
            "id": msg.id,
            "user_name": msg.user_name,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
            "created_at_local": created_at_local.strftime('%Y-%m-%d %H:%M:%S') if created_at_local else None,
        })
    
    return {
        "server_time_utc": now_utc.isoformat(),
        "server_time_utc_str": now_utc.strftime('%Y-%m-%d %H:%M:%S'),
        "yekaterinburg_time": now_yekat.isoformat(),
        "yekaterinburg_time_str": now_yekat.strftime('%Y-%m-%d %H:%M:%S'),
        "last_messages": messages_data
    }

# ========== Uploads ==========
@app.get("/uploads/{filename}")
def get_upload(filename: str):
    if '..' in filename or '/' in filename or '\\' in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File not found: {filename}")
    
    mime_type, _ = mimetypes.guess_type(file_path)
    if not mime_type:
        mime_type = 'application/octet-stream'
    
    return FileResponse(
        file_path,
        media_type=mime_type,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=31536000",
        }
    )

# ========== Notifications ==========
channel_settings = {
    "enabled": True,
    "channel_id": os.getenv("NOTIFICATION_CHANNEL_ID", "")
}

@app.get("/api/notifications/channel")
def get_channel_settings(
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """Получить настройки канала уведомлений"""
    return channel_settings

@app.post("/api/notifications/channel")
def set_channel_settings(
    settings: ChannelSettings,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """Установить настройки канала уведомлений"""
    global channel_settings
    channel_settings = {
        "enabled": settings.enabled,
        "channel_id": settings.channel_id
    }
    os.environ["NOTIFICATION_CHANNEL_ID"] = settings.channel_id
    return {"status": "success", "settings": channel_settings}

# ========== SMTP Settings ==========
@app.get("/api/notifications/smtp-settings")
def get_smtp_settings(
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """Получить текущие SMTP настройки"""
    return {
        "host": os.getenv("SMTP_HOST", ""),
        "port": int(os.getenv("SMTP_PORT", 465)),
        "user": os.getenv("SMTP_USER", ""),
        "from": os.getenv("SMTP_FROM", ""),
        "password": "********" if os.getenv("SMTP_PASSWORD") else ""
    }

@app.post("/api/notifications/smtp-settings")
def save_smtp_settings(
    settings: SmtpSettings,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """Сохранить SMTP настройки"""
    try:
        print(f"📧 Получены SMTP настройки: host={settings.host}, port={settings.port}, user={settings.user}")
        
        # Валидация
        if not settings.host:
            raise HTTPException(status_code=400, detail="SMTP хост обязателен")
        if not settings.port:
            raise HTTPException(status_code=400, detail="SMTP порт обязателен")
        if not settings.user:
            raise HTTPException(status_code=400, detail="SMTP пользователь обязателен")
        
        # Обновляем переменные окружения
        os.environ["SMTP_HOST"] = settings.host
        os.environ["SMTP_PORT"] = str(settings.port)
        os.environ["SMTP_USER"] = settings.user
        os.environ["SMTP_FROM"] = settings.from_email
        if settings.password and settings.password != "********":
            os.environ["SMTP_PASSWORD"] = settings.password
        
        # Обновляем конфигурацию в email_service
        from email_service import update_smtp_config
        update_smtp_config({
            "host": settings.host,
            "port": settings.port,
            "user": settings.user,
            "password": settings.password if settings.password and settings.password != "********" else os.getenv("SMTP_PASSWORD", ""),
            "from_email": settings.from_email
        })
        
        return {"status": "success", "message": "SMTP настройки сохранены"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Ошибка сохранения SMTP настроек: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/notifications/test-email")
def test_email_notification(
    request: TestEmailRequest,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """Отправка тестового email уведомления"""
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    
    if not smtp_user or not smtp_password:
        raise HTTPException(status_code=400, detail="SMTP настройки не заполнены. Проверьте .env файл.")
    
    subject = "🧪 Тестовое уведомление CRM"
    body = f"""
    <h2>✅ Тестовое уведомление</h2>
    <p>Здравствуйте, {current_user.full_name}!</p>
    <p>Это тестовое уведомление из CRM системы.</p>
    <p>Если вы видите это письмо, значит настройка email уведомлений работает корректно.</p>
    <br>
    <p><strong>Детали теста:</strong></p>
    <ul>
        <li>Время отправки: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</li>
        <li>Пользователь: {current_user.username}</li>
        <li>Email получателя: {request.email}</li>
    </ul>
    <br>
    <p>С уважением,<br>CRM Система</p>
    """
    
    success = send_email(request.email, subject, body)
    
    if success:
        return {"status": "success", "message": f"Тестовое письмо отправлено на {request.email}"}
    else:
        raise HTTPException(status_code=500, detail="Ошибка отправки email. Проверьте настройки SMTP в .env файле.")

@app.post("/api/user/update-notification-email")
def update_notification_email(
    request: NotificationEmailRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Сохранить email для уведомлений"""
    current_user.notification_email = request.email
    db.commit()
    return {"status": "success", "email": request.email}

@app.get("/api/user/notification-email")
def get_notification_email(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить email для уведомлений"""
    email = getattr(current_user, 'notification_email', None) or current_user.email
    return {"email": email}

# ========== Health Check ==========
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "3.0"
    }

# ========== Root ==========
@app.get("/")
def root():
    return {
        "name": "CRM System",
        "version": "3.0",
        "description": "Система для фиксации и обработки сообщений",
        "endpoints": {
            "auth": "/api/auth",
            "users": "/api/users",
            "messages": "/api/messages",
            "tasks": "/api/tasks",
            "reports": "/api/reports",
            "statistics": "/api/statistics",
            "health": "/health"
        }
    }

if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("🚀 ЗАПУСК CRM SERVER")
    print("=" * 60)
    print(f"📁 Директория загрузок: {UPLOAD_DIR}")
    print(f"🏠 Health Check: http://10.87.0.59:6005/health")
    print("=" * 60)
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=6005,
        reload=True,
        log_level="info"
    )