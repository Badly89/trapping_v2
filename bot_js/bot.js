// bot.js - Адаптирован под CRM на порту 6005
const { Bot, Keyboard } = require('@maxhub/max-bot-api');
const axios = require('axios');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

// Конфигурация
const BOT_TOKEN = process.env.BOT_TOKEN;
const CRM_API_URL = 'http://localhost:6005/api/messages';  // правильный эндпоинт

// Часовой пояс Екатеринбурга (UTC+5)
const YEKATERINBURG_OFFSET = 5 * 60 * 60 * 1000;

function getYekaterinburgTime() {
    const now = new Date();
    return new Date(now.getTime() + YEKATERINBURG_OFFSET);
}

function formatYekaterinburgTime(date) {
    if (!date) return null;
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Директория для сохранения фото
const PHOTOS_DIR = path.join(__dirname, 'downloaded_photos');
if (!fs.existsSync(PHOTOS_DIR)) {
    fs.mkdirSync(PHOTOS_DIR, { recursive: true });
}

if (!BOT_TOKEN) {
    console.error('❌ Токен бота не установлен!');
    process.exit(1);
}

// Тексты сообщений
const WELCOME_MESSAGE = `📢 Данный бот предназначен для фиксации нанесенных надписей по распространению наркотиков

📸 Пожалуйста, отправьте фото с местом нанесения надписи
📍 Укажите адрес в описании к фото
📝 Ваше сообщение будет передано в соответствующие органы

Спасибо за активную гражданскую позицию! 🙏`;

const RULES_MESSAGE = `📋 **Правила использования бота:**

1. 📸 Отправляйте только четкие фото надписей
2. 📍 Обязательно указывайте точный адрес места нанесения
3. 🚫 Запрещено отправлять материалы, не относящиеся к теме
4. 🔒 Ваши данные конфиденциальны
5. ⏱ Время ответа - до 24 часов

Нарушение правил может привести к блокировке.`;

const INFO_MESSAGE = WELCOME_MESSAGE;

const bot = new Bot(BOT_TOKEN);

function getMainKeyboard() {
    return Keyboard.inlineKeyboard([
        [
            Keyboard.button.callback('📸 Отправить фото', 'send_photo'),
            Keyboard.button.callback('ℹ️ Информация', 'info')
        ],
        [
            Keyboard.button.callback('📋 Правила', 'rules'),
            Keyboard.button.callback('❓ Помощь', 'help')
        ]
    ]);
}

/**
 * Сохранение сообщения в CRM (FastAPI)
 */
async function saveToCRM(messageData) {
    try {
        console.log('📤 Отправка в CRM:', JSON.stringify(messageData, null, 2));
        const response = await axios.post(CRM_API_URL, messageData, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });
        
        if (response.status === 200) {
            console.log('✅ Сообщение сохранено в CRM');
            console.log(`   ID в CRM: ${response.data.id}`);
            console.log(`   Время сохранения: ${response.data.created_at}`);
            return true;
        } else {
            console.error('❌ Ошибка CRM:', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ Ошибка отправки в CRM:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('   Убедитесь, что CRM backend запущен на порту 6005');
            console.error('   Запустите: python main.py');
        }
        if (error.response) {
            console.error('   Статус:', error.response.status);
            console.error('   Данные:', error.response.data);
        }
        return false;
    }
}

/**
 * Загрузка фото в MAX и получение постоянного URL
 */
async function uploadPhotoToMax(ctx, fileId, saveLocal = true) {
    try {
        console.log(`📥 Скачиваем файл ${fileId}...`);
        
        const fileResponse = await ctx.api.raw.get(`files/${fileId}`);
        const fileContent = Buffer.from(fileResponse.data);
        
        console.log(`✅ Файл скачан: ${fileContent.length} байт`);
        
        let localPath = null;
        if (saveLocal && fileContent.length > 0) {
            localPath = path.join(PHOTOS_DIR, `${fileId}.jpg`);
            fs.writeFileSync(localPath, fileContent);
            console.log(`💾 Файл сохранен локально: ${localPath}`);
        }
        
        console.log(`📤 Загрузка фото в MAX...`);
        const imageAttachment = await ctx.api.uploadImage({
            source: fileContent,
            filename: `${fileId}.jpg`
        });
        
        const photoUrl = imageAttachment.payload?.url || 
                        imageAttachment.url || 
                        imageAttachment.link;
        
        if (photoUrl) {
            console.log(`✅ Фото загружено в MAX`);
            console.log(`   URL: ${photoUrl.substring(0, 80)}...`);
            return {
                url: photoUrl,
                localPath: localPath
            };
        } else {
            console.error('❌ Не удалось получить URL фото');
            return null;
        }
    } catch (error) {
        console.error('❌ Ошибка при загрузке фото:', error.message);
        return null;
    }
}

// Команда /start
bot.command('start', async (ctx) => {
    console.log(`👋 Пользователь ${ctx.user?.first_name || ctx.user?.name} (ID: ${ctx.user?.user_id}) запустил бота`);
    await ctx.reply(WELCOME_MESSAGE, { attachments: [getMainKeyboard()] });
});

// Обработка кнопок
bot.action('send_photo', async (ctx) => {
    await ctx.reply('📸 Пожалуйста, отправьте фото с местом нанесения надписи и укажите адрес в описании.');
});

bot.action('info', async (ctx) => {
    await ctx.reply(INFO_MESSAGE, { attachments: [getMainKeyboard()] });
});

bot.action('rules', async (ctx) => {
    await ctx.reply(RULES_MESSAGE, { attachments: [getMainKeyboard()] });
});

bot.action('help', async (ctx) => {
    const helpText = `❓ **Помощь по использованию бота:**

1. Нажмите кнопку "📸 Отправить фото"
2. Выберите фото из галереи или сделайте новый снимок
3. В описании к фото укажите точный адрес места нанесения надписи
4. Отправьте сообщение

После получения фото вы получите уведомление о принятии сообщения.

Если у вас возникли проблемы, попробуйте:
• Перезапустить бота командой /start
• Проверить качество фото
• Убедиться, что адрес указан корректно

📞 При повторяющихся проблемах обратитесь к администратору.`;
    await ctx.reply(helpText, { attachments: [getMainKeyboard()] });
});

// Основной обработчик сообщений
bot.on('message_created', async (ctx) => {
    console.log('='.repeat(60));
    
    const message = ctx.message;
    const sender = message.sender || {};
    const targetUserId = sender.user_id;
    const senderName = sender.name || 'Unknown';
    const body = message.body || {};
    const text = body.text || '';
    const chatId = message.recipient?.chat_id || '';
    
    console.log(`👤 Отправитель: ${senderName} (ID: ${targetUserId})`);
    console.log(`💬 Чат ID: ${chatId}`);
    console.log(`📝 Текст: ${text.substring(0, 100) || 'Нет текста'}`);
    
    if (text === '/start') return;
    
    // Обрабатываем вложения
    const attachments = body.attachments || [];
    console.log(`📎 Найдено вложений: ${attachments.length}`);
    
    const photoUrls = [];
    
    for (let i = 0; i < attachments.length; i++) {
        const attachment = attachments[i];
        const attType = attachment.type;
        const payload = attachment.payload || {};
        
        console.log(`📎 Вложение #${i}: type=${attType}`);
        
        if (attType === 'image' || attType === 'photo') {
            const fileId = payload.file_id || payload.id || payload.fileId;
            if (fileId) {
                console.log(`📷 Найден file_id: ${fileId}`);
                const result = await uploadPhotoToMax(ctx, fileId, true);
                if (result && result.url) {
                    photoUrls.push(result.url);
                    console.log(`✅ Фото успешно обработано`);
                } else {
                    console.log(`⚠️ Не удалось обработать фото: ${fileId}`);
                }
            } else {
                console.log(`⚠️ Не удалось найти file_id в payload`);
                if (payload.url) {
                    console.log(`   Найден прямой URL: ${payload.url}`);
                    photoUrls.push(payload.url);
                }
            }
        }
    }
    
    const now = getYekaterinburgTime();
    const receivedAtISO = now.toISOString();
    const receivedAtFormatted = formatYekaterinburgTime(now);
    
    console.log(`🕐 Время Екатеринбург: ${receivedAtFormatted}`);
    
    if (text || photoUrls.length > 0) {
        const crmPayload = {
            source: 'max',
            chat_id: String(chatId),
            user_id: String(targetUserId || ''),
            user_name: String(senderName),
            text: String(text || ''),
            photos: photoUrls,
            received_at: receivedAtISO
        };
        
        console.log(`📤 Итоговые данные для CRM:`);
        console.log(`   Время: ${receivedAtFormatted}`);
        console.log(`   Текст: ${text.substring(0, 50) || 'Нет'}`);
        console.log(`   Фото: ${photoUrls.length} шт.`);
        
        const saved = await saveToCRM(crmPayload);
        
        if (saved) {
            let replyText = '✅ Ваше сообщение принято! Спасибо за бдительность.';
            replyText += `\n🕐 Время получения (Екатеринбург): ${receivedAtFormatted}`;
            if (photoUrls.length > 0) {
                replyText += `\n📷 Получено фото: ${photoUrls.length} шт.`;
            }
            if (text) {
                replyText += `\n📝 Ваше сообщение: "${text.substring(0, 100)}"`;
            }
            await ctx.reply(replyText, { attachments: [getMainKeyboard()] });
        } else {
            await ctx.reply('❌ Произошла ошибка при обработке сообщения. Пожалуйста, попробуйте позже.', { attachments: [getMainKeyboard()] });
        }
    } else {
        await ctx.reply('Пожалуйста, используйте кнопки для взаимодействия с ботом.', { attachments: [getMainKeyboard()] });
    }
});

bot.catch((err, ctx) => {
    console.error('❌ Ошибка в боте:', err);
    if (ctx && ctx.reply) {
        ctx.reply('❌ Произошла ошибка. Пожалуйста, попробуйте позже.', { attachments: [getMainKeyboard()] });
    }
});

async function startBot() {
    const now = getYekaterinburgTime();
    console.log('\n' + '='.repeat(60));
    console.log('🚀 ЗАПУСК БОТА');
    console.log(`📁 Фото сохраняются в: ${PHOTOS_DIR}`);
    console.log(`🔗 CRM API: ${CRM_API_URL}`);
    console.log(`🕐 Текущее время Екатеринбурга: ${formatYekaterinburgTime(now)}`);
    console.log('='.repeat(60));
    console.log('\n📱 Клавиатура бота:');
    console.log('   📸 Отправить фото | ℹ️ Информация');
    console.log('   📋 Правила | ❓ Помощь');
    console.log('='.repeat(60) + '\n');
    
    // Проверка соединения с CRM
    try {
        const healthCheck = await axios.get('http://localhost:6005/health', { timeout: 5000 });
        console.log('✅ CRM backend доступен');
        console.log(`   Время на CRM: ${healthCheck.data.timestamp}`);
    } catch (error) {
        console.warn('⚠️ ВНИМАНИЕ: CRM backend не отвечает!');
        console.warn('   Запустите CRM: python main.py');
        console.warn('   Бот будет работать, но сообщения не будут сохраняться\n');
    }
    
    try {
        await bot.start();
        console.log('✅ Бот успешно запущен и ожидает сообщения...');
        console.log('   Нажмите Ctrl+C для остановки\n');
    } catch (error) {
        console.error('❌ Ошибка при запуске бота:', error.message);
        process.exit(1);
    }
}

startBot();

process.on('SIGINT', () => {
    console.log('\n👋 Остановка бота...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Остановка бота...');
    process.exit(0);
});