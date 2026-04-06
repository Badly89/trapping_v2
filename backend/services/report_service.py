# services/report_service.py - Логика работы с отчетами
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from models import Report


class ReportService:
    """Сервис для работы с отчетами"""
    
    @staticmethod
    def get_by_id(db: Session, report_id: int) -> Optional[Report]:
        """Получить отчет по ID"""
        return db.query(Report).filter(Report.id == report_id).first()
    
    @staticmethod
    def get_by_message(db: Session, message_id: int) -> List[Report]:
        """Получить отчеты по сообщению"""
        return db.query(Report).filter(Report.message_id == message_id).order_by(Report.created_at.desc()).all()
    
    @staticmethod
    def get_by_task(db: Session, task_id: int) -> List[Report]:
        """Получить отчеты по задаче"""
        return db.query(Report).filter(Report.task_id == task_id).order_by(Report.created_at.desc()).all()
    
    @staticmethod
    def get_by_user(db: Session, user_id: int) -> List[Report]:
        """Получить отчеты по пользователю"""
        return db.query(Report).filter(Report.user_id == user_id).order_by(Report.created_at.desc()).all()
    
    @staticmethod
    def create(db: Session, message_id: int, user_id: int, text: str,
               task_id: Optional[int] = None, photos: List[str] = None) -> Report:
        """Создать новый отчет"""
        report = Report(
            message_id=message_id,
            task_id=task_id,
            user_id=user_id,
            text=text,
            photos=photos or []
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        return report
    
    @staticmethod
    def update(db: Session, report_id: int, **kwargs) -> Optional[Report]:
        """Обновить отчет"""
        report = ReportService.get_by_id(db, report_id)
        if not report:
            return None
        
        for key, value in kwargs.items():
            if hasattr(report, key):
                setattr(report, key, value)
        
        db.commit()
        db.refresh(report)
        return report