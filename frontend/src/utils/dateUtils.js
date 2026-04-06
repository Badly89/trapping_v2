// src/utils/dateUtils.js - упрощенная версия
import { format, formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * Теперь дата из БД уже в часовом поясе Екатеринбурга
 */
export function parseDate(dateString) {
    if (!dateString) return null;
    return new Date(dateString);
}

/**
 * Форматирует дату для отображения в карточке
 */
export function formatMessageDate(dateString) {
    const date = parseDate(dateString);
    if (!date) return 'Дата неизвестна';
    
    const now = new Date();
    const diffMinutes = differenceInMinutes(now, date);
    
    if (diffMinutes < 1) return 'Только что';
    if (diffMinutes < 60) return `${diffMinutes} мин назад`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} ч назад`;
    
    return format(date, 'dd.MM.yyyy HH:mm', { locale: ru });
}

/**
 * Форматирует дату для отображения в деталях
 */
export function formatFullDate(dateString) {
    const date = parseDate(dateString);
    if (!date) return 'Дата неизвестна';
    return format(date, 'dd.MM.yyyy HH:mm:ss', { locale: ru });
}

/**
 * Форматирует дату для отображения в таблице
 */
export function formatTableDate(dateString) {
    const date = parseDate(dateString);
    if (!date) return '—';
    return format(date, 'dd.MM.yyyy HH:mm', { locale: ru });
}

/**
 * Получает относительное время
 */
export function formatRelativeTime(dateString) {
    const date = parseDate(dateString);
    if (!date) return '—';
    return formatDistanceToNow(date, { addSuffix: true, locale: ru });
}