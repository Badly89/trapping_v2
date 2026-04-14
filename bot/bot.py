# bot.py - Адаптированная версия с поддержкой составных сообщений
import random
import string
import os
import json
import asyncio
import logging
import aiohttp
import aiofiles
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional, Any, List, Tuple
from enum import Enum
from dotenv import load_dotenv

# Загружаем конфигурацию
load_dotenv()

# Хранилище кодов верификации
verification_codes = {}

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
CRM_API_URL = os.getenv("CRM_API_URL", "http://10.87.0.59:6005/api/messages")

if not MAX_BOT_TOKEN:
    logger.error("MAX_BOT_TOKEN не найден в .env")
    exit(1)

# Создаём экземпляры бота и диспетчера
bot = Bot(token=MAX_BOT_TOKEN)
dp = Dispatcher()

# Директория для сохранения фото
PHOTOS_DIR = "downloaded_photos"
os.makedirs(PHOTOS_DIR, exist_ok=True)

# ==================== СОСТОЯНИЯ ДЛЯ СОСТАВНЫХ СООБЩЕНИЙ ====================

class ComposeState(Enum):
    """Состояния составного сообщения"""
    IDLE = "idle"
    AWAITING_PHOTO = "awaiting_photo"
    AWAITING_LOCATION = "awaiting_location"
    AWAITING_TEXT = "awaiting_text"
    COMPOSING = "composing"

# Хранилище временных данных для составных сообщений
user_compose_data: Dict[int, Dict[str, Any]] = {}

def get_compose_data(user_id: int) -> Dict[str, Any]:
    """Получить данные составного сообщения пользователя"""
    if user_id not in user_compose_data:
        user_compose_data[user_id] = {
            'photos': [],
            'location': None,
            'text': '',
            'state': ComposeState.IDLE
        }
    return user_compose_data[user_id]

def clear_compose_data(user_id: int):
    """Очистить данные составного сообщения"""
    if user_id in user_compose_data:
        user_compose_data[user_id] = {
            'photos': [],
            'location': None,
            'text': '',
            'state': ComposeState.IDLE
        }

# ==================== РАБОТА С ВРЕМЕНЕМ ====================

# Часовой пояс Екатеринбурга (UTC+5)
YEKATERINBURG_TZ = timezone(timedelta(hours=5))

def get_yekaterinburg_time() -> datetime:
    """Возвращает текущее время в Екатеринбурге (UTC+5) с часовым поясом"""
    return datetime.now(YEKATERINBURG_TZ)

def format_yekaterinburg_datetime(dt: datetime = None) -> str:
    """Форматирует дату и время для отображения"""
    if dt is None:
        dt = get_yekaterinburg_time()
    return dt.strftime("%d.%m.%Y %H:%M:%S")

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
        }

async def save_to_crm(message_data: Dict[str, Any]) -> bool:
    """Сохранение сообщения в CRM"""
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
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://platform-api.max.ru/uploads?type=image",
                headers={"Authorization": MAX_BOT_TOKEN}
            ) as upload_url_response:
                if upload_url_response.status != 200:
                    return None
                
                upload_data = await upload_url_response.json()
                upload_url = upload_data.get("url")
                if not upload_url:
                    return None
                
                form_data = aiohttp.FormData()
                form_data.add_field("data", file_content, filename=filename)
                
                async with session.post(upload_url, data=form_data) as upload_response:
                    if upload_response.status != 200:
                        return None
                    result = await upload_response.json()
                    return result.get("url") or result.get("link")
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
        return direct_url
    
    photo_id = payload.get('photo_id')
    if photo_id:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"https://platform-api.max.ru/files/{photo_id}",
                    headers={"Authorization": MAX_BOT_TOKEN}
                ) as file_response:
                    if file_response.status != 200:
                        return None
                    file_content = await file_response.read()
                    return await upload_photo_to_max(file_content, f"{photo_id}.jpg")
        except Exception:
            return None
    
    file_id = payload.get('file_id') or att_data.get('id')
    if file_id:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"https://platform-api.max.ru/files/{file_id}",
                    headers={"Authorization": MAX_BOT_TOKEN}
                ) as file_response:
                    if file_response.status != 200:
                        return None
                    file_content = await file_response.read()
                    return await upload_photo_to_max(file_content, f"{file_id}.jpg")
        except Exception:
            return None
    
    return None

