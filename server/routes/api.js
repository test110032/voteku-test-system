import express from 'express';
import { getAllResults, getResultDetail, getStatistics } from '../services/resultService.js';

const router = express.Router();

// GET /api/results - Получить список всех завершённых тестов
router.get('/results', async (req, res) => {
  try {
    const results = await getAllResults();
    res.json(results);
  } catch (error) {
    console.error('Ошибка получения результатов:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/results/:sessionId - Получить детальную информацию по тесту
router.get('/results/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await getResultDetail(parseInt(sessionId));

    if (!result) {
      return res.status(404).json({ error: 'Сессия не найдена' });
    }

    res.json(result);
  } catch (error) {
    console.error('Ошибка получения детальной информации:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/statistics - Получить общую статистику
router.get('/statistics', async (req, res) => {
  try {
    const stats = await getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
