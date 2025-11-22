// Скрипт для исправления кодировки в названиях сертификатов
const knex = require('knex');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const db = knex({
  client: 'postgresql',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'assessment_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  }
});

async function fixEncoding() {
  try {
    const certificates = await db('certificates').select('*');
    console.log('Found', certificates.length, 'certificates');
    
    for (const cert of certificates) {
      let fixedName = cert.name;
      let fixedFileName = cert.file_name;
      
      // Исправляем кодировку названия
      if (/Ð|Ñ|Ð|Ñ/.test(fixedName)) {
        try {
          fixedName = Buffer.from(fixedName, 'latin1').toString('utf8');
        } catch (e) {
          console.log('Error fixing name for cert', cert.id, ':', e.message);
        }
      }
      
      // Исправляем кодировку имени файла
      if (/Ð|Ñ|Ð|Ñ/.test(fixedFileName)) {
        try {
          fixedFileName = Buffer.from(fixedFileName, 'latin1').toString('utf8');
        } catch (e) {
          console.log('Error fixing file_name for cert', cert.id, ':', e.message);
        }
      }
      
      if (fixedName !== cert.name || fixedFileName !== cert.file_name) {
        await db('certificates')
          .where('id', cert.id)
          .update({
            name: fixedName,
            file_name: fixedFileName
          });
        console.log('Fixed certificate', cert.id);
        console.log('  Name:', cert.name, '->', fixedName);
        console.log('  File:', cert.file_name, '->', fixedFileName);
      }
    }
    
    console.log('Done!');
    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await db.destroy();
    process.exit(1);
  }
}

fixEncoding();