# ==================== КНОПКИ ====================

def create_compose_keyboard(has_photo: bool = False, has_location: bool = False, has_text: bool = False) -> Attachment:
    """Клавиатура для составного сообщения с отображением текущего состояния"""
    buttons = []
    
    # Статус текущего сообщения
    status_row = []
    if has_photo:
        status_row.append(CallbackButton(text="✅ Фото", payload="status_photo", intent=Intent.POSITIVE))
    else:
        status_row.append(CallbackButton(text="📸 Добавить фото", payload="add_photo", intent=Intent.DEFAULT))
    
    if has_location:
        status_row.append(CallbackButton(text="✅ Гео", payload="status_location", intent=Intent.POSITIVE))
    else:
        status_row.append(CallbackButton(text="📍 Добавить гео", payload="add_location", intent=Intent.DEFAULT))
    
    if has_text:
        status_row.append(CallbackButton(text="✅ Текст", payload="status_text", intent=Intent.POSITIVE))
    else:
        status_row.append(CallbackButton(text="📝 Добавить текст", payload="add_text", intent=Intent.DEFAULT))
    
    buttons.append(status_row)
    buttons.append([
        CallbackButton(text="✅ Отправить всё", payload="send_all", intent=Intent.POSITIVE),
        CallbackButton(text="🗑️ Очистить", payload="clear_all", intent=Intent.NEGATIVE)
    ])
    buttons.append([
        CallbackButton(text="◀️ Главное меню", payload="back_to_main", intent=Intent.DEFAULT)
    ])
    
    return Attachment(type="inline_keyboard", payload=ButtonsPayload(buttons=buttons))

