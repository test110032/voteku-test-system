import { initDatabase, closeDatabase } from './db.js';

console.log('🚀 Запуск инициализации базы данных...\n');

initDatabase()
  .then(() => {
    console.log('\n✅ База данных успешно создана и готова к использованию!');
    return closeDatabase();
  })
  .catch((error) => {
    console.error('\n❌ Ошибка при инициализации:', error);
    process.exit(1);
  });
