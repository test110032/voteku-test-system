import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './database/db.js';
import { initBot, webhookMiddleware } from './bot/telegramBot.js';
import apiRoutes from './routes/api.js';

// Загрузка переменных окружения
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(express.json());
app.use(cors());

// API роуты
app.use('/api', apiRoutes);

// Webhook для Telegram Bot (для production)
if (process.env.WEBHOOK_URL) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  app.post(`/bot${token}`, webhookMiddleware);
}

// Serve admin panel в production
if (NODE_ENV === 'production') {
  const adminPath = path.join(__dirname, '../admin/dist');
  app.use(express.static(adminPath));

  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/bot')) {
      res.sendFile(path.join(adminPath, 'index.html'));
    }
  });
}

// Главная страница для development
app.get('/', (req, res) => {
  if (NODE_ENV === 'development') {
    res.json({
      status: 'Voteku Test System API',
      environment: NODE_ENV,
      endpoints: {
        api: '/api/results',
        health: '/api/health'
      }
    });
  }
});

// Инициализация и запуск сервера
const startServer = async () => {
  try {
    console.log('🚀 Запуск Voteku Test System...\n');

    // Инициализация БД
    await initDatabase();

    // Инициализация Telegram Bot
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.warn('⚠️ TELEGRAM_BOT_TOKEN не установлен. Бот не будет запущен.');
      console.warn('⚠️ Создайте файл .env на основе .env.example\n');
    } else {
      const useWebhook = Boolean(process.env.WEBHOOK_URL);
      const webhookUrl = process.env.WEBHOOK_URL;
      initBot(botToken, useWebhook, webhookUrl);
    }

    // Запуск Express сервера
    app.listen(PORT, () => {
      console.log(`\n✅ Сервер запущен на порту ${PORT}`);
      console.log(`📍 Режим: ${NODE_ENV}`);
      console.log(`🌐 API: http://localhost:${PORT}/api`);
      if (NODE_ENV === 'development') {
        console.log(`📊 Admin Panel: запустите отдельно (cd admin && npm run dev)`);
      }
      console.log('\n✨ Система готова к работе!\n');
    });
  } catch (error) {
    console.error('❌ Ошибка запуска сервера:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️ Получен сигнал SIGINT. Завершение работы...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️ Получен сигнал SIGTERM. Завершение работы...');
  process.exit(0);
});

// Запуск
startServer();
