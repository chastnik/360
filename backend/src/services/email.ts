// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
/* eslint-disable no-console */
import nodemailer, { Transporter } from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured: boolean = false;

  /**
   * Инициализация сервиса email
   */
  initialize(): void {
    const emailHost = process.env.EMAIL_HOST;
    const emailPort = process.env.EMAIL_PORT;
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;

    if (!emailHost || !emailPort || !emailUser || !emailPassword) {
      console.warn('⚠️  Email сервис не настроен. Переменные окружения EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD не установлены.');
      console.warn('   Для работы отправки email настройте эти переменные в .env файле.');
      this.isConfigured = false;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: emailHost,
        port: parseInt(emailPort, 10),
        secure: parseInt(emailPort, 10) === 465, // true для 465, false для других портов
        auth: {
          user: emailUser,
          pass: emailPassword
        }
      });

      this.isConfigured = true;
      console.log('✅ Email сервис инициализирован');
    } catch (error: any) {
      console.error('❌ Ошибка инициализации email сервиса:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Проверка подключения к SMTP серверу
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error: any) {
      console.error('Ошибка проверки SMTP подключения:', error.message);
      return false;
    }
  }

  /**
   * Отправка email
   */
  async sendEmail(options: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
  }): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.warn('⚠️  Email сервис не настроен. Письмо не отправлено.');
      console.warn(`   Предполагаемое письмо: ${options.subject} -> ${options.to}`);
      return false;
    }

    try {
      const fromEmail = process.env.EMAIL_USER || 'noreply@company.com';
      const fromName = process.env.EMAIL_FROM_NAME || '360 Assessment';

      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text
      });

      console.log(`✅ Email отправлен: ${options.subject} -> ${options.to}`);
      return true;
    } catch (error: any) {
      console.error('❌ Ошибка отправки email:', error.message);
      return false;
    }
  }

  /**
   * Отправка письма для сброса пароля
   */
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    const subject = 'Сброс пароля - 360 Assessment';
    const text = `
Здравствуйте!

Вы запросили сброс пароля для вашей учетной записи в системе 360 Assessment.

Для сброса пароля перейдите по следующей ссылке:
${resetUrl}

Ссылка действительна в течение 1 часа.

Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.

С уважением,
Команда 360 Assessment
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #f9f9f9;
      padding: 30px;
      border-radius: 8px;
      border: 1px solid #ddd;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #007bff;
      color: #ffffff;
      text-decoration: none;
      border-radius: 4px;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #0056b3;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Сброс пароля</h2>
    <p>Здравствуйте!</p>
    <p>Вы запросили сброс пароля для вашей учетной записи в системе 360 Assessment.</p>
    <p>Для сброса пароля нажмите на кнопку ниже:</p>
    <p style="text-align: center;">
      <a href="${resetUrl}" class="button">Сбросить пароль</a>
    </p>
    <p>Или скопируйте и вставьте следующую ссылку в браузер:</p>
    <p style="word-break: break-all; color: #007bff;">${resetUrl}</p>
    <p><strong>Ссылка действительна в течение 1 часа.</strong></p>
    <p>Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
    <div class="footer">
      <p>С уважением,<br>Команда 360 Assessment</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return await this.sendEmail({
      to: email,
      subject,
      text,
      html
    });
  }
}

const emailService = new EmailService();
emailService.initialize();

export default emailService;








