# utils/helpers.py - Вспомогательные функции
from datetime import datetime
from typing import Optional


def generate_map_links(latitude: float, longitude: float) -> dict:
    """Сгенерировать ссылки на карты"""
    return {
        "yandex": f"https://yandex.ru/maps/?pt={longitude},{latitude}&z=17&l=map",
        "google": f"https://www.google.com/maps?q={latitude},{longitude}",
        "openstreet": f"https://www.openstreetmap.org/?mlat={latitude}&mlon={longitude}&zoom=17"
    }

def format_datetime(dt: datetime, format_str: str = "%Y-%m-%d %H:%M:%S") -> str:
    """Форматировать дату и время"""
    if dt is None:
        return ""
    return dt.strftime(format_str)

def calculate_response_time(created_at: datetime, resolved_at: datetime) -> Optional[int]:
    """Рассчитать время ответа в секундах"""
    if created_at and resolved_at:
        return int((resolved_at - created_at).total_seconds())
    return None

def format_response_time(seconds: int) -> str:
    """Форматировать время ответа в человекочитаемый формат"""
    if seconds is None:
        return "Не определено"
    
    if seconds < 60:
        return f"{seconds} сек"
    elif seconds < 3600:
        minutes = seconds // 60
        return f"{minutes} мин"
    elif seconds < 86400:
        hours = seconds // 3600
        return f"{hours} ч"
    else:
        days = seconds // 86400
        return f"{days} дн"

def truncate_text(text: str, max_length: int = 100) -> str:
    """Обрезать текст до указанной длины"""
    if not text:
        return ""
    if len(text) <= max_length:
        return text
    return text[:max_length] + "..."

def safe_get(dictionary: dict, key: str, default=None):
    """Безопасно получить значение из словаря"""
    return dictionary.get(key, default)