-- Схема базы данных для системы тестирования

-- Сессии тестирования
CREATE TABLE IF NOT EXISTS test_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_name TEXT NOT NULL,
  telegram_id INTEGER UNIQUE NOT NULL,
  test_type TEXT NOT NULL DEFAULT 'VOTEKU', -- VOTEKU | ODS
  score INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 30,
  status TEXT DEFAULT 'in_progress', -- in_progress | completed
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

-- Детальные логи ответов
CREATE TABLE IF NOT EXISTS test_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  options TEXT NOT NULL, -- JSON array
  user_answer_index INTEGER,
  correct_answer_index INTEGER NOT NULL,
  is_correct INTEGER DEFAULT 0, -- 0 = false, 1 = true
  answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES test_sessions(id) ON DELETE CASCADE
);

-- Состояния пользователей (для State Machine)
CREATE TABLE IF NOT EXISTS user_states (
  telegram_id INTEGER PRIMARY KEY,
  state TEXT DEFAULT 'idle', -- idle | awaiting_name | testing
  current_question_index INTEGER DEFAULT 0,
  session_id INTEGER,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES test_sessions(id) ON DELETE CASCADE
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_test_sessions_telegram_id ON test_sessions(telegram_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_status ON test_sessions(status);
CREATE INDEX IF NOT EXISTS idx_test_logs_session_id ON test_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_user_states_telegram_id ON user_states(telegram_id);
