/**
 * Telegram Bot для проведения тестирования
 *
 * ВАЖНО ДЛЯ PRODUCTION:
 * - При изменении логики вопросов учитывайте активные сессии пользователей
 * - Webhook URL должен быть HTTPS (Render предоставляет автоматически)
 * - Токен бота хранится в переменных окружения, никогда не коммитится в Git
 *
 * Режимы работы:
 * - Development: Long Polling (локальная разработка)
 * - Production: Webhook (Render/другие хостинги)
 */

import TelegramBot from 'node-telegram-bot-api';
import {
  generateRandomTest,
  createTestSession,
  saveTestQuestions,
  saveUserAnswer,
  completeTest,
  hasUserCompletedTest,
  getCurrentSession,
  getQuestionByIndex,
  TestTypes,
  getQuestionsCount,
  getSessionById
} from '../services/testService.js';
import {
  getUserState,
  setUserState,
  updateQuestionIndex,
  clearUserState,
  States
} from '../services/stateService.js';
import { sendTestResultsToAdmin, setBotInstance } from '../services/notificationService.js';
import { dbRun } from '../database/db.js';

let bot = null;

// Инициализация бота
export const initBot = (token, useWebhook = false, webhookUrl = null) => {
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN не установлен');
  }

  if (useWebhook && webhookUrl) {
    // PRODUCTION: Webhook режим
    // Telegram отправляет обновления на наш сервер
    // ВАЖНО: При изменении webhookUrl нужно перезапустить сервис
    bot = new TelegramBot(token);
    bot.setWebHook(`${webhookUrl}/bot${token}`);
    console.log('✅ Telegram Bot запущен в режиме Webhook');
  } else {
    // DEVELOPMENT: Long Polling режим
    // Бот сам опрашивает Telegram API на наличие обновлений
    // Не использовать на production (может вызвать конфликты при масштабировании)
    bot = new TelegramBot(token, { polling: true });
    console.log('✅ Telegram Bot запущен в режиме Long Polling');
  }

  setupHandlers();
  setBotInstance(bot);
  return bot;
};

// Настройка обработчиков
const setupHandlers = () => {
  // Обработчик команды /start
  bot.onText(/\/start/, handleStart);

  // Обработчик текстовых сообщений
  bot.on('message', handleMessage);

  // Обработчик callback query (нажатия на кнопки)
  bot.on('callback_query', handleCallbackQuery);

  // Обработка ошибок
  bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
  });
};

/**
 * Обработчик команды /start
 *
 * ВАЖНО: Здесь происходит проверка на повторное прохождение теста.
 * Пользователь может пройти тест только один раз (по telegram_id).
 *
 * Если нужно разрешить повторное прохождение:
 * 1. Удалите проверку hasUserCompletedTest
 * 2. Измените UNIQUE constraint на telegram_id в schema.sql
 */
const handleStart = async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;

  try {
    // Проверяем, не прошёл ли пользователь уже тест
    // PRODUCTION: Эта проверка предотвращает повторное прохождение
    const completedTest = await hasUserCompletedTest(telegramId);

    if (completedTest) {
      await bot.sendMessage(
        chatId,
        `✅ Ви вже пройшли тестування!\n\n` +
        `📊 Ваш результат: ${completedTest.score} із ${completedTest.total_questions}\n` +
        `📅 Дата проходження: ${new Date(completedTest.completed_at).toLocaleString('uk-UA')}\n\n` +
        `Повторне проходження не передбачено.`
      );
      return;
    }

    // Проверяем текущее состояние
    const state = await getUserState(telegramId);

    if (state.state === States.TESTING && state.session_id) {
      // Пользователь уже проходит тест
      const session = await getSessionById(state.session_id);
      const totalQuestions = session ? session.total_questions : 30;

      await bot.sendMessage(
        chatId,
        `⚠️ Ви вже розпочали тестування.\n\n` +
        `Продовжуйте відповідати на питання. Поточне питання: ${state.current_question_index + 1} із ${totalQuestions}`
      );

      // Отправляем текущий вопрос
      await sendQuestion(chatId, state.session_id, state.current_question_index);
      return;
    }

    // Приветствие и запрос имени
    await setUserState(telegramId, States.AWAITING_NAME);
    await bot.sendMessage(
      chatId,
      `👋 Вітаємо в системі тестування!\n\n` +
      `📝 Вам буде запропоновано пройти тестування.\n` +
      `✅ На кожне питання потрібно вибрати один правильний варіант відповіді.\n\n` +
      `Будь ласка, введіть ваше Ім'я та Прізвище:`
    );
  } catch (error) {
    console.error('Ошибка в handleStart:', error);
    await bot.sendMessage(chatId, '❌ Виникла помилка. Спробуйте ще раз через /start');
  }
};

