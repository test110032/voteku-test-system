import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllResults } from '../services/api';

const ResultsList = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllResults();
      setResults(data);
    } catch (err) {
      setError('Помилка завантаження результатів: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Не завершено';
    const date = new Date(dateString);
    return date.toLocaleString('uk-UA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreBadge = (score, total) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return 'badge-success';
    if (percentage >= 60) return 'badge-warning';
    return 'badge-danger';
  };

  if (loading) {
    return <div className="loading">⏳ Завантаження результатів...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <strong>❌ Помилка:</strong> {error}
        <br />
        <button className="btn" onClick={loadResults} style={{ marginTop: '10px' }}>
          Спробувати ще раз
        </button>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="empty-state">
        <h3>📭 Результатів поки немає</h3>
        <p>Коли хтось пройде тестування, результати з'являться тут</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '20px' }}>
        <h2 style={{ marginBottom: '10px' }}>📊 Всього тестів пройдено: {results.length}</h2>
        <button className="btn" onClick={loadResults}>
          🔄 Оновити
        </button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Ім'я</th>
            <th>Telegram ID</th>
            <th>Дата проходження</th>
            <th>Результат</th>
            <th>Дії</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => (
            <tr key={result.id}>
              <td>{index + 1}</td>
              <td><strong>{result.user_name}</strong></td>
              <td>{result.telegram_id}</td>
              <td>{formatDate(result.completed_at)}</td>
              <td>
                <span className={`badge ${getScoreBadge(result.score, result.total_questions)}`}>
                  {result.score} / {result.total_questions} ({Math.round((result.score / result.total_questions) * 100)}%)
                </span>
              </td>
              <td>
                <Link to={`/results/${result.id}`} className="btn">
                  Детально
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResultsList;
