// Заглушка для email сервиса - в продакшне здесь должен быть настоящий email провайдер

export interface EmailTemplate {
  to: string
  subject: string
  text: string
  html: string
}

class EmailService {
  private isEnabled: boolean

  constructor() {
    // В продакшне здесь будут настройки SMTP или сервиса типа SendGrid
    this.isEnabled = process.env.EMAIL_ENABLED === 'true'
  }

  /**
   * Отправка email о завершении цикла оценки
   */
  async sendCycleCompletedEmail(
    userEmail: string,
    userName: string,
    cycleName: string,
    resultsUrl: string,
    overallScore?: number
  ): Promise<void> {
    if (!this.isEnabled) {
      console.log('Email отправка отключена. Email уведомление не отправлено.')
      return
    }

    const email: EmailTemplate = {
      to: userEmail,
      subject: `Завершен цикл 360° оценки: ${cycleName}`,
      text: this.generateTextEmail(userName, cycleName, resultsUrl, overallScore),
      html: this.generateHtmlEmail(userName, cycleName, resultsUrl, overallScore)
    }

    try {
      await this.sendEmail(email)
      console.log(`Email отправлен пользователю ${userEmail} о завершении цикла ${cycleName}`)
    } catch (error) {
      console.error('Ошибка отправки email:', error)
      throw error
    }
  }

  /**
   * Отправка email администраторам о завершении цикла
   */
  async sendAdminCycleCompletedEmail(
    adminEmail: string,
    cycleName: string,
    subjectName: string,
    completionRate: number,
    adminUrl: string
  ): Promise<void> {
    if (!this.isEnabled) {
      console.log('Email отправка отключена. Admin email уведомление не отправлено.')
      return
    }

    const email: EmailTemplate = {
      to: adminEmail,
      subject: `[Админ] Завершен цикл 360° оценки: ${cycleName}`,
      text: this.generateAdminTextEmail(cycleName, subjectName, completionRate, adminUrl),
      html: this.generateAdminHtmlEmail(cycleName, subjectName, completionRate, adminUrl)
    }

    try {
      await this.sendEmail(email)
      console.log(`Admin email отправлен ${adminEmail} о завершении цикла ${cycleName}`)
    } catch (error) {
      console.error('Ошибка отправки admin email:', error)
      throw error
    }
  }

  private generateTextEmail(
    userName: string,
    cycleName: string,
    resultsUrl: string,
    overallScore?: number
  ): string {
    return `
Здравствуйте, ${userName}!

Ваш цикл 360-градусной оценки "${cycleName}" успешно завершен.

${overallScore ? `Ваш общий балл: ${overallScore} из 5` : ''}

Вы можете ознакомиться с результатами оценки по ссылке:
${resultsUrl}

В результатах вы увидите:
• Оценки по всем категориям компетенций
• Комментарии от коллег
• Анализ ваших сильных сторон и областей для развития

Обратите внимание: имена оценивающих скрыты для обеспечения объективности и честности обратной связи.

С уважением,
Система 360° оценки БИТ.Цифра
    `.trim()
  }

  private generateHtmlEmail(
    userName: string,
    cycleName: string,
    resultsUrl: string,
    overallScore?: number
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1976d2; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
        .score { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .button { display: inline-block; background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .features { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .feature { margin: 10px 0; }
        .feature::before { content: "✓"; color: #4caf50; font-weight: bold; margin-right: 8px; }
        .footer { text-align: center; color: #666; margin-top: 30px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Завершена 360° оценка</h1>
            <h2>${cycleName}</h2>
        </div>
        
        <div class="content">
            <p>Здравствуйте, <strong>${userName}</strong>!</p>
            
            <p>Ваш цикл 360-градусной оценки успешно завершен. Поздравляем с прохождением важного этапа профессионального развития!</p>
            
            ${overallScore ? `
                <div class="score">
                    <h3>🏆 Ваш общий балл</h3>
                    <h2 style="color: #1976d2; margin: 0;">${overallScore} из 5</h2>
                </div>
            ` : ''}
            
            <div style="text-align: center;">
                <a href="${resultsUrl}" class="button">📊 Посмотреть результаты</a>
            </div>
            
            <div class="features">
                <h3>В результатах вы найдете:</h3>
                <div class="feature">Оценки по всем категориям компетенций</div>
                <div class="feature">Детальные комментарии от коллег</div>
                <div class="feature">Анализ сильных сторон</div>
                <div class="feature">Рекомендации для развития</div>
                <div class="feature">Сравнение самооценки с оценкой коллег</div>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <strong>🔒 Конфиденциальность:</strong> Имена всех оценивающих скрыты для обеспечения объективности и честности обратной связи.
            </div>
        </div>
        
        <div class="footer">
            С уважением,<br>
            <strong>Система 360° оценки БИТ.Цифра</strong>
        </div>
    </div>
</body>
</html>
    `.trim()
  }

  private generateAdminTextEmail(
    cycleName: string,
    subjectName: string,
    completionRate: number,
    adminUrl: string
  ): string {
    return `
Уведомление для администратора

Завершен цикл 360° оценки: "${cycleName}"
Оцениваемый сотрудник: ${subjectName}
Процент завершенности: ${completionRate}%

Подробная информация доступна в панели администратора:
${adminUrl}

Система 360° оценки БИТ.Цифра
    `.trim()
  }

  private generateAdminHtmlEmail(
    cycleName: string,
    subjectName: string,
    completionRate: number,
    adminUrl: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f57c00; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
        .stats { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .stat { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
        .button { display: inline-block; background: #f57c00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>👨‍💼 Админ уведомление</h1>
            <h2>Завершен цикл оценки</h2>
        </div>
        
        <div class="content">
            <div class="stats">
                <div class="stat">
                    <span><strong>Название цикла:</strong></span>
                    <span>${cycleName}</span>
                </div>
                <div class="stat">
                    <span><strong>Оцениваемый:</strong></span>
                    <span>${subjectName}</span>
                </div>
                <div class="stat">
                    <span><strong>Завершенность:</strong></span>
                    <span>${completionRate}%</span>
                </div>
            </div>
            
            <div style="text-align: center;">
                <a href="${adminUrl}" class="button">🔧 Панель администратора</a>
            </div>
        </div>
    </div>
</body>
</html>
    `.trim()
  }

  private async sendEmail(email: EmailTemplate): Promise<void> {
    // В продакшне здесь будет реальная отправка через SMTP или API
    // Например, через nodemailer, SendGrid, AWS SES и т.д.
    
    console.log('=== EMAIL ОТПРАВЛЕН (ЗАГЛУШКА) ===')
    console.log(`To: ${email.to}`)
    console.log(`Subject: ${email.subject}`)
    console.log(`Text: ${email.text}`)
    console.log('=====================================')
    
    // Имитация задержки отправки
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

export const emailService = new EmailService() 