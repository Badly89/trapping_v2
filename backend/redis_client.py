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

def store_verification_code(username: str, code: str, chat_id: str, expires_in: int = 300):
    """Сохранить код верификации в Redis по username"""
    key = f"verification:{username}"
    data = {
        "code": code,
        "chat_id": chat_id,
        "username": username
    }
    redis_client.setex(key, expires_in, json.dumps(data))
    print(f"✅ Код сохранен в Redis для {username}")
    return True

def verify_code(username: str, code: str):
    """Проверить код верификации в Redis по username"""
    key = f"verification:{username}"
    data = redis_client.get(key)
    
    if data:
        stored = json.loads(data)
        if stored.get("code") == code:
            chat_id = stored.get("chat_id")
            redis_client.delete(key)
            return True, chat_id
    
    return False, None