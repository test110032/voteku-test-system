/**
 * Email Service для отправки результатов тестирования
 *
 * Использует Resend API для отправки писем (работает лучше на облачных хостингах).
 * Бесплатный тариф: 100 писем/день, 3000 писем/месяц
 *
 * Настройка:
 * 1. Зарегистрироваться на https://resend.com
 * 2. Создать API Key
 * 3. Добавить домен или использовать onboarding@resend.dev для тестов
 * 4. Установить RESEND_API_KEY в переменных окружения
 */

import { Resend } from 'resend';
import { getResultDetail } from './resultService.js';

/**
 * Форматирует результаты теста в HTML для письма
 */
const formatResultsHtml = (sessionInfo, logs) => {
  const percentage = Math.round((sessionInfo.score / sessionInfo.total_questions) * 100);
  const completedDate = new Date(sessionInfo.completed_at).toLocaleString('uk-UA');

  let questionsHtml = logs.map((log, index) => {
    const userAnswer = log.options[log.user_answer_index] || 'Не відповів';
    const correctAnswer = log.options[log.correct_answer_index];
    const statusIcon = log.is_correct ? '✅' : '❌';
    const statusColor = log.is_correct ? '#28a745' : '#dc3545';

    return `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px; vertical-align: top; width: 30px;">${index + 1}</td>
        <td style="padding: 10px;">
          <strong>${log.question_text}</strong><br>
          <span style="color: ${statusColor};">${statusIcon} Відповідь: ${userAnswer}</span>
          ${!log.is_correct ? `<br><span style="color: #28a745;">✓ Правильна відповідь: ${correctAnswer}</span>` : ''}
        </td>
      </tr>
    `;
  }).join('');

  const scoreColor = percentage >= 80 ? '#28a745' : percentage >= 60 ? '#ffc107' : '#dc3545';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
      <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="background: #007bff; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">📊 Результати тестування</h1>
        </div>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px;">
          <h2>Інформація про студента</h2>
          <p><strong>Ім'я:</strong> ${sessionInfo.user_name}</p>
          <p><strong>Telegram ID:</strong> ${sessionInfo.telegram_id}</p>
          <p><strong>Дата проходження:</strong> ${completedDate}</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <div style="font-size: 48px; font-weight: bold; color: ${scoreColor};">${sessionInfo.score} / ${sessionInfo.total_questions}</div>
            <div style="font-size: 24px; color: #666;">${percentage}%</div>
            <div style="margin-top: 10px; font-size: 18px;">
              ${percentage >= 80 ? '🏆 Відмінний результат!' :
                percentage >= 60 ? '👍 Добрий результат!' :
                '📚 Потребує додаткової підготовки'}
            </div>
          </div>

          <h2>Детальні відповіді</h2>
          <table style="width: 100%; border-collapse: collapse; background: white;">
            <thead>
              <tr>
                <th style="background: #f0f0f0; padding: 12px; text-align: left;">#</th>
                <th style="background: #f0f0f0; padding: 12px; text-align: left;">Питання та відповідь</th>
              </tr>
            </thead>
            <tbody>
              ${questionsHtml}
            </tbody>
          </table>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Отправляет результаты теста на email через Resend
 */
export const sendTestResults = async (sessionId) => {
  const apiKey = process.env.RESEND_API_KEY;
  const recipientEmails = (process.env.EMAIL_RECIPIENT || 'n.krokhmal@gmail.com, brutdx@gmail.com')
    .split(',')
    .map(email => email.trim());

  if (!apiKey) {
    console.warn('⚠️ RESEND_API_KEY not configured. Email sending disabled.');
    return false;
  }

  const resend = new Resend(apiKey);

  try {
    // Получаем детальные результаты теста
    const result = await getResultDetail(sessionId);

    if (!result) {
      console.error('❌ Session not found:', sessionId);
      return false;
    }

    const { sessionInfo, logs } = result;
    const percentage = Math.round((sessionInfo.score / sessionInfo.total_questions) * 100);

    const { data, error } = await resend.emails.send({
      from: 'Voteku Test <onboarding@resend.dev>',
      to: recipientEmails,
      subject: `📊 Результат тесту: ${sessionInfo.user_name} - ${sessionInfo.score}/${sessionInfo.total_questions} (${percentage}%)`,
      html: formatResultsHtml(sessionInfo, logs)
    });

    if (error) {
      console.error('❌ Resend error:', error);
      return false;
    }

    console.log(`✅ Email sent for session ${sessionId} to ${recipientEmails.join(', ')} (ID: ${data.id})`);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    return false;
  }
};
