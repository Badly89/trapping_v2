# bot.py - упрощенная версия привязки

@dp.message_created(Command('connect'))
async def cmd_connect(event: MessageCreated):
    """Привязка MAX аккаунта к CRM через email"""
    user_id = event.message.sender.user_id
    chat_id = event.message.recipient.chat_id
    user_name = event.message.sender.first_name or 'Пользователь'
    
    logger.info(f"🔐 Команда /connect от пользователя {user_id}")
    
    await event.message.answer(
        f"🔗 **Привязка к CRM системе**\n\n"
        f"Пожалуйста, введите ваш email, который указан в CRM.\n\n"
        f"На этот email будет отправлен код подтверждения.\n\n"
        f"Пример: `user@example.com`\n\n"
        f"Для отмены используйте /cancel",
        format=ParseMode.MARKDOWN
    )
    
    user_connect_data[user_id] = {
        'chat_id': str(chat_id),
        'user_name': user_name,
        'state': ConnectState.AWAITING_EMAIL,
        'step': 'awaiting_email'
    }

@dp.message_created(Command('cancel'))
async def cmd_cancel(event: MessageCreated):
    """Отмена привязки"""
    user_id = event.message.sender.user_id
    if user_id in user_connect_data:
        del user_connect_data[user_id]
    await event.message.answer(
        "❌ **Привязка отменена**\n\n"
        "Вы можете начать заново с помощью команды /connect",
        format=ParseMode.MARKDOWN
    )

@dp.message_created()
async def handle_email_and_code(event: MessageCreated):
    """Обработка ввода email и кода"""
    user_id = event.message.sender.user_id
    text = event.message.body.text or ''
    
    if user_id not in user_connect_data:
        return
    
    state_data = user_connect_data[user_id]
    step = state_data.get('step')
    
    # Шаг 1: ожидание email
    if step == 'awaiting_email':
        if '@' not in text or '.' not in text:
            await event.message.answer(
                "❌ **Неверный формат email**\n\n"
                "Пожалуйста, введите корректный email адрес.\n"
                "Пример: `user@example.com`",
                format=ParseMode.MARKDOWN
            )
            return
        
        email = text.strip().lower()
        state_data['email'] = email
        state_data['step'] = 'awaiting_code'
        
        # Запрашиваем код
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "http://backend:8000/api/bot/request-verification-code",
                    json={
                        "email": email,
                        "chat_id": state_data['chat_id'],
                        "user_name": state_data['user_name']
                    }
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data.get('exists'):
                            if data.get('email_sent'):
                                await event.message.answer(
                                    f"✅ **Код подтверждения отправлен на {email}**\n\n"
                                    f"Пожалуйста, проверьте вашу почту и введите полученный код.\n\n"
                                    f"Код действителен 5 минут.\n\n"
                                    f"Для отмены используйте /cancel",
                                    format=ParseMode.MARKDOWN
                                )
                            else:
                                await event.message.answer(
                                    f"⚠️ **Не удалось отправить email**\n\n"
                                    f"Попробуйте позже или обратитесь к администратору.\n\n"
                                    f"Для отмены используйте /cancel",
                                    format=ParseMode.MARKDOWN
                                )
                        else:
                            await event.message.answer(
                                f"❌ **Email не найден в CRM**\n\n"
                                f"Пользователь с email `{email}` не зарегистрирован.\n\n"
                                f"Пожалуйста, используйте email, указанный в вашем профиле CRM.\n"
                                f"Для отмены используйте /cancel",
                                format=ParseMode.MARKDOWN
                            )
                            del user_connect_data[user_id]
                    else:
                        await event.message.answer(
                            f"❌ **Ошибка сервера**\n\n"
                            f"Попробуйте позже.\n"
                            f"Для отмены используйте /cancel",
                            format=ParseMode.MARKDOWN
                        )
        except Exception as e:
            logger.error(f"Ошибка: {e}")
            await event.message.answer(
                f"❌ **Ошибка подключения**\n\n"
                f"Попробуйте позже.",
                format=ParseMode.MARKDOWN
            )
    
    # Шаг 2: ожидание кода
    elif step == 'awaiting_code':
        code = text.strip()
        email = state_data.get('email')
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "http://backend:8000/api/user/verify-max-code",
                    json={"code": code}
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data.get('verified'):
                            await event.message.answer(
                                f"✅ **Аккаунт успешно привязан!**\n\n"
                                f"Теперь вы будете получать уведомления о:\n"
                                f"• Новых сообщениях\n"
                                f"• Назначенных задачах\n"
                                f"• Изменении статусов\n\n"
                                f"Для отвязки используйте /disconnect",
                                format=ParseMode.MARKDOWN
                            )
                            del user_connect_data[user_id]
                        else:
                            await event.message.answer(
                                f"❌ **Неверный код**\n\n"
                                f"Проверьте код и попробуйте снова.\n"
                                f"Код действителен 5 минут.\n\n"
                                f"Для отмены используйте /cancel",
                                format=ParseMode.MARKDOWN
                            )
                    else:
                        await event.message.answer(
                            f"❌ **Ошибка проверки кода**\n\n"
                            f"Попробуйте позже.",
                            format=ParseMode.MARKDOWN
                        )
        except Exception as e:
            logger.error(f"Ошибка: {e}")
            await event.message.answer(
                f"❌ **Ошибка подключения**\n\n"
                f"Попробуйте позже.",
                format=ParseMode.MARKDOWN
            )