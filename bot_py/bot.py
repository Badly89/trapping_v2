# bot.py - Исправленная работа с временем
import os
import json
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional, Any
from dotenv import load_dotenv

# Загружаем конфигурацию
load_dotenv()

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("bot.log", encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Импортируем maxapi
from maxapi import Bot, Dispatcher, F
from maxapi.types import (
    MessageCreated, BotStarted, MessageCallback, Command,
    CallbackButton, ButtonsPayload, Attachment, BotCommand,
    RequestGeoLocationButton
)
from maxapi.enums.intent import Intent
from maxapi.enums.parse_mode import ParseMode

# Конфигурация
MAX_BOT_TOKEN = os.getenv("MAX_BOT_TOKEN")
CRM_API_URL = os.getenv("CRM_API_URL", "http://localhost:8000/api/messages")

if not MAX_BOT_TOKEN:
    logger.error("MAX_BOT_TOKEN не найден в .env")
    exit(1)

# Создаём экземпляры бота и диспетчера
bot = Bot(token=MAX_BOT_TOKEN)
dp = Dispatcher()

# Директория для сохранения фото
PHOTOS_DIR = "downloaded_photos"
os.makedirs(PHOTOS_DIR, exist_ok=True)

# ==================== РАБОТА С ВРЕМЕНЕМ ====================

# Часовой пояс Екатеринбурга (UTC+5)
YEKATERINBURG_TZ = timezone(timedelta(hours=5))

def get_yekaterinburg_time() -> datetime:
    """Возвращает текущее время в Екатеринбурге (UTC+5) с часовым поясом"""
    return datetime.now(YEKATERINBURG_TZ)

def format_yekaterinburg_time(dt: datetime = None) -> str:
    """Форматирует время Екатеринбурга в читаемый формат"""
    if dt is None:
        dt = get_yekaterinburg_time()
    return dt.strftime("%Y-%m-%d %H:%M:%S")

def format_yekaterinburg_datetime(dt: datetime = None) -> str:
    """Форматирует дату и время для отображения"""
    if dt is None:
        dt = get_yekaterinburg_time()
    return dt.strftime("%d.%m.%Y %H:%M:%S")

def format_yekaterinburg_time_short(dt: datetime = None) -> str:
    """Короткий формат времени"""
    if dt is None:
        dt = get_yekaterinburg_time()
    return dt.strftime("%H:%M:%S")

def get_iso_with_tz(dt: datetime = None) -> str:
    """Возвращает ISO формат с часовым поясом для CRM"""
    if dt is None:
        dt = get_yekaterinburg_time()
    return dt.isoformat()

# ==================== ОСТАЛЬНЫЕ ФУНКЦИИ ====================

def generate_map_links(lat: float, lon: float) -> Dict[str, str]:
    """Генерация ссылок на карты"""
    return {
        "yandex": f"https://yandex.ru/maps/?pt={lon},{lat}&z=17&l=map",
        "google": f"https://www.google.com/maps?q={lat},{lon}"
    }

async def save_to_crm(message_data: Dict[str, Any]) -> bool:
    """Сохранение сообщения в CRM"""
    import aiohttp
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                CRM_API_URL,
                json=message_data,
                headers={"Content-Type": "application/json"},
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    logger.info(f"✅ Сообщение сохранено в CRM, ID: {data.get('id')}")
                    return True
                else:
                    logger.error(f"❌ Ошибка CRM: {response.status}")
                    return False
    except Exception as e:
        logger.error(f"❌ Ошибка отправки в CRM: {e}")
        return False

async def upload_photo_to_max(file_content: bytes, filename: str) -> Optional[str]:
    """Загружает изображение в MAX и возвращает постоянный URL"""
    import aiohttp
    
    try:
        async with aiohttp.ClientSession() as session:
            logger.info(f"📤 Запрос URL для загрузки...")
            async with session.post(
                "https://platform-api.max.ru/uploads?type=image",
                headers={"Authorization": MAX_BOT_TOKEN}
            ) as upload_url_response:
                if upload_url_response.status != 200:
                    logger.error(f"❌ Ошибка получения URL: {upload_url_response.status}")
                    return None
                
                upload_data = await upload_url_response.json()
                upload_url = upload_data.get("url")
                
                if not upload_url:
                    logger.error("❌ Нет URL в ответе")
                    return None
                
                form_data = aiohttp.FormData()
                form_data.add_field("data", file_content, filename=filename)
                
                async with session.post(upload_url, data=form_data) as upload_response:
                    if upload_response.status != 200:
                        logger.error(f"❌ Ошибка загрузки: {upload_response.status}")
                        return None
                    
                    result = await upload_response.json()
                    photo_url = result.get("url") or result.get("link")
                    
                    if photo_url:
                        logger.info(f"✅ Фото загружено в MAX")
                        return photo_url
                    else:
                        logger.error(f"❌ Неожиданный ответ: {result}")
                        return None
                            
    except Exception as e:
        logger.error(f"❌ Ошибка загрузки: {e}")
        return None

async def get_photo_url(attachment) -> Optional[str]:
    """Получает URL фото из вложения"""
    if hasattr(attachment, 'model_dump'):
        att_data = attachment.model_dump()
    elif hasattr(attachment, 'dict'):
        att_data = attachment.dict()
    else:
        att_data = {}
    
    payload = att_data.get('payload', {})
    
    direct_url = payload.get('url')
    if direct_url:
        logger.info(f"📷 Найден прямой URL")
        return direct_url
    
    photo_id = payload.get('photo_id')
    if photo_id:
        logger.info(f"📷 Найден photo_id: {photo_id}")
        import aiohttp
        import aiofiles
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"https://platform-api.max.ru/files/{photo_id}",
                    headers={"Authorization": MAX_BOT_TOKEN}
                ) as file_response:
                    if file_response.status != 200:
                        logger.error(f"❌ Ошибка получения файла: {file_response.status}")
                        return None
                    
                    file_content = await file_response.read()
                    logger.info(f"✅ Файл скачан: {len(file_content)} байт")
                    
                    local_path = os.path.join(PHOTOS_DIR, f"{photo_id}.jpg")
                    async with aiofiles.open(local_path, 'wb') as f:
                        await f.write(file_content)
                    logger.info(f"💾 Файл сохранен локально: {local_path}")
                    
                    return await upload_photo_to_max(file_content, f"{photo_id}.jpg")
        except Exception as e:
            logger.error(f"❌ Ошибка при обработке photo_id: {e}")
            return None
    
    file_id = payload.get('file_id') or att_data.get('id')
    if file_id:
        logger.info(f"📷 Найден file_id: {file_id}")
        import aiohttp
        import aiofiles
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"https://platform-api.max.ru/files/{file_id}",
                    headers={"Authorization": MAX_BOT_TOKEN}
                ) as file_response:
                    if file_response.status != 200:
                        logger.error(f"❌ Ошибка получения файла: {file_response.status}")
                        return None
                    
                    file_content = await file_response.read()
                    logger.info(f"✅ Файл скачан: {len(file_content)} байт")
                    
                    local_path = os.path.join(PHOTOS_DIR, f"{file_id}.jpg")
                    async with aiofiles.open(local_path, 'wb') as f:
                        await f.write(file_content)
                    logger.info(f"💾 Файл сохранен локально: {local_path}")
                    
                    return await upload_photo_to_max(file_content, f"{file_id}.jpg")
        except Exception as e:
            logger.error(f"❌ Ошибка при обработке file_id: {e}")
            return None
    
    logger.warning(f"⚠️ Не удалось получить URL для фото, payload: {payload}")
    return None

