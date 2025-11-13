import { dbGet, dbAll } from '../database/db.js';

// Получить все завершённые сессии тестирования
export const getAllResults = async () => {
  try {
    const results = await dbAll(
      `SELECT
         id,
         user_name,
         telegram_id,
         score,
         total_questions,
         started_at,
         completed_at
       FROM test_sessions
       WHERE status = 'completed'
       ORDER BY completed_at DESC`
    );
    return results;
  } catch (error) {
    throw new Error(`Ошибка получения результатов: ${error.message}`);
  }
};

// Получить детальную информацию по конкретной сессии
export const getResultDetail = async (sessionId) => {
  try {
    // Получаем информацию о сессии
    const sessionInfo = await dbGet(
      `SELECT
         id,
         user_name,
         telegram_id,
         score,
         total_questions,
         started_at,
         completed_at
       FROM test_sessions
       WHERE id = ?`,
      [sessionId]
    );

    if (!sessionInfo) {
      return null;
    }

    // Получаем все ответы пользователя
    const logs = await dbAll(
      `SELECT
         id,
         question_id,
         question_text,
         options,
         user_answer_index,
         correct_answer_index,
         is_correct,
         answered_at
       FROM test_logs
       WHERE session_id = ?
       ORDER BY id`,
      [sessionId]
    );

    // Парсим JSON опций
    const parsedLogs = logs.map(log => ({
      ...log,
      options: JSON.parse(log.options),
      is_correct: Boolean(log.is_correct)
    }));

    return {
      sessionInfo,
      logs: parsedLogs
    };
  } catch (error) {
    throw new Error(`Ошибка получения детальной информации: ${error.message}`);
  }
};

// Статистика по всем тестам
export const getStatistics = async () => {
  try {
    const stats = await dbGet(
      `SELECT
         COUNT(*) as total_tests,
         AVG(score) as average_score,
         MAX(score) as max_score,
         MIN(score) as min_score
       FROM test_sessions
       WHERE status = 'completed'`
    );
    return stats;
  } catch (error) {
    throw new Error(`Ошибка получения статистики: ${error.message}`);
  }
};
