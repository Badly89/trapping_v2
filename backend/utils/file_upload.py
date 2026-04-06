# utils/file_upload.py - Загрузка файлов
import os
import shutil
from datetime import datetime
from typing import List
from fastapi import UploadFile


UPLOAD_DIR = "uploads"

def ensure_upload_dir():
    """Создать директорию для загрузок, если её нет"""
    os.makedirs(UPLOAD_DIR, exist_ok=True)

def save_upload_file(file: UploadFile, subdir: str = "") -> str:
    """Сохранить загруженный файл и вернуть путь к нему"""
    ensure_upload_dir()
    
    # Создаем поддиректорию если нужно
    target_dir = os.path.join(UPLOAD_DIR, subdir) if subdir else UPLOAD_DIR
    os.makedirs(target_dir, exist_ok=True)
    
    # Генерируем уникальное имя файла
    timestamp = int(datetime.utcnow().timestamp())
    safe_filename = f"{timestamp}_{file.filename.replace(' ', '_')}"
    file_path = os.path.join(target_dir, safe_filename)
    
    # Сохраняем файл
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return f"/uploads/{subdir}/{safe_filename}" if subdir else f"/uploads/{safe_filename}"

def save_multiple_files(files: List[UploadFile], subdir: str = "") -> List[str]:
    """Сохранить несколько файлов и вернуть список путей"""
    return [save_upload_file(file, subdir) for file in files if file and file.filename]

def delete_upload_file(file_path: str) -> bool:
    """Удалить загруженный файл"""
    try:
        # Преобразуем URL путь в системный
        if file_path.startswith('/uploads/'):
            file_path = file_path.replace('/uploads/', UPLOAD_DIR + '/')
        
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False
    except Exception:
        return False

def get_file_path(url_path: str) -> str:
    """Получить системный путь из URL"""
    if url_path.startswith('/uploads/'):
        return os.path.join(UPLOAD_DIR, url_path.replace('/uploads/', ''))
    return url_path