# ==================== КНОПКИ ====================

def create_main_menu() -> Attachment:
    buttons = ButtonsPayload(buttons=[
        [
            CallbackButton(text="📸 Отправить фото", payload="send_photo", intent=Intent.DEFAULT),
            CallbackButton(text="📍 Отправить геолокацию", payload="send_location", intent=Intent.DEFAULT)
        ],
        [
            CallbackButton(text="ℹ️ Информация", payload="info", intent=Intent.DEFAULT),
            CallbackButton(text="📋 Правила", payload="rules", intent=Intent.DEFAULT)
        ],
        [
            CallbackButton(text="❓ Помощь", payload="help", intent=Intent.POSITIVE)
        ]
    ])
    return Attachment(type="inline_keyboard", payload=buttons)

def create_location_keyboard() -> Attachment:
    buttons = ButtonsPayload(buttons=[
        [RequestGeoLocationButton(text="📍 Отправить мою геолокацию", quick=True)],
        [CallbackButton(text="◀️ Назад", payload="back_to_main", intent=Intent.DEFAULT)]
    ])
    return Attachment(type="inline_keyboard", payload=buttons)

# ==================== ОБРАБОТЧИКИ ====================

@dp.bot_started()
async def handle_bot_started(event: BotStarted):
    user = event.user
    name = getattr(user, 'first_name', None) or getattr(user, 'full_name', 'друг')
    
    await bot.send_message(
        chat_id=event.chat_id,
        text=f"👋 Привет, {name}!\n\n"
             "📢 Данный бот предназначен для фиксации нанесенных надписей по распространению наркотиков\n\n"
             "📸 Отправьте фото с местом нанесения надписи\n"
             "📍 Отправьте геолокацию места нанесения\n"
             "📝 Укажите адрес в описании\n\n"
             "Спасибо за активную гражданскую позицию! 🙏",
        attachments=[create_main_menu()]
    )