// Обработчик текстовых сообщений
const handleMessage = async (msg) => {
  // Игнорируем команды
  if (msg.text && msg.text.startsWith('/')) {
    return;
  }

  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const text = msg.text;

  try {
    const state = await getUserState(telegramId);

    // Если ожидаем имя
    if (state.state === States.AWAITING_NAME) {
      await handleNameInput(chatId, telegramId, text);
    }
    // Если ожидаем выбор типа теста через текст (не используется, т.к. используем кнопки)
    else if (state.state === States.AWAITING_TEST_TYPE) {
      await bot.sendMessage(chatId, '⚠️ Будь ласка, виберіть тип тесту за допомогою кнопок нижче.');
    }
  } catch (error) {
    console.error('Ошибка в handleMessage:', error);
    await bot.sendMessage(chatId, '❌ Виникла помилка. Спробуйте ще раз.');
  }
};

// Обработка ввода имени
const handleNameInput = async (chatId, telegramId, userName) => {
  if (!userName || userName.trim().length < 3) {
    await bot.sendMessage(chatId, '⚠️ Будь ласка, введіть коректне ім\'я (мінімум 3 символи):');
    return;
  }

  try {
    // Сохраняем имя пользователя в состоянии (временно используем session_id для хранения имени)
    await setUserState(telegramId, States.AWAITING_TEST_TYPE);

    // Сохраняем имя в БД состояний (используем хак - сохраняем в session_id как строку)
    await dbRun(
      `UPDATE user_states SET session_id = ? WHERE telegram_id = ?`,
      [userName.trim(), telegramId]
    );

    // Показываем выбор типа теста
    const keyboard = {
      inline_keyboard: [
        [{ text: '🔧 ВОТЕКУ (30 питань)', callback_data: 'test_type_VOTEKU' }],
        [{ text: '📞 ОДС (50 питань)', callback_data: 'test_type_ODS' }]
      ]
    };

    await bot.sendMessage(
      chatId,
      `✅ Дякуємо, ${userName.trim()}!\n\n` +
      `📋 Будь ласка, оберіть тип тесту:\n\n` +
      `🔧 <b>ВОТЕКУ</b> - для співробітників відділу по обслуговуванню та експлуатації когенераційних установок (30 питань)\n\n` +
      `📞 <b>ОДС</b> - для диспетчера оперативно-диспетчерської служби (50 питань)`,
      { reply_markup: keyboard, parse_mode: 'HTML' }
    );
  } catch (error) {
    console.error('Ошибка при обработке имени:', error);
    await bot.sendMessage(chatId, '❌ Помилка. Спробуйте /start');
  }
};

// Обработка выбора типа теста
const handleTestTypeSelection = async (chatId, messageId, telegramId, callbackData, queryId) => {
  try {
    // Извлекаем тип теста из callback_data
    const testType = callbackData.replace('test_type_', '');

    // Проверяем валидность типа
    if (testType !== TestTypes.VOTEKU && testType !== TestTypes.ODS) {
      await bot.answerCallbackQuery(queryId, { text: '❌ Невірний тип тесту' });
      return;
    }

    // Получаем состояние (из session_id достаем имя пользователя)
    const state = await getUserState(telegramId);
    const userName = state.session_id; // Мы сохранили имя во временном поле

    if (!userName || state.state !== States.AWAITING_TEST_TYPE) {
      await bot.answerCallbackQuery(queryId, { text: '⚠️ Спочатку почніть тест через /start' });
      return;
    }

    // Убираем кнопки выбора
    await bot.editMessageReplyMarkup(
      { inline_keyboard: [] },
      { chat_id: chatId, message_id: messageId }
    );

    // Создаём сессию с выбранным типом теста
    const sessionId = await createTestSession(telegramId, userName, testType);

    // Генерируем вопросы согласно типу теста
    const questions = generateRandomTest(testType);

    // Сохраняем вопросы в БД
    await saveTestQuestions(sessionId, questions);

    // Устанавливаем состояние тестирования
    await setUserState(telegramId, States.TESTING, sessionId, 0);

    // Получаем количество вопросов
    const questionsCount = getQuestionsCount(testType);

    // Название теста для отображения
    const testName = testType === TestTypes.VOTEKU ? 'ВОТЕКУ' : 'ОДС';

    // Отправляем подтверждение
    await bot.answerCallbackQuery(queryId, {
      text: `✅ Обрано тест ${testName}`,
      show_alert: false
    });

    // Отправляем приветственное сообщение
    await bot.sendMessage(
      chatId,
      `🎯 Тест <b>${testName}</b> складається з ${questionsCount} питань.\n` +
      `⏱ Обмеження за часом немає.\n` +
      `📌 Ви не можете повернутися до попередніх питань.\n\n` +
      `Розпочинаємо тестування!`,
      { parse_mode: 'HTML' }
    );

    // Отправляем первый вопрос
    await sendQuestion(chatId, sessionId, 0);
  } catch (error) {
    console.error('Ошибка при выборе типа теста:', error);
    await bot.answerCallbackQuery(queryId, { text: '❌ Виникла помилка' });
    await bot.sendMessage(chatId, '❌ Помилка створення тесту. Спробуйте /start');
  }
};