def create_main_menu() -> Attachment:
    buttons = ButtonsPayload(buttons=[
        [
            CallbackButton(text="📝 Новое сообщение", payload="new_message", intent=Intent.POSITIVE)
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
        [CallbackButton(text="◀️ Назад", payload="back_to_compose", intent=Intent.DEFAULT)]
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
             "📢 Бот для фиксации нанесенных надписей\n\n"
             "📝 **Как отправить сообщение:**\n"
             "1. Нажмите 'Новое сообщение'\n"
             "2. Добавьте фото, геолокацию и/или текст\n"
             "3. Нажмите 'Отправить всё'\n\n"
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


@dp.message_created(Command('connect'))
async def cmd_connect(event: MessageCreated):
    """Привязка MAX аккаунта к CRM"""
    user_id = event.message.sender.user_id
    chat_id = event.message.recipient.chat_id
    # user_name = event.message.sender.name or 'Пользователь'
    
    # Исправление: используем first_name или full_name
    user = event.message.sender
    user_name = getattr(user, 'first_name', None) or getattr(user, 'full_name', None) or 'Пользователь'

    # Генерируем 6-значный код
    verification_code = ''.join(random.choices(string.digits, k=6))
    
    # Сохраняем код с временем жизни 5 минут
    verification_codes[user_id] = {
        'code': verification_code,
        'chat_id': chat_id,
        'user_name': user_name,
        'expires_at': datetime.now() + timedelta(minutes=5)
    }
    
    # Отправляем код пользователю
    await event.message.answer(
        f"🔗 **Привязка к CRM системе**\n\n"
        f"Ваш код подтверждения:\n"
        f"```\n{verification_code}\n```\n\n"
        f"Введите этот код в настройках CRM.\n"
        f"Код действителен 5 минут.\n\n"
        f"После привязки вы будете получать уведомления о:\n"
        f"• Новых сообщениях\n"
        f"• Назначенных задачах\n"
        f"• Изменении статусов",
        format=ParseMode.MARKDOWN
    )
    
    # Также отправляем в CRM для сохранения
    import aiohttp
    try:
        async with aiohttp.ClientSession() as session:
            # Здесь нужно отправить код в CRM
            pass
    except:
        pass

@dp.message_created(Command('disconnect'))
async def cmd_disconnect(event: MessageCreated):
    """Отвязка MAX аккаунта от CRM"""
    user_id = event.message.sender.user_id
    
    # Удаляем код если был
    if user_id in verification_codes:
        del verification_codes[user_id]
    
    await event.message.answer(
        "🔓 **Аккаунт отвязан от CRM**\n\n"
        "Вы больше не будете получать уведомления.\n\n"
        "Чтобы снова привязать аккаунт, используйте /connect",
        format=ParseMode.MARKDOWN
    )

@dp.message_created(Command('code'))
async def cmd_code(event: MessageCreated):
    """Повторно отправить код привязки"""
    user_id = event.message.sender.user_id
    
    if user_id in verification_codes:
        code_data = verification_codes[user_id]
        if code_data['expires_at'] > datetime.now():
            await event.message.answer(
                f"🔑 Ваш код подтверждения: `{code_data['code']}`\n\n"
                f"Действителен до: {code_data['expires_at'].strftime('%H:%M:%S')}",
                format=ParseMode.MARKDOWN
            )
        else:
            await event.message.answer(
                "❌ Код истек. Используйте /connect для получения нового кода."
            )
    else:
        await event.message.answer(
            "❌ Нет активного кода. Используйте /connect для получения нового кода."
        )

# ==================== ОБРАБОТКА КНОПОК ====================

@dp.message_callback(F.callback.payload == "new_message")
async def callback_new_message(event: MessageCallback):
    """Начать новое составное сообщение"""
    user_id = event.callback.user.user_id
    clear_compose_data(user_id)
    compose_data = get_compose_data(user_id)
    compose_data['state'] = ComposeState.COMPOSING
    
    await event.answer(notification="📝 Начинаем новое сообщение")  # Убрали show_alert
    await event.message.edit(
        text="📝 **Составление сообщения**\n\n"
             "Добавьте содержимое с помощью кнопок ниже:\n"
             "• 📸 Добавить фото\n"
             "• 📍 Добавить геолокацию\n"
             "• 📝 Добавить текст\n\n"
             "После добавления всего необходимого нажмите 'Отправить всё'",
        attachments=[create_compose_keyboard()]
    )

@dp.message_callback(F.callback.payload == "add_photo")
async def callback_add_photo(event: MessageCallback):
    """Добавить фото к сообщению"""
    user_id = event.callback.user.user_id
    compose_data = get_compose_data(user_id)
    compose_data['state'] = ComposeState.AWAITING_PHOTO
    
    await event.answer(notification="📸 Режим добавления фото")  # OK
    await bot.send_message(
        chat_id=event.message.recipient.chat_id,
        text="📸 Отправьте фото, которое хотите добавить к сообщению.\n\n"
             "После отправки фото вы вернетесь к редактированию."
    )

@dp.message_callback(F.callback.payload == "add_location")
async def callback_add_location(event: MessageCallback):
    """Добавить геолокацию к сообщению"""
    await event.answer(notification="📍 Режим добавления геолокации")
    await bot.send_message(
        chat_id=event.message.recipient.chat_id,
        text="📍 Отправьте вашу геолокацию:",
        attachments=[create_location_keyboard()]
    )

@dp.message_callback(F.callback.payload == "add_text")
async def callback_add_text(event: MessageCallback):
    """Добавить текст к сообщению"""
    user_id = event.callback.user.user_id
    compose_data = get_compose_data(user_id)
    compose_data['state'] = ComposeState.AWAITING_TEXT
    
    await event.answer(notification="📝 Режим добавления текста")
    await bot.send_message(
        chat_id=event.message.recipient.chat_id,
        text="📝 Отправьте текст, который хотите добавить к сообщению.\n\n"
             "После отправки текста вы вернетесь к редактированию."
    )

@dp.message_callback(F.callback.payload == "send_all")
async def callback_send_all(event: MessageCallback):
    """Отправить составное сообщение в CRM"""
    user_id = event.callback.user.user_id
    compose_data = get_compose_data(user_id)
    
    photos = compose_data.get('photos', [])
    location = compose_data.get('location')
    text = compose_data.get('text', '')
    
    if not photos and not location and not text:
        await event.answer(notification="❌ Нечего отправлять!")  # Убрали show_alert
        return
    
    full_text = text or ''
    if location:
        lat, lon = location
        maps = generate_map_links(lat, lon)
        full_text += (full_text and '\n\n' or '') + f"📍 **Геолокация:**\n"
        full_text += f"📌 Координаты: {lat:.6f}, {lon:.6f}"
    
    now = get_yekaterinburg_time()
    crm_payload = {
        "source": "max",
        "chat_id": str(event.message.recipient.chat_id),
        "user_id": str(user_id),
        "user_name": event.callback.user.first_name or 'Unknown',
        "text": full_text,
        "photos": photos,
        "latitude": location[0] if location else None,
        "longitude": location[1] if location else None,
        "received_at": get_iso_with_tz(now)
    }
    
    saved = await save_to_crm(crm_payload)
    
    if saved:
        clear_compose_data(user_id)
        await event.answer(notification="✅ Сообщение отправлено!")  # Убрали show_alert
        await event.message.edit(
            text=f"✅ **Сообщение успешно отправлено!**\n\n"
                 f"📷 Фото: {len(photos)}\n"
                 f"📍 Геолокация: {'Да' if location else 'Нет'}\n"
                 f"📝 Текст: {'Да' if text else 'Нет'}\n\n"
                 f"🕐 Время: {format_yekaterinburg_datetime(now)}\n\n"
                 "Вы можете создать новое сообщение через главное меню.",
            attachments=[create_main_menu()]
        )
    else:
        await event.answer(notification="❌ Ошибка отправки!")  # Убрали show_alert

@dp.message_callback(F.callback.payload == "clear_all")
async def callback_clear_all(event: MessageCallback):
    """Очистить все добавленные данные"""
    user_id = event.callback.user.user_id
    clear_compose_data(user_id)
    
    await event.answer(notification="🗑️ Все данные очищены")  # Убрали show_alert
    await event.message.edit(
        text="📝 **Составление сообщения**\n\n"
             "Все данные очищены. Добавьте содержимое с помощью кнопок:",
        attachments=[create_compose_keyboard()]
    )

@dp.message_callback(F.callback.payload == "back_to_main")
async def callback_back_to_main(event: MessageCallback):
    await event.answer(notification="◀️ Главное меню")
    await event.message.edit(
        text="👋 Главное меню",
        attachments=[create_main_menu()]
    )

@dp.message_callback(F.callback.payload == "back_to_compose")
async def callback_back_to_compose(event: MessageCallback):
    user_id = event.callback.user.user_id
    compose_data = get_compose_data(user_id)
    
    await event.answer(notification="◀️ Возврат к составлению")
    await event.message.edit(
        text="📝 **Составление сообщения**\n\n"
             "Продолжайте добавлять содержимое:",
        attachments=[create_compose_keyboard(
            has_photo=len(compose_data.get('photos', [])) > 0,
            has_location=compose_data.get('location') is not None,
            has_text=bool(compose_data.get('text', ''))
        )]
    )

@dp.message_callback(F.callback.payload == "info")
async def callback_info(event: MessageCallback):
    await event.answer(notification="ℹ️ Информация")
    await bot.send_message(
        chat_id=event.message.recipient.chat_id,
        text="📢 Бот для фиксации надписей по распространению наркотиков.\n\n"
             "Используйте кнопки для составления сообщения.",
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
        format=ParseMode.MARKDOWN
    )

@dp.message_callback(F.callback.payload == "help")
async def callback_help(event: MessageCallback):
    await event.answer(notification="❓ Помощь")
    help_text = "❓ **Помощь:**\n\n"
    help_text += "1️⃣ Нажмите 'Новое сообщение'\n"
    help_text += "2️⃣ Добавьте фото, геолокацию и текст\n"
    help_text += "3️⃣ Нажмите 'Отправить всё'\n\n"
    help_text += "💡 Можно добавлять несколько фото!"
    await bot.send_message(
        chat_id=event.message.recipient.chat_id,
        text=help_text,
        attachments=[create_main_menu()],
        format=ParseMode.MARKDOWN
    )

# ==================== ОБРАБОТКА ВХОДЯЩИХ СООБЩЕНИЙ ====================

@dp.message_created()
async def handle_message(event: MessageCreated):
    """Обработка всех входящих сообщений (фото, геолокация, текст)"""
    message = event.message
    user = message.sender
    user_id = user.user_id
    chat_id = message.recipient.chat_id
    
    text = getattr(message.body, 'text', '') or ''
    attachments = getattr(message.body, 'attachments', [])
    
    compose_data = get_compose_data(user_id)
    state = compose_data.get('state', ComposeState.IDLE)
    
    # Обработка в режиме составления сообщения
    if state != ComposeState.IDLE:
        for att in attachments:
            att_type = getattr(att, 'type', None)
            
            if att_type == 'image':
                photo_url = await get_photo_url(att)
                if photo_url:
                    compose_data['photos'].append(photo_url)
                    logger.info(f"📷 Добавлено фото, всего: {len(compose_data['photos'])}")
                    await bot.send_message(
                        chat_id=chat_id,
                        text=f"✅ Фото добавлено! Всего фото: {len(compose_data['photos'])}\n\n"
                             "Продолжайте добавлять содержимое или нажмите 'Отправить всё'",
                        attachments=[create_compose_keyboard(
                            has_photo=len(compose_data['photos']) > 0,
                            has_location=compose_data['location'] is not None,
                            has_text=bool(compose_data['text'])
                        )]
                    )
            
            elif att_type == 'location':
                lat = getattr(att, 'lat', None) or getattr(att, 'latitude', None)
                lon = getattr(att, 'lon', None) or getattr(att, 'longitude', None)
                if lat and lon:
                    compose_data['location'] = (lat, lon)
                    logger.info(f"📍 Добавлена геолокация: {lat}, {lon}")
                    await bot.send_message(
                        chat_id=chat_id,
                        text=f"✅ Геолокация добавлена!\n\n"
                             "Продолжайте добавлять содержимое или нажмите 'Отправить всё'",
                        attachments=[create_compose_keyboard(
                            has_photo=len(compose_data['photos']) > 0,
                            has_location=True,
                            has_text=bool(compose_data['text'])
                        )]
                    )
        
        if text and state == ComposeState.AWAITING_TEXT:
            compose_data['text'] = text
            logger.info(f"📝 Добавлен текст: {text[:50]}...")
            await bot.send_message(
                chat_id=chat_id,
                text=f"✅ Текст добавлен!\n\n"
                     f"📝 \"{text[:100]}{'...' if len(text) > 100 else ''}\"\n\n"
                     "Продолжайте добавлять содержимое или нажмите 'Отправить всё'",
                attachments=[create_compose_keyboard(
                    has_photo=len(compose_data['photos']) > 0,
                    has_location=compose_data['location'] is not None,
                    has_text=True
                )]
            )
        
        compose_data['state'] = ComposeState.COMPOSING
        return
    
    # Обычный режим - показываем меню
    if not attachments and not text:
        await bot.send_message(
            chat_id=chat_id,
            text="Используйте кнопки для взаимодействия.",
            attachments=[create_main_menu()]
        )

# ==================== ЗАПУСК ====================

async def main():
    """Запуск бота"""
    print("\n" + "=" * 60)
    print("🚀 ЗАПУСК БОТА (maxapi)")
    print(f"📁 Фото: {PHOTOS_DIR}")
    print(f"🔗 CRM: {CRM_API_URL}")
    print("=" * 60 + "\n")
    
    try:
        await bot.delete_webhook()
        logger.info("✅ Бот запущен")
        
        # Запускаем polling
        polling_task = asyncio.create_task(dp.start_polling(bot))
        
        # Ждем завершения
        await polling_task
        
    except asyncio.CancelledError:
        logger.info("👋 Задача отменена")
    except KeyboardInterrupt:
        logger.info("👋 Остановка пользователем")
    finally:
        # Корректное закрытие
        logger.info("🔄 Закрытие соединений...")
        
        # Отменяем все задачи
        for task in asyncio.all_tasks():
            if task is not asyncio.current_task():
                task.cancel()
                try:
                    await task
                except:
                    pass
        
        # Закрываем сессию бота
        try:
            await bot.session.close()
            logger.info("✅ Сессия закрыта")
        except:
            pass

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Бот остановлен")
    except Exception as e:
        print(f"\n❌ Критическая ошибка: {e}")