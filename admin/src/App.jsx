const App = () => {
  const botLink = 'https://t.me/voteku_test_bot';

  return (
    <div className="welcome-page">
      <div className="welcome-container">
        <div className="welcome-header">
          <div className="logo">🎓</div>
          <h1>Система тестування</h1>
          <p className="subtitle">Перевірка професійних знань</p>
        </div>

        <div className="welcome-card">
          <h2>👋 Вітаємо!</h2>
          <p>
            Ця система призначена для проходження тестування з питань
            професійної діяльності співробітників ВОТЕКУ та диспетчерів ОДС.
          </p>
        </div>

        <div className="instructions-card">
          <h2>📋 Інструкція з проходження тесту</h2>
          <ol className="steps">
            <li>
              <span className="step-number">1</span>
              <div className="step-content">
                <strong>Відкрийте Telegram</strong>
                <p>Переконайтесь, що у вас встановлений месенджер Telegram на телефоні або комп'ютері</p>
              </div>
            </li>
            <li>
              <span className="step-number">2</span>
              <div className="step-content">
                <strong>Перейдіть до бота</strong>
                <p>Натисніть кнопку нижче або знайдіть бота за назвою @voteku_test_bot</p>
              </div>
            </li>
            <li>
              <span className="step-number">3</span>
              <div className="step-content">
                <strong>Розпочніть тестування</strong>
                <p>Натисніть кнопку "Старт" або введіть команду /start</p>
              </div>
            </li>
            <li>
              <span className="step-number">4</span>
              <div className="step-content">
                <strong>Введіть ваше ім'я та прізвище</strong>
                <p>Бот запитає ваші дані для ідентифікації результату</p>
              </div>
            </li>
            <li>
              <span className="step-number">5</span>
              <div className="step-content">
                <strong>Оберіть тип тесту та дайте відповіді</strong>
                <p>ВОТЕКУ: 30 питань з банку 90 питань | ОДС: 50 питань з банку 100 питань</p>
              </div>
            </li>
          </ol>
        </div>

        <div className="cta-section">
          <a href={botLink} target="_blank" rel="noopener noreferrer" className="cta-button">
            <span className="telegram-icon">✈️</span>
            Розпочати тестування в Telegram
          </a>
          <p className="cta-note">
            Посилання відкриється в новому вікні
          </p>
        </div>

        <div className="info-cards">
          <div className="info-card">
            <span className="info-icon">⏱️</span>
            <h3>Без обмежень часу</h3>
            <p>Ви можете відповідати у зручному для вас темпі</p>
          </div>
          <div className="info-card">
            <span className="info-icon">❓</span>
            <h3>Два типи тестів</h3>
            <p>ВОТЕКУ (30 питань) або ОДС (50 питань)</p>
          </div>
          <div className="info-card">
            <span className="info-icon">📊</span>
            <h3>Миттєвий результат</h3>
            <p>Дізнайтесь свій бал одразу після завершення</p>
          </div>
        </div>

        <footer className="welcome-footer">
          <p>© 2024 Система тестування професійних знань.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
