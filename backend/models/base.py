# models/base.py - Базовая конфигурация БД
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Конфигурация базы данных MariaDB
DATABASE_URL = f"mysql+pymysql://{os.getenv('DB_USER', 'crm_user')}:{os.getenv('DB_PASSWORD', 'crm_password')}@{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '3306')}/{os.getenv('DB_NAME', 'crm_db')}?charset=utf8mb4"

engine = create_engine(DATABASE_URL, pool_pre_ping=True, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()