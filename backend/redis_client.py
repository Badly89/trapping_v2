# backend/redis_client.py
import redis
import os
import json

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

redis_client = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    decode_responses=True
)

def store_verification_code(email: str, code: str, chat_id: str, expires_in: int = 300):
    """Сохранить код верификации в Redis по email"""
    key = f"verification:{email}"
    data = {
        "code": code,
        "chat_id": chat_id,
        "email": email
    }
    redis_client.setex(key, expires_in, json.dumps(data))
    print(f"✅ Код сохранен в Redis для {email}")
    return True

def verify_code(email: str, code: str):
    """Проверить код верификации в Redis по email"""
    key = f"verification:{email}"
    data = redis_client.get(key)
    
    print(f"🔍 Поиск ключа: {key}")
    
    if data:
        stored = json.loads(data)
        if stored.get("code") == code:
            chat_id = stored.get("chat_id")
            redis_client.delete(key)
            print(f"✅ Код верный для {email}")
            return True, chat_id
        else:
            print(f"❌ Код не совпадает для {email}")
    else:
        print(f"❌ Ключ {key} не найден")
    
    return False, None