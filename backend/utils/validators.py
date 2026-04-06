# utils/validators.py - Валидаторы
import re
from typing import Tuple, Optional


def validate_coordinates(latitude: float, longitude: float) -> Tuple[bool, Optional[str]]:
    """Проверить корректность координат"""
    if latitude is None or longitude is None:
        return False, "Координаты не указаны"
    
    if not isinstance(latitude, (int, float)) or not isinstance(longitude, (int, float)):
        return False, "Неверный формат координат"
    
    if latitude < -90 or latitude > 90:
        return False, "Широта должна быть в диапазоне от -90 до 90"
    
    if longitude < -180 or longitude > 180:
        return False, "Долгота должна быть в диапазоне от -180 до 180"
    
    return True, None

def validate_phone(phone: str) -> bool:
    """Проверить корректность номера телефона"""
    # Удаляем все нецифровые символы
    cleaned = re.sub(r'\D', '', phone)
    
    # Проверяем длину (10-15 цифр)
    if len(cleaned) < 10 or len(cleaned) > 15:
        return False
    
    return True

def validate_email(email: str) -> bool:
    """Проверить корректность email"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def validate_username(username: str) -> Tuple[bool, Optional[str]]:
    """Проверить корректность имени пользователя"""
    if not username or len(username) < 3:
        return False, "Имя пользователя должно содержать минимум 3 символа"
    
    if len(username) > 50:
        return False, "Имя пользователя не должно превышать 50 символов"
    
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        return False, "Имя пользователя может содержать только буквы, цифры и подчеркивания"
    
    return True, None

def validate_password(password: str) -> Tuple[bool, Optional[str]]:
    """Проверить корректность пароля"""
    if not password or len(password) < 6:
        return False, "Пароль должен содержать минимум 6 символов"
    
    return True, None

def validate_text_length(text: str, max_length: int = 5000) -> Tuple[bool, Optional[str]]:
    """Проверить длину текста"""
    if text and len(text) > max_length:
        return False, f"Текст не должен превышать {max_length} символов"
    
    return True, None