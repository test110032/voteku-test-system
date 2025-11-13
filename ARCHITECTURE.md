# 🏗 Архитектура Voteku Test System

Подробное описание архитектуры, компонентов и потоков данных системы тестирования.

## 📊 Общая архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                        ПОЛЬЗОВАТЕЛИ                          │
│                                                               │
│  ┌──────────────┐                    ┌──────────────┐        │
│  │  Telegram    │                    │  Браузер     │        │
│  │  Клиенты     │                    │ (Admin Panel)│        │
│  └──────┬───────┘                    └──────┬───────┘        │
│         │                                   │                │
└─────────┼───────────────────────────────────┼────────────────┘
          │                                   │
          │                                   │
          │   ┌───────────────────────────────┼─────────────┐
          │   │          RENDER.COM           │             │
          │   │                               │             │
          │   │  ┌────────────────────────────▼──────────┐  │
          │   │  │      Express.js Server                │  │
          │   │  │  (Node.js 18+, Port 3001)             │  │
          │   │  └────────────────────────────┬──────────┘  │
          │   │                               │             │
          ▼   │  ┌────────────────────────────▼──────────┐  │
   ┌──────────┼──┤    Telegram Bot Webhook               │  │
   │ Telegram │  │    /bot<TOKEN>                        │  │
   │ Bot API  │  └───────────────────┬───────────────────┘  │
   └──────────┼──────────────────────┼──────────────────────┤
              │                      │                      │
              │  ┌───────────────────▼──────────────┐       │
              │  │   Business Logic Layer           │       │
              │  │                                  │       │
              │  │  ┌────────────┐  ┌────────────┐ │       │
              │  │  │   State    │  │   Test     │ │       │
              │  │  │  Service   │  │  Service   │ │       │
              │  │  └────────────┘  └────────────┘ │       │
              │  │  ┌────────────┐                 │       │
              │  │  │  Result    │                 │       │
              │  │  │  Service   │                 │       │
              │  │  └────────────┘                 │       │
              │  └───────────────────┬──────────────┘       │
              │                      │                      │
              │  ┌───────────────────▼──────────────┐       │
              │  │      SQLite Database             │       │
              │  │  voteku_test.db                  │       │
              │  │                                  │       │
              │  │  ┌──────────────────────────┐    │       │
              │  │  │   test_sessions          │    │       │
              │  │  └──────────────────────────┘    │       │
              │  │  ┌──────────────────────────┐    │       │
              │  │  │   test_logs              │    │       │
              │  │  └──────────────────────────┘    │       │
              │  └──────────────────────────────────┘       │
              │                                             │
              │  ┌──────────────────────────────────┐       │
              │  │   Static Files (Admin Panel)     │       │
              │  │   /admin/dist/*                  │       │
              │  └──────────────────────────────────┘       │
              │                                             │
              └─────────────────────────────────────────────┘
```

## 🔄 Поток данных

### 1. Прохождение теста через Telegram Bot

```
Пользователь                  Bot                 State Service        Test Service         Database
    │                          │                         │                   │                   │
    ├─ /start ─────────────────>│                         │                   │                   │
    │                          ├─ Проверка сессии ───────>│                   │                   │
    │                          │                         ├─ Запрос в БД ─────────────────────────>│
    │                          │                         │<──── Результат ─────────────────────────┤
    │                          │<──── Сессия существует? ─┤                   │                   │
    │                          │                         │                   │                   │
    │                          ├─ Генерация теста ───────┼───────────────────>│                   │
    │                          │                         │                   ├─ Выбор 30 вопросов│
    │                          │<──── 30 вопросов ────────┼───────────────────┤                   │
    │                          │                         │                   │                   │
    │                          ├─ Создание сессии ────────>│                   │                   │
    │                          │                         ├─ INSERT в БД ─────────────────────────>│
    │<─ Первый вопрос ──────────┤                         │                   │                   │
    │                          │                         │                   │                   │
    ├─ Ответ А ─────────────────>│                         │                   │                   │
    │                          ├─ Сохранение ответа ──────>│                   │                   │
    │                          │                         ├─ INSERT log ──────────────────────────>│
    │<─ Следующий вопрос ────────┤                         │                   │                   │
    │                          │                         │                   │                   │
    │    ... (30 вопросов) ... │                         │                   │                   │
    │                          │                         │                   │                   │
    ├─ Последний ответ ─────────>│                         │                   │                   │
    │                          ├─ Завершение теста ───────>│                   │                   │
    │                          │                         ├─ Подсчет баллов ──────────────────────>│
    │                          │                         ├─ UPDATE session ──────────────────────>│
    │<─ Результат 25/30 ─────────┤                         │                   │                   │
```

### 2. Просмотр результатов в Admin Panel

```
Браузер              Express Server        Result Service         Database
   │                       │                      │                    │
   ├─ GET / ───────────────>│                      │                    │
   │<─ index.html (React) ──┤                      │                    │
   │                       │                      │                    │
   ├─ GET /api/results ─────>│                      │                    │
   │                       ├─ Получить список ─────>│                    │
   │                       │                      ├─ SELECT sessions ────>│
   │                       │                      │<─── Результаты ───────┤
   │                       │<─── JSON response ────┤                    │
   │<─ Список пользователей ┤                      │                    │
   │                       │                      │                    │
   ├─ GET /api/results/1 ───>│                      │                    │
   │                       ├─ Получить детали ─────>│                    │
   │                       │                      ├─ SELECT session+logs ─>│
   │                       │                      │<─── Детали ───────────┤
   │                       │<─── JSON response ────┤                    │
   │<─ Детальные ответы ─────┤                      │                    │
```

## 📦 Компоненты системы

### Backend (Node.js + Express)

#### 1. **server/index.js** - Точка входа
```javascript
Ответственность:
- Инициализация Express приложения
- Настройка middleware (CORS, JSON)
- Подключение роутов API
- Настройка Telegram Webhook (production)
- Раздача статических файлов админ-панели (production)
- Graceful shutdown
```

#### 2. **server/bot/telegramBot.js** - Telegram Bot
```javascript
Основные функции:
- Инициализация бота (polling/webhook)
- Обработка команды /start
- Управление диалогом с пользователем
- Отправка вопросов и обработка ответов
- Вывод результатов

Режимы работы:
- Development: Polling (локально)
- Production: Webhook (на Render)
```

#### 3. **server/database/db.js** - Подключение к БД
```javascript
Функции:
- Подключение к SQLite
- Инициализация схемы (создание таблиц)
- Экспорт подключения для использования в сервисах
```

#### 4. **server/services/stateService.js** - Управление сессиями
```javascript
API:
- getUserSession(telegramId) - Получить сессию пользователя
- createSession(telegramId, userName, questions) - Создать новую сессию
- saveAnswer(sessionId, questionData, answerIndex) - Сохранить ответ
- completeSession(sessionId) - Завершить тест и подсчитать баллы

Хранит:
- Активные сессии тестирования
- Текущий вопрос пользователя
- Временные данные между вопросами
```

#### 5. **server/services/testService.js** - Генерация тестов
```javascript
API:
- loadQuestions() - Загрузить все вопросы из questions.json
- generateRandomTest(count=30) - Генерировать случайный набор вопросов

Логика:
- Загрузка банка вопросов
- Случайный выбор N вопросов без повторений
- Валидация формата вопросов
```

#### 6. **server/services/resultService.js** - Работа с результатами
```javascript
API:
- getAllResults() - Все завершенные тесты
- getResultById(sessionId) - Детали конкретного теста

Возвращает:
- Список пользователей с результатами
- Детальные логи ответов
```

#### 7. **server/routes/api.js** - API endpoints
```javascript
Роуты:
GET /api/health          - Health check
GET /api/results         - Список всех результатов
GET /api/results/:id     - Детали конкретного результата

Middleware:
- Обработка ошибок
- Логирование запросов
```

### Frontend (React + Vite)

#### 1. **admin/src/App.jsx** - Главный компонент
```javascript
Ответственность:
- Роутинг (React Router)
- Навигация между страницами
- Общий layout приложения
```

#### 2. **admin/src/components/ResultsList.jsx**
```javascript
Функционал:
- Загрузка списка результатов через API
- Отображение таблицы пользователей
- Навигация к детальному просмотру
- Расчет процента правильных ответов
```

#### 3. **admin/src/components/ResultDetail.jsx**
```javascript
Функционал:
- Загрузка детальной информации по sessionId
- Отображение всех вопросов и ответов
- Подсветка правильных/неправильных ответов
- Кнопка "Назад"
```

#### 4. **admin/src/services/api.js** - API клиент
```javascript
Функции:
- getResults() - Получить все результаты
- getResultDetail(sessionId) - Получить детали

Использует:
- Axios для HTTP запросов
- Базовый URL из переменных окружения
```

## 🗄️ База данных (SQLite)

### Схема: test_sessions

```sql
CREATE TABLE test_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT NOT NULL,
    telegram_id INTEGER UNIQUE NOT NULL,
    score INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 30,
    status TEXT DEFAULT 'in_progress',
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
)
```

**Назначение:** Хранение информации о тестовых сессиях пользователей

**Индексы:**
- PRIMARY KEY на `id`
- UNIQUE на `telegram_id` (защита от повторного прохождения)

### Схема: test_logs

```sql
CREATE TABLE test_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    options TEXT NOT NULL,
    user_answer_index INTEGER NOT NULL,
    correct_answer_index INTEGER NOT NULL,
    is_correct INTEGER NOT NULL,
    answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES test_sessions(id)
)
```

**Назначение:** Детальные логи каждого ответа пользователя

**Связи:**
- FOREIGN KEY: `session_id` → `test_sessions.id`

## 🔐 Безопасность

### 1. Защита токенов
```
✅ TELEGRAM_BOT_TOKEN хранится в Environment Variables
✅ Не коммитится в Git (.env в .gitignore)
✅ Используется только на сервере
```

### 2. Webhook безопасность
```
✅ URL включает токен: /bot<TOKEN>
✅ Только Telegram API знает полный URL
✅ HTTPS обязателен (Render предоставляет SSL)
```

### 3. SQL инъекции
```
✅ Используются prepared statements
✅ Параметризованные запросы через sqlite3
✅ Нет конкатенации SQL строк
```

### 4. CORS
```
✅ Настроен для доступа с любого домена (можно ограничить)
✅ Preflight requests обрабатываются
```

## 🚀 Deployment на Render

### Файловая структура на Render:
```
/opt/render/project/src/
├── server/
├── admin/
│   └── dist/          # Собранная админ-панель
├── questions.json
├── voteku_test.db     # SQLite база данных
├── package.json
└── node_modules/
```

### Процесс деплоя:
```
1. Git push → GitHub
2. Render обнаруживает изменения
3. npm install (backend)
4. npm install --prefix admin (frontend)
5. npm run build --prefix admin (сборка React)
6. npm start (запуск сервера)
7. Инициализация БД
8. Настройка Telegram webhook
```

### Environment Variables:
```
NODE_ENV=production
PORT=3001
TELEGRAM_BOT_TOKEN=<secret>
WEBHOOK_URL=https://voteku-test-system.onrender.com
```

## 📈 Масштабирование

### Текущие ограничения:
- SQLite (однопоточная БД)
- Один инстанс сервера
- Файловое хранилище данных

### Пути улучшения:
1. **PostgreSQL** - для множественных инстансов
2. **Redis** - для кеширования сессий
3. **CDN** - для статических файлов админ-панели
4. **Load Balancer** - для распределения нагрузки

## 🔄 Жизненный цикл запроса

### Telegram Bot запрос:
```
1. Пользователь → Telegram API
2. Telegram API → Render (webhook)
3. Express → telegramBot.js
4. Bot → StateService/TestService
5. Service → Database
6. Database → Service → Bot
7. Bot → Telegram API → Пользователь
```

### Admin Panel запрос:
```
1. Браузер → Render (GET /api/results)
2. Express → routes/api.js
3. Route → ResultService
4. Service → Database
5. Database → Service → Route
6. Route → Express → Браузер (JSON)
```

## 📊 Производительность

### Оптимизации:
- ✅ SQLite индексы на часто запрашиваемых полях
- ✅ Минимизированный React bundle (Vite)
- ✅ Кеширование статических файлов (Express.static)
- ✅ Prepared statements для БД запросов

### Метрики:
- Время ответа API: ~50-100ms
- Холодный старт (Render Free): ~30s
- Горячий ответ: ~200ms
- Размер React bundle: ~150KB (gzip)

---

**Документация актуальна для версии:** 1.0.0
**Последнее обновление:** 2024-01-15
