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

def store_verification_code(user_id: int, code: str, chat_id: str, expires_in: int = 300):
    """Сохранить код верификации в Redis (на 5 минут)"""
    key = f"verification:{user_id}"
    data = {
        "code": code,
        "chat_id": chat_id,
        "user_id": user_id
    }
    redis_client.setex(key, expires_in, json.dumps(data))
    print(f"✅ Код {code} сохранен в Redis для пользователя {user_id}")
    return True

def verify_code(user_id: int, code: str):
    """Проверить код верификации в Redis"""
    key = f"verification:{user_id}"
    data = redis_client.get(key)
    
    print(f"🔍 Redis ключ: {key}")
    print(f"🔍 Данные в Redis: {data}")
    
    if data:
        stored = json.loads(data)
        print(f"🔍 Хранимый код: {stored.get('code')}, полученный: {code}")
        if stored.get("code") == code:
            chat_id = stored.get("chat_id")
            redis_client.delete(key)
            print(f"✅ Код верный, удаляем из Redis")
            return True, chat_id
        else:
            print(f"❌ Код не совпадает")
    else:
        print(f"❌ Ключ {key} не найден в Redis")
    
    return False, None