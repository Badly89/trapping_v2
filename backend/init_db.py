# init_db.py - Инициализация базы данных
from models import engine, Base, SessionLocal, User, UserRole
from auth import get_password_hash

def init_database():
    # Создание таблиц
    Base.metadata.create_all(bind=engine)
    print("✅ Таблицы созданы")
    
    db = SessionLocal()
    
    try:
        # Создание администратора
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            admin = User(
                username="admin",
                email="admin@crm.local",
                full_name="Главный администратор",
                hashed_password=get_password_hash("admin123"),
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin)
            print("✅ Создан администратор: admin / admin123")
        
        # Создание оператора
        operator = db.query(User).filter(User.username == "operator").first()
        if not operator:
            operator = User(
                username="operator",
                email="operator@crm.local",
                full_name="Оператор CRM",
                hashed_password=get_password_hash("operator123"),
                role=UserRole.OPERATOR,
                is_active=True
            )
            db.add(operator)
            print("✅ Создан оператор: operator / operator123")
        
        # Создание исполнителя
        executor = db.query(User).filter(User.username == "executor").first()
        if not executor:
            executor = User(
                username="executor",
                email="executor@crm.local",
                full_name="Исполнитель",
                hashed_password=get_password_hash("executor123"),
                role=UserRole.EXECUTOR,
                is_active=True
            )
            db.add(executor)
            print("✅ Создан исполнитель: executor / executor123")
        
        db.commit()
        print("✅ Инициализация завершена")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_database()