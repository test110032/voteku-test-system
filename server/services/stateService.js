import { dbRun, dbGet } from '../database/db.js';

// Состояния пользователя
export const States = {
  IDLE: 'idle',
  AWAITING_NAME: 'awaiting_name',
  TESTING: 'testing'
};

// Получить состояние пользователя
export const getUserState = async (telegramId) => {
  try {
    const state = await dbGet(
      `SELECT state, current_question_index, session_id
       FROM user_states
       WHERE telegram_id = ?`,
      [telegramId]
    );

    return state || {
      state: States.IDLE,
      current_question_index: 0,
      session_id: null
    };
  } catch (error) {
    throw new Error(`Ошибка получения состояния: ${error.message}`);
  }
};

// Установить состояние пользователя
export const setUserState = async (telegramId, state, sessionId = null, questionIndex = 0) => {
  try {
    await dbRun(
      `INSERT INTO user_states (telegram_id, state, session_id, current_question_index, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(telegram_id) DO UPDATE SET
         state = excluded.state,
         session_id = excluded.session_id,
         current_question_index = excluded.current_question_index,
         updated_at = excluded.updated_at`,
      [telegramId, state, sessionId, questionIndex]
    );
  } catch (error) {
    throw new Error(`Ошибка установки состояния: ${error.message}`);
  }
};

// Обновить индекс текущего вопроса
export const updateQuestionIndex = async (telegramId, questionIndex) => {
  try {
    await dbRun(
      `UPDATE user_states
       SET current_question_index = ?, updated_at = datetime('now')
       WHERE telegram_id = ?`,
      [questionIndex, telegramId]
    );
  } catch (error) {
    throw new Error(`Ошибка обновления индекса вопроса: ${error.message}`);
  }
};

// Удалить состояние пользователя (после завершения теста)
export const clearUserState = async (telegramId) => {
  try {
    await dbRun(
      `DELETE FROM user_states WHERE telegram_id = ?`,
      [telegramId]
    );
  } catch (error) {
    throw new Error(`Ошибка удаления состояния: ${error.message}`);
  }
};