@dp.message_created(Command('start'))
async def cmd_start(event: MessageCreated):
    user = event.message.sender
    name = getattr(user, 'first_name', 'друг')
    await bot.send_message(
        chat_id=event.message.recipient.chat_id,
        text=f"👋 Привет, {name}!",
        attachments=[create_main_menu()]
    )

# ==================== ОБРАБОТКА КНОПОК ====================

@dp.message_callback(F.callback.payload == "send_photo")
async def callback_send_photo(event: MessageCallback):
    await event.answer(notification="📸 Режим отправки фото")
    await bot.send_message(
        chat_id=event.message.recipient.chat_id,
        text="📸 Пожалуйста, отправьте фото с местом нанесения надписи и укажите адрес в описании."
    )

@dp.message_callback(F.callback.payload == "send_location")
async def callback_send_location(event: MessageCallback):
    await event.answer(notification="📍 Режим отправки геолокации")
    await bot.send_message(
        chat_id=event.message.recipient.chat_id,
        text="📍 Нажмите кнопку ниже, чтобы отправить ваше местоположение:",
        attachments=[create_location_keyboard()]
    )

@dp.message_callback(F.callback.payload == "back_to_main")
async def callback_back_to_main(event: MessageCallback):
    await event.answer(notification="◀️ Главное меню")
    await event.message.edit(
        text="Выберите действие:",
        attachments=[create_main_menu()]
    )

@dp.message_callback(F.callback.payload == "info")
async def callback_info(event: MessageCallback):
    await event.answer(notification="ℹ️ Информация")
    await bot.send_message(
        chat_id=event.message.recipient.chat_id,
        text="📢 Бот для фиксации надписей по распространению наркотиков.\n\n"
             "Отправьте фото и геолокацию места нанесения.",
        attachments=[create_main_menu()]
    )

@dp.message_callback(F.callback.payload == "rules")
async def callback_rules(event: MessageCallback):
    await event.answer(notification="📋 Правила")
    await bot.send_message(
        chat_id=event.message.recipient.chat_id,
        text="📋 **Правила:**\n\n"
             "1. Отправляйте только четкие фото\n"
             "2. Указывайте адрес или геолокацию\n"
             "3. Данные конфиденциальны",
        parse_mode=ParseMode.MARKDOWN
    )

@dp.message_callback(F.callback.payload == "help")
async def callback_help(event: MessageCallback):
    await event.answer(notification="❓ Помощь")
    await bot.send_message(
        chat_id=event.message.recipient.chat_id,
        text="❓ **Помощь:**\n\n"
             "📸 Отправить фото - нажмите кнопку и выберите фото\n"
             "📍 Отправить геолокацию - нажмите и подтвердите отправку\n\n"
             "💡 Можно отправить фото и геолокацию в одном сообщении!",
        parse_mode=ParseMode.MARKDOWN
    )

# ==================== ОСНОВНОЙ ОБРАБОТЧИК ====================

