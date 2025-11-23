// Автор: Стас Чашин @chastnik
// Утилита для валидации пароля на frontend

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Проверка сложности пароля
 * Требования:
 * - Минимум 8 символов
 * - Максимум 128 символов
 * - Хотя бы одна заглавная буква
 * - Хотя бы одна строчная буква
 * - Хотя бы одна цифра
 * - Хотя бы один специальный символ
 */
export function validatePassword(password: string): PasswordValidationResult {
  if (!password) {
    return {
      valid: false,
      error: 'Пароль обязателен'
    };
  }

  if (password.length < 8) {
    return {
      valid: false,
      error: 'Пароль должен содержать минимум 8 символов'
    };
  }

  if (password.length > 128) {
    return {
      valid: false,
      error: 'Пароль не должен превышать 128 символов'
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: 'Пароль должен содержать хотя бы одну заглавную букву'
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      error: 'Пароль должен содержать хотя бы одну строчную букву'
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      error: 'Пароль должен содержать хотя бы одну цифру'
    };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      valid: false,
      error: 'Пароль должен содержать хотя бы один специальный символ (!@#$%^&*()_+-=[]{};\':"|,.<>/? и т.д.)'
    };
  }

  return {
    valid: true
  };
}

