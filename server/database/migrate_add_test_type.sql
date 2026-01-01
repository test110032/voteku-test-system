-- Миграция: добавление поля test_type в существующую таблицу test_sessions
-- Запустите этот файл, если у вас уже есть БД с данными

-- Добавляем столбец test_type (если его еще нет)
-- SQLite не поддерживает IF NOT EXISTS для ALTER TABLE, поэтому используем обработку ошибок
ALTER TABLE test_sessions ADD COLUMN test_type TEXT NOT NULL DEFAULT 'VOTEKU';