// Отправка вопроса
const sendQuestion = async (chatId, sessionId, questionIndex) => {
  try {
    const question = await getQuestionByIndex(sessionId, questionIndex);

    if (!question) {
      console.error('Вопрос не найден:', sessionId, questionIndex);
      return;
    }

    // Получаем информацию о сессии для определения общего количества вопросов
    const session = await getSessionById(sessionId);
    const totalQuestions = session ? session.total_questions : 30;

    // Формируем клавиатуру с вариантами ответов
    const keyboard = {
      inline_keyboard: question.options.map((option, index) => [{
        text: option,
        callback_data: `answer_${questionIndex}_${index}`
      }])
    };

    await bot.sendMessage(
      chatId,
      `❓ Питання ${questionIndex + 1} із ${totalQuestions}:\n\n${question.text}`,
      { reply_markup: keyboard }
    );
  } catch (error) {
    console.error('Ошибка отправки вопроса:', error);
    throw error;
  }
};

// Обработчик нажатий на кнопки
const handleCallbackQuery = async (query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const telegramId = query.from.id;
  const data = query.data;

  try {
    // Проверяем, это выбор типа теста?
    if (data.startsWith('test_type_')) {
      await handleTestTypeSelection(chatId, messageId, telegramId, data, query.id);
      return;
    }

    // Парсим callback_data: answer_questionIndex_answerIndex
    const match = data.match(/^answer_(\d+)_(\d+)$/);

    if (!match) {
      await bot.answerCallbackQuery(query.id, { text: '❌ Некоректні дані' });
      return;
    }

    const questionIndex = parseInt(match[1]);
    const answerIndex = parseInt(match[2]);

    // Получаем текущее состояние
    const state = await getUserState(telegramId);

    if (state.state !== States.TESTING || !state.session_id) {
      await bot.answerCallbackQuery(query.id, { text: '⚠️ Спочатку почніть тест через /start' });
      return;
    }

    // Проверяем, что это текущий вопрос (защита от повторных кликов)
    if (questionIndex !== state.current_question_index) {
      await bot.answerCallbackQuery(query.id, { text: '⚠️ Це не поточне питання' });
      return;
    }

    // Сохраняем ответ
    const isCorrect = await saveUserAnswer(state.session_id, questionIndex, answerIndex);

    // Убираем кнопки у текущего вопроса
    await bot.editMessageReplyMarkup(
      { inline_keyboard: [] },
      { chat_id: chatId, message_id: messageId }
    );

    // Отправляем подтверждение
    await bot.answerCallbackQuery(query.id, {
      text: isCorrect ? '✅ Правильно!' : '❌ Неправильно',
      show_alert: false
    });

    // Получаем информацию о сессии для определения общего количества вопросов
    const session = await getSessionById(state.session_id);
    const totalQuestions = session ? session.total_questions : 30;

    // Переходим к следующему вопросу
    const nextQuestionIndex = questionIndex + 1;

    if (nextQuestionIndex < totalQuestions) {
      // Есть ещё вопросы
      await updateQuestionIndex(telegramId, nextQuestionIndex);

      // Небольшая задержка перед следующим вопросом
      setTimeout(async () => {
        await sendQuestion(chatId, state.session_id, nextQuestionIndex);
      }, 500);
    } else {
      // Тест завершён
      await finishTest(chatId, telegramId, state.session_id);
    }
  } catch (error) {
    console.error('Ошибка в handleCallbackQuery:', error);
    await bot.answerCallbackQuery(query.id, { text: '❌ Виникла помилка' });
  }
};

// Завершение теста
const finishTest = async (chatId, telegramId, sessionId) => {
  try {
    // Завершаем тест и получаем результат
    const result = await completeTest(sessionId);

    // Очищаем состояние пользователя
    await clearUserState(telegramId);

    // Отправляем результаты админу в Telegram (асинхронно, не блокируем ответ пользователю)
    sendTestResultsToAdmin(sessionId).catch(err => {
      console.error('Failed to send notification:', err);
    });

    // Отправляем результат
    const percentage = Math.round((result.score / result.total_questions) * 100);

    await bot.sendMessage(
      chatId,
      `🎉 Тестування завершено!\n\n` +
      `📊 Ваш результат: ${result.score} із ${result.total_questions} (${percentage}%)\n\n` +
      `${percentage >= 80 ? '🏆 Відмінний результат!' :
        percentage >= 60 ? '👍 Добрий результат!' :
        '📚 Рекомендуємо повторити матеріал.'}\n\n` +
      `Дякуємо за проходження тесту!`
    );
  } catch (error) {
    console.error('Ошибка завершения теста:', error);
    await bot.sendMessage(chatId, '❌ Помилка при завершенні тесту');
  }
};

// Express middleware для webhook
export const webhookMiddleware = (req, res) => {
  if (bot) {
    bot.processUpdate(req.body);
  }
  res.sendStatus(200);
};

export default bot;
