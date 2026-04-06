# services/user_service.py - Логика работы с пользователями
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from models import User, UserRole
from auth import get_password_hash, verify_password


class UserService:
    """Сервис для работы с пользователями"""
    
    @staticmethod
    def get_by_id(db: Session, user_id: int) -> Optional[User]:
        """Получить пользователя по ID"""
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def get_by_username(db: Session, username: str) -> Optional[User]:
        """Получить пользователя по имени"""
        return db.query(User).filter(User.username == username).first()
    
    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[User]:
        """Получить пользователя по email"""
        return db.query(User).filter(User.email == email).first()
    
    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
        """Получить всех пользователей"""
        return db.query(User).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_active_users(db: Session) -> List[User]:
        """Получить активных пользователей"""
        return db.query(User).filter(User.is_active == True).all()
    
    @staticmethod
    def get_by_role(db: Session, role: UserRole) -> List[User]:
        """Получить пользователей по роли"""
        return db.query(User).filter(User.role == role).all()
    
    @staticmethod
    def create(db: Session, username: str, email: str, full_name: str, 
               password: str, role: UserRole = UserRole.OPERATOR) -> User:
        """Создать нового пользователя"""
        hashed_password = get_password_hash(password)
        user = User(
            username=username,
            email=email,
            full_name=full_name,
            hashed_password=hashed_password,
            role=role
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def update(db: Session, user_id: int, **kwargs) -> Optional[User]:
        """Обновить пользователя"""
        user = UserService.get_by_id(db, user_id)
        if not user:
            return None
        
        for key, value in kwargs.items():
            if key == 'password':
                value = get_password_hash(value)
                setattr(user, 'hashed_password', value)
            elif hasattr(user, key):
                setattr(user, key, value)
        
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def delete(db: Session, user_id: int) -> bool:
        """Мягкое удаление (деактивация) пользователя"""
        user = UserService.get_by_id(db, user_id)
        if not user:
            return False
        user.is_active = False
        user.updated_at = datetime.utcnow()
        db.commit()
        return True
    
    @staticmethod
    def activate(db: Session, user_id: int) -> Optional[User]:
        """Активировать пользователя"""
        user = UserService.get_by_id(db, user_id)
        if not user:
            return None
        user.is_active = True
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def authenticate(db: Session, username: str, password: str) -> Optional[User]:
        """Аутентификация пользователя"""
        user = UserService.get_by_username(db, username)
        if not user or not verify_password(password, user.hashed_password):
            return None
        if not user.is_active:
            return None
        return user