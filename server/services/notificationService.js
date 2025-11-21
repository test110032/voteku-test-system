/**
 * Notification Service - отправка результатов тестов в Telegram
 *
 * Отправляет результаты теста напрямую в Telegram чат заказчику.
 * Работает через тот же бот, не требует дополнительных сервисов.
 *
 * Настройка:
 * 1. Заказчик должен написать боту /start (или любое сообщение)
 * 2. Получить chat_id заказчика
 * 3. Добавить ADMIN_CHAT_ID в переменные окружения
 */

import { getResultDetail } from './resultService.js';

let botInstance = null;

/**
 * Устанавливает экземпляр бота для отправки уведомлений
 */
export const setBotInstance = (bot) => {
  botInstance = bot;
};

/**
 * Форматирует результаты теста для Telegram сообщения
 */
const formatResultsText = (sessionInfo, logs) => {
  const percentage = Math.round((sessionInfo.score / sessionInfo.total_questions) * 100);
  const completedDate = new Date(sessionInfo.completed_at).toLocaleString('uk-UA');

  const statusEmoji = percentage >= 80 ? '🏆' : percentage >= 60 ? '👍' : '📚';
  const statusText = percentage >= 80 ? 'Відмінний результат!' :
                     percentage >= 60 ? 'Добрий результат!' :
                     'Потребує додаткової підготовки';

  // Краткая сводка
  let message = `📊 *Новий результат тестування*\n\n`;
  message += `👤 *Студент:* ${sessionInfo.user_name}\n`;
  message += `🆔 *Telegram ID:* \`${sessionInfo.telegram_id}\`\n`;
  message += `📅 *Дата:* ${completedDate}\n\n`;
  message += `✅ *Результат:* ${sessionInfo.score}/${sessionInfo.total_questions} (${percentage}%)\n`;
  message += `${statusEmoji} ${statusText}\n\n`;

  // Детали по неправильным ответам (если есть)
  const wrongAnswers = logs.filter(log => !log.is_correct);
  if (wrongAnswers.length > 0) {
    message += `❌ *Помилки (${wrongAnswers.length}):*\n`;
    wrongAnswers.slice(0, 10).forEach((log, index) => {
      const userAnswer = log.options[log.user_answer_index] || 'Не відповів';
      message += `\n${index + 1}. ${log.question_text.substring(0, 100)}${log.question_text.length > 100 ? '...' : ''}\n`;
      message += `   ❌ Відповідь: ${userAnswer.substring(0, 50)}\n`;
      message += `   ✅ Правильно: ${log.options[log.correct_answer_index].substring(0, 50)}\n`;
    });
    if (wrongAnswers.length > 10) {
      message += `\n_...та ще ${wrongAnswers.length - 10} помилок_\n`;
    }
  }

  return message;
};

/**
 * Отправляет результаты теста в Telegram админу/заказчику
 */
export const sendTestResultsToAdmin = async (sessionId) => {
  const adminChatIds = (process.env.ADMIN_CHAT_ID || '')
    .split(',')
    .map(id => id.trim())
    .filter(id => id);

  if (!botInstance) {
    console.warn('⚠️ Bot instance not set. Telegram notification disabled.');
    return false;
  }

  if (adminChatIds.length === 0) {
    console.warn('⚠️ ADMIN_CHAT_ID not configured. Telegram notification disabled.');
    return false;
  }

  try {
    const result = await getResultDetail(sessionId);

    if (!result) {
      console.error('❌ Session not found:', sessionId);
      return false;
    }

    const { sessionInfo, logs } = result;
    const message = formatResultsText(sessionInfo, logs);

    // Отправляем всем админам
    for (const chatId of adminChatIds) {
      try {
        await botInstance.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        console.log(`✅ Telegram notification sent to ${chatId}`);
      } catch (err) {
        console.error(`❌ Failed to send to ${chatId}:`, err.message);
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Error sending Telegram notification:', error.message);
    return false;
  }
};
