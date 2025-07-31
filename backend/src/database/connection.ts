// Обратная совместимость - используем новый сервис БД
import databaseService, { db } from '../services/database';

export { db };
export default db; 

// Экспорт сервиса для прямого использования
export { databaseService }; 