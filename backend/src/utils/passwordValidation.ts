// © 2025 Бит.Цифра - Стас Чашин

/**
 * Проверка сложности пароля
 * @param password - пароль для проверки
 * @returns объект с результатом валидации
 */
export const validatePasswordStrength = (password: string): { valid: boolean; error?: string } => {
  if (password.length < 8) {
    return { valid: false, error: 'Пароль должен содержать минимум 8 символов' };
  }
  
  if (password.length > 128) {
    return { valid: false, error: 'Пароль не должен превышать 128 символов' };
  }
  
  // Проверка наличия заглавных букв
  if (!/[A-ZА-Я]/.test(password)) {
    return { valid: false, error: 'Пароль должен содержать хотя бы одну заглавную букву' };
  }
  
  // Проверка наличия строчных букв
  if (!/[a-zа-я]/.test(password)) {
    return { valid: false, error: 'Пароль должен содержать хотя бы одну строчную букву' };
  }
  
  // Проверка наличия цифр
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Пароль должен содержать хотя бы одну цифру' };
  }
  
  // Проверка наличия спецсимволов (опционально, но рекомендуется)
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: 'Пароль должен содержать хотя бы один специальный символ (!@#$%^&* и т.д.)' };
  }
  
  return { valid: true };
};