@dp.message_created()
async def handle_message(event: MessageCreated):
    """Обработка всех входящих сообщений (фото, геолокация, текст)"""
    message = event.message
    user = message.sender
    chat_id = message.recipient.chat_id
    
    # Получаем текст
    text = getattr(message.body, 'text', '') or ''
    logger.info(f"📨 Сообщение от {user.user_id}: текст='{text[:50] if text else 'Нет'}'")
    
    if text and text.startswith('/'):
        return
    
    # Получаем текущее время в Екатеринбурге
    now = get_yekaterinburg_time()
    time_str = format_yekaterinburg_datetime(now)
    time_short = format_yekaterinburg_time_short(now)
    
    logger.info(f"🕐 Текущее время (Екатеринбург): {time_str}")
    
    # Получаем вложения
    attachments = getattr(message.body, 'attachments', [])
    logger.info(f"📎 Вложений: {len(attachments)}")
    
    photo_urls = []
    latitude = None
    longitude = None
    
    for att in attachments:
        att_type = getattr(att, 'type', None)
        logger.info(f"📎 Тип вложения: {att_type}")
        
        if att_type == 'image':
            photo_url = await get_photo_url(att)
            if photo_url:
                photo_urls.append(photo_url)
                logger.info(f"✅ Фото обработано")
                    
        elif att_type == 'location':
            try:
                latitude = getattr(att, 'lat', None)
                longitude = getattr(att, 'lon', None)
                
                if not latitude:
                    latitude = getattr(att, 'latitude', None)
                if not longitude:
                    longitude = getattr(att, 'longitude', None)
                
                logger.info(f"📍 Геолокация: lat={latitude}, lon={longitude}")
            except Exception as e:
                logger.error(f"❌ Ошибка обработки геолокации: {e}")
                latitude = None
                longitude = None
    
    # Формируем текст
    full_text = text or ''
    if latitude and longitude:
        maps = generate_map_links(latitude, longitude)
        full_text += (full_text and '\n\n' or '') + f"📍 **Геолокация:**\n"
        full_text += f"🗺️ [Яндекс.Карты]({maps['yandex']})\n"
        full_text += f"🗺️ [Google Maps]({maps['google']})\n"
        full_text += f"📌 Координаты: {latitude:.6f}, {longitude:.6f}"
    
    # Отправляем в CRM
    if full_text or photo_urls:
        crm_payload = {
            "source": "max",
            "chat_id": str(chat_id),
            "user_id": str(user.user_id),
            "user_name": getattr(user, 'full_name', None) or getattr(user, 'first_name', 'Unknown'),
            "text": full_text,
            "photos": photo_urls,
            "latitude": latitude,
            "longitude": longitude,
            "received_at": get_iso_with_tz(now)
        }
        
        logger.info(f"📤 Отправка в CRM: фото={len(photo_urls)}, гео={latitude is not None}")
        logger.info(f"🕐 Время отправки: {time_str}")
        
        saved = await save_to_crm(crm_payload)
        
        if saved:
            reply = f"✅ Сообщение принято!\n🕐 {time_str}"
            if photo_urls:
                reply += f"\n📷 Фото: {len(photo_urls)}"
            if latitude:
                reply += f"\n📍 Геолокация получена"
            await bot.send_message(chat_id=chat_id, text=reply, attachments=[create_main_menu()])
        else:
            await bot.send_message(chat_id=chat_id, text="❌ Ошибка, попробуйте позже.", attachments=[create_main_menu()])
    else:
        await bot.send_message(chat_id=chat_id, text="Используйте кнопки меню.", attachments=[create_main_menu()])

# ==================== ЗАПУСК ====================

async def main():
    # Выводим информацию о времени при запуске
    now = get_yekaterinburg_time()
    
    print("\n" + "=" * 60)
    print("🚀 ЗАПУСК БОТА (maxapi)")
    print(f"📁 Фото: {PHOTOS_DIR}")
    print(f"🔗 CRM: {CRM_API_URL}")
    print(f"🕐 Текущее время (Екатеринбург): {format_yekaterinburg_datetime(now)}")
    print("=" * 60 + "\n")
    
    await bot.delete_webhook()
    logger.info("✅ Бот запущен")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())