/**
 * Email Service для отправки результатов тестирования
 *
 * Использует Gmail SMTP для отправки писем.
 * Требует настройки "App Password" в Google Account:
 * 1. Включить 2FA в Google Account
 * 2. Создать App Password: https://myaccount.google.com/apppasswords
 * 3. Использовать созданный пароль в EMAIL_PASSWORD
 */

import nodemailer from 'nodemailer';
import { getResultDetail } from './resultService.js';

// Создание транспорта для отправки email
const createTransporter = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;

  if (!emailUser || !emailPassword) {
    console.warn('⚠️ Email credentials not configured. Email sending disabled.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPassword
    }
  });
};

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

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .score-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .score { font-size: 48px; font-weight: bold; color: ${percentage >= 80 ? '#28a745' : percentage >= 60 ? '#ffc107' : '#dc3545'}; }
        table { width: 100%; border-collapse: collapse; background: white; }
        th { background: #f0f0f0; padding: 12px; text-align: left; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Результати тестування</h1>
        </div>
        <div class="content">
          <h2>Інформація про студента</h2>
          <p><strong>Ім'я:</strong> ${sessionInfo.user_name}</p>
          <p><strong>Telegram ID:</strong> ${sessionInfo.telegram_id}</p>
          <p><strong>Дата проходження:</strong> ${completedDate}</p>

          <div class="score-box">
            <div class="score">${sessionInfo.score} / ${sessionInfo.total_questions}</div>
            <div style="font-size: 24px; color: #666;">${percentage}%</div>
            <div style="margin-top: 10px; font-size: 18px;">
              ${percentage >= 80 ? '🏆 Відмінний результат!' :
                percentage >= 60 ? '👍 Добрий результат!' :
                '📚 Потребує додаткової підготовки'}
            </div>
          </div>

          <h2>Детальні відповіді</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Питання та відповідь</th>
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
 * Отправляет результаты теста на email
 */
export const sendTestResults = async (sessionId) => {
  const transporter = createTransporter();
  const recipientEmail = process.env.EMAIL_RECIPIENT || 'n.krokhmal@gmail.com, brutdx@gmail.com';

  if (!transporter) {
    console.log('📧 Email not sent - credentials not configured');
    return false;
  }

  try {
    // Получаем детальные результаты теста
    const result = await getResultDetail(sessionId);

    if (!result) {
      console.error('❌ Session not found:', sessionId);
      return false;
    }

    const { sessionInfo, logs } = result;
    const percentage = Math.round((sessionInfo.score / sessionInfo.total_questions) * 100);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: `📊 Результат тесту: ${sessionInfo.user_name} - ${sessionInfo.score}/${sessionInfo.total_questions} (${percentage}%)`,
      html: formatResultsHtml(sessionInfo, logs)
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent for session ${sessionId} to ${recipientEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    return false;
  }
};
