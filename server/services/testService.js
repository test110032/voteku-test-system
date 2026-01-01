import { dbRun, dbGet, dbAll } from '../database/db.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Типы тестов
export const TestTypes = {
  VOTEKU: 'VOTEKU',
  ODS: 'ODS'
};

// Конфигурация тестов
const TEST_CONFIG = {
  [TestTypes.VOTEKU]: {
    fileName: 'questions.json',
    questionsCount: 30
  },
  [TestTypes.ODS]: {
    fileName: 'questions_ods.json',
    questionsCount: 50
  }
};

// Банки вопросов
let questionsBanks = {
  [TestTypes.VOTEKU]: null,
  [TestTypes.ODS]: null
};

// Загрузка банка вопросов по типу теста
const loadQuestions = (testType = TestTypes.VOTEKU) => {
  if (!questionsBanks[testType]) {
    const config = TEST_CONFIG[testType];
    const questionsPath = join(dirname(dirname(__dirname)), config.fileName);
    const data = fs.readFileSync(questionsPath, 'utf-8');
    questionsBanks[testType] = JSON.parse(data);
  }
  return questionsBanks[testType];
};

// Алгоритм Fisher-Yates для случайного перемешивания
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Получить количество вопросов для типа теста
export const getQuestionsCount = (testType = TestTypes.VOTEKU) => {
  return TEST_CONFIG[testType].questionsCount;
};

// Генерация случайного теста
export const generateRandomTest = (testType = TestTypes.VOTEKU) => {
  const config = TEST_CONFIG[testType];
  const questions = loadQuestions(testType);
  const shuffled = shuffleArray(questions);
  return shuffled.slice(0, config.questionsCount);
};

// Создание новой сессии тестирования
export const createTestSession = async (telegramId, userName, testType = TestTypes.VOTEKU) => {
  try {
    const config = TEST_CONFIG[testType];
    const result = await dbRun(
      `INSERT INTO test_sessions (telegram_id, user_name, test_type, total_questions, status, started_at)
       VALUES (?, ?, ?, ?, 'in_progress', datetime('now'))`,
      [telegramId, userName, testType, config.questionsCount]
    );
    return result.id;
  } catch (error) {
    throw new Error(`Ошибка создания сессии: ${error.message}`);
  }
};

// Сохранение вопросов теста в БД
export const saveTestQuestions = async (sessionId, questions) => {
  try {
    for (const question of questions) {
      await dbRun(
        `INSERT INTO test_logs
         (session_id, question_id, question_text, options, correct_answer_index, user_answer_index)
         VALUES (?, ?, ?, ?, ?, NULL)`,
        [
          sessionId,
          question.id,
          question.question,
          JSON.stringify(question.options),
          question.correctAnswerIndex
        ]
      );
    }
  } catch (error) {
    throw new Error(`Ошибка сохранения вопросов: ${error.message}`);
  }
};

// Сохранение ответа пользователя
export const saveUserAnswer = async (sessionId, questionIndex, answerIndex) => {
  try {
    // Получаем вопрос по индексу (0-based)
    const question = await dbGet(
      `SELECT id, correct_answer_index FROM test_logs
       WHERE session_id = ?
       ORDER BY id LIMIT 1 OFFSET ?`,
      [sessionId, questionIndex]
    );

    if (!question) {
      throw new Error('Вопрос не найден');
    }

    const isCorrect = answerIndex === question.correct_answer_index ? 1 : 0;

    // Обновляем ответ пользователя
    await dbRun(
      `UPDATE test_logs
       SET user_answer_index = ?, is_correct = ?, answered_at = datetime('now')
       WHERE id = ?`,
      [answerIndex, isCorrect, question.id]
    );

    // Обновляем счёт в сессии
    if (isCorrect) {
      await dbRun(
        `UPDATE test_sessions
         SET score = score + 1
         WHERE id = ?`,
        [sessionId]
      );
    }

    return isCorrect;
  } catch (error) {
    throw new Error(`Ошибка сохранения ответа: ${error.message}`);
  }
};

// Завершение теста
export const completeTest = async (sessionId) => {
  try {
    await dbRun(
      `UPDATE test_sessions
       SET status = 'completed', completed_at = datetime('now')
       WHERE id = ?`,
      [sessionId]
    );

    // Получаем финальный счёт
    const session = await dbGet(
      `SELECT score, total_questions FROM test_sessions WHERE id = ?`,
      [sessionId]
    );

    return session;
  } catch (error) {
    throw new Error(`Ошибка завершения теста: ${error.message}`);
  }
};

// Проверка, прошёл ли пользователь тест
export const hasUserCompletedTest = async (telegramId) => {
  try {
    const session = await dbGet(
      `SELECT id, score, total_questions, completed_at
       FROM test_sessions
       WHERE telegram_id = ? AND status = 'completed'
       ORDER BY completed_at DESC LIMIT 1`,
      [telegramId]
    );
    return session || null;
  } catch (error) {
    throw new Error(`Ошибка проверки завершения теста: ${error.message}`);
  }
};

// Получение текущей сессии пользователя
export const getCurrentSession = async (telegramId) => {
  try {
    const session = await dbGet(
      `SELECT id, user_name, score, total_questions
       FROM test_sessions
       WHERE telegram_id = ? AND status = 'in_progress'`,
      [telegramId]
    );
    return session || null;
  } catch (error) {
    throw new Error(`Ошибка получения текущей сессии: ${error.message}`);
  }
};

// Получение сессии по ID
export const getSessionById = async (sessionId) => {
  try {
    const session = await dbGet(
      `SELECT id, user_name, test_type, score, total_questions, status
       FROM test_sessions
       WHERE id = ?`,
      [sessionId]
    );
    return session || null;
  } catch (error) {
    throw new Error(`Ошибка получения сессии: ${error.message}`);
  }
};

// Получение вопроса по индексу для текущей сессии
export const getQuestionByIndex = async (sessionId, questionIndex) => {
  try {
    const question = await dbGet(
      `SELECT id, question_text, options, correct_answer_index
       FROM test_logs
       WHERE session_id = ?
       ORDER BY id LIMIT 1 OFFSET ?`,
      [sessionId, questionIndex]
    );

    if (!question) {
      return null;
    }

    return {
      id: question.id,
      text: question.question_text,
      options: JSON.parse(question.options),
      correctIndex: question.correct_answer_index
    };
  } catch (error) {
    throw new Error(`Ошибка получения вопроса: ${error.message}`);
  }
};
