import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

interface SystemSettings {
  ratingScale: number
  cycleDuration: number
  emailNotifications: boolean
  requireComments: boolean
  reminderDays: number
  mattermostIntegration: boolean
  autoReminders: boolean
}

const DEFAULT_SETTINGS: SystemSettings = {
  ratingScale: 5,
  cycleDuration: 14,
  emailNotifications: true,
  requireComments: true,
  reminderDays: 3,
  mattermostIntegration: true,
  autoReminders: true,
}

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'system-settings.json')

async function ensureSettingsFile() {
  try {
    // Создаем директорию data если её нет
    const dataDir = path.dirname(SETTINGS_FILE)
    await fs.mkdir(dataDir, { recursive: true })
    
    // Проверяем существует ли файл настроек
    await fs.access(SETTINGS_FILE)
  } catch (error) {
    // Если файла нет, создаем его с дефолтными настройками
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2))
  }
}

async function loadSettings(): Promise<SystemSettings> {
  try {
    await ensureSettingsFile()
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8')
    const settings = JSON.parse(data)
    
    // Объединяем с дефолтными настройками на случай если какие-то поля отсутствуют
    return { ...DEFAULT_SETTINGS, ...settings }
  } catch (error) {
    console.error('Error loading settings:', error)
    return DEFAULT_SETTINGS
  }
}

async function saveSettings(settings: SystemSettings): Promise<void> {
  try {
    await ensureSettingsFile()
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2))
  } catch (error) {
    console.error('Error saving settings:', error)
    throw new Error('Failed to save settings')
  }
}

export async function GET(request: NextRequest) {
  try {
    const settings = await loadSettings()
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const currentSettings = await loadSettings()
    
    // Валидация входных данных
    const updatedSettings: SystemSettings = {
      ratingScale: Number(body.ratingScale) || currentSettings.ratingScale,
      cycleDuration: Number(body.cycleDuration) || currentSettings.cycleDuration,
      emailNotifications: Boolean(body.emailNotifications),
      requireComments: Boolean(body.requireComments),
      reminderDays: Number(body.reminderDays) || currentSettings.reminderDays,
      mattermostIntegration: Boolean(body.mattermostIntegration),
      autoReminders: Boolean(body.autoReminders),
    }

    // Дополнительная валидация
    if (updatedSettings.ratingScale < 1 || updatedSettings.ratingScale > 10) {
      return NextResponse.json(
        { error: 'Rating scale must be between 1 and 10' },
        { status: 400 }
      )
    }

    if (updatedSettings.cycleDuration < 1 || updatedSettings.cycleDuration > 365) {
      return NextResponse.json(
        { error: 'Cycle duration must be between 1 and 365 days' },
        { status: 400 }
      )
    }

    if (updatedSettings.reminderDays < 1 || updatedSettings.reminderDays > 30) {
      return NextResponse.json(
        { error: 'Reminder days must be between 1 and 30' },
        { status: 400 }
      )
    }

    await saveSettings(updatedSettings)
    
    return NextResponse.json({ 
      settings: updatedSettings,
      message: 'Settings updated successfully'
    })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
} 