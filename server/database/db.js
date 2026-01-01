import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(dirname(dirname(__dirname)), 'voteku_test.db');

// Создаём подключение к SQLite
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Ошибка подключения к БД:', err.message);
  } else {
    console.log('✅ Подключение к SQLite успешно:', DB_PATH);
  }
});

// Промисифицированные методы для удобной работы с async/await
export const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

export const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Применение миграций
const runMigrations = async () => {
  try {
    // Миграция: добавление столбца test_type (если его нет)
    try {
      await dbRun(`ALTER TABLE test_sessions ADD COLUMN test_type TEXT NOT NULL DEFAULT 'VOTEKU'`);
      console.log('✅ Миграция: добавлен столбец test_type');
    } catch (error) {
      // Столбец уже существует - это нормально
      if (error.message && error.message.includes('duplicate column name')) {
        console.log('ℹ️  Столбец test_type уже существует');
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Ошибка применения миграций:', error);
    throw error;
  }
};

// Инициализация базы данных из schema.sql
export const initDatabase = async () => {
  try {
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Разбиваем на отдельные запросы и выполняем
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      await dbRun(statement);
    }

    console.log('✅ База данных инициализирована');

    // Применяем миграции после инициализации
    await runMigrations();
  } catch (error) {
    console.error('❌ Ошибка инициализации БД:', error);
    throw error;
  }
};

// Закрытие подключения
export const closeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

export default db;
