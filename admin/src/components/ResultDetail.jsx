import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getResultDetail } from '../services/api';

const ResultDetail = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDetail();
  }, [id]);

  const loadDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getResultDetail(id);
      setData(result);
    } catch (err) {
      setError('Помилка завантаження деталей: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Невідомо';
    const date = new Date(dateString);
    return date.toLocaleString('uk-UA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="loading">⏳ Завантаження деталей...</div>;
  }

  if (error) {
    return (
      <div>
        <Link to="/" className="back-link">← Повернутися до списку</Link>
        <div className="error">
          <strong>❌ Помилка:</strong> {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <Link to="/" className="back-link">← Повернутися до списку</Link>
        <div className="empty-state">
          <h3>Результат не знайдено</h3>
        </div>
      </div>
    );
  }

  const { sessionInfo, logs } = data;
  const percentage = Math.round((sessionInfo.score / sessionInfo.total_questions) * 100);

  return (
    <div>
      <Link to="/" className="back-link">← Повернутися до списку</Link>

      <div className="card">
        <h2 style={{ marginBottom: '20px' }}>👤 {sessionInfo.user_name}</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          <div>
            <strong>Telegram ID:</strong>
            <div>{sessionInfo.telegram_id}</div>
          </div>
          <div>
            <strong>Дата проходження:</strong>
            <div>{formatDate(sessionInfo.completed_at)}</div>
          </div>
          <div>
            <strong>Результат:</strong>
            <div style={{ fontSize: '20px', fontWeight: '700', color: percentage >= 80 ? '#28a745' : percentage >= 60 ? '#ffc107' : '#dc3545' }}>
              {sessionInfo.score} / {sessionInfo.total_questions} ({percentage}%)
            </div>
          </div>
        </div>
      </div>

      <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>📝 Детальні відповіді</h3>

      {logs.map((log, index) => (
        <div key={log.id} className="question-item">
          <div className="question-header">
            Питання {index + 1}: {log.question_text}
          </div>

          <div style={{ marginTop: '10px' }}>
            {log.options.map((option, optionIndex) => {
              const isCorrect = optionIndex === log.correct_answer_index;
              const isUserAnswer = optionIndex === log.user_answer_index;

              let className = 'option neutral';
              let prefix = '';

              if (isCorrect) {
                className = 'option correct';
                prefix = '✅ ';
              } else if (isUserAnswer && !isCorrect) {
                className = 'option incorrect';
                prefix = '❌ ';
              }

              return (
                <div key={optionIndex} className={className}>
                  {prefix}{option}
                  {isUserAnswer && isCorrect && ' (відповідь користувача)'}
                  {isUserAnswer && !isCorrect && ' (відповідь користувача)'}
                  {!isUserAnswer && isCorrect && ' (правильна відповідь)'}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '10px', fontSize: '14px', color: log.is_correct ? '#28a745' : '#dc3545', fontWeight: '500' }}>
            {log.is_correct ? '✅ Правильно' : '❌ Неправильно'}
          </div>
        </div>
      ))}

      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <Link to="/" className="btn btn-secondary">
          ← Повернутися до списку
        </Link>
      </div>
    </div>
  );
};

export default ResultDetail;
