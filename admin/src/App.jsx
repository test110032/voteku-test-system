import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ResultsList from './components/ResultsList';
import ResultDetail from './components/ResultDetail';

const App = () => {
  return (
    <Router>
      <div>
        <header className="header">
          <div className="container">
            <h1>🎓 Voteku Test System - Адмін панель</h1>
            <p>Система тестування співробітників</p>
          </div>
        </header>

        <div className="container">
          <Routes>
            <Route path="/" element={<ResultsList />} />
            <Route path="/results/:id" element={<ResultDetail />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
