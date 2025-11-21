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
 * Форматирует заголовок с общей информацией о тесте
 */
const formatHeader = (sessionInfo) => {
  const percentage = Math.round((sessionInfo.score / sessionInfo.total_questions) * 100);
  const completedDate = new Date(sessionInfo.completed_at).toLocaleString('uk-UA');

  const statusEmoji = percentage >= 80 ? '🏆' : percentage >= 60 ? '👍' : '📚';
  const statusText = percentage >= 80 ? 'Відмінний результат!' :
                     percentage >= 60 ? 'Добрий результат!' :
                     'Потребує додаткової підготовки';

  let message = `📊 *Новий результат тестування*\n\n`;
  message += `👤 *Студент:* ${sessionInfo.user_name}\n`;
  message += `🆔 *Telegram ID:* \`${sessionInfo.telegram_id}\`\n`;
  message += `📅 *Дата:* ${completedDate}\n\n`;
  message += `✅ *Результат:* ${sessionInfo.score}/${sessionInfo.total_questions} (${percentage}%)\n`;
  message += `${statusEmoji} ${statusText}`;

  return message;
};

/**
 * Разбивает массив ответов на части для отдельных сообщений
 */
const formatAnswerMessages = (logs) => {
  const messages = [];
  const ANSWERS_PER_MESSAGE = 10;

  for (let i = 0; i < logs.length; i += ANSWERS_PER_MESSAGE) {
    const chunk = logs.slice(i, i + ANSWERS_PER_MESSAGE);
    const startNum = i + 1;
    const endNum = Math.min(i + ANSWERS_PER_MESSAGE, logs.length);

    let message = `📝 *Відповіді ${startNum}-${endNum} з ${logs.length}:*\n`;

    chunk.forEach((log, index) => {
      const questionNum = i + index + 1;
      const userAnswer = log.options[log.user_answer_index] || 'Не відповів';
      const correctAnswer = log.options[log.correct_answer_index];
      const isCorrect = log.is_correct;

      message += `\n*${questionNum}.* ${log.question_text}\n`;
      if (isCorrect) {
        message += `   ✅ ${userAnswer}\n`;
      } else {
        message += `   ❌ Відповідь: ${userAnswer}\n`;
        message += `   ✅ Правильно: ${correctAnswer}\n`;
      }
    });

    messages.push(message);
  }

  return messages;
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

    // Формируем сообщения
    const headerMessage = formatHeader(sessionInfo);
    const answerMessages = formatAnswerMessages(logs);

    // Отправляем всем админам
    for (const chatId of adminChatIds) {
      try {
        // Сначала заголовок
        await botInstance.sendMessage(chatId, headerMessage, { parse_mode: 'Markdown' });

        // Затем все ответы по частям
        for (const msg of answerMessages) {
          await botInstance.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
          // Небольшая задержка между сообщениями чтобы не превысить лимиты
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`✅ Telegram notification sent to ${chatId} (${1 + answerMessages.length} messages)`);
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
