import dotenv from 'dotenv';
dotenv.config();

import app from './app';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🚒 SISOCC Backend - Sistema de Ocorrências      ║
║   📍 Corpo de Bombeiros de Recife/PE              ║
║                                                   ║
║   🚀 Server running on port ${PORT}                  ║
║   🌐 Environment: ${process.env.NODE_ENV || 'development'}               ║
║   📊 Database: PostgreSQL                         ║
║                                                   ║
║   📡 API: http://localhost:${PORT}                   ║
║   📚 Docs: http://localhost:${PORT}/api/health       ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
  `);
});