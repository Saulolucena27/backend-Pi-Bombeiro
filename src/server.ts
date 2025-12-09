import dotenv from 'dotenv';
dotenv.config();

import http from 'http'; // <--- Importe o http
import app from './app';
import { initSocket } from './socket'; // <--- Importe nossa função

const PORT = process.env.PORT || 3001;

// 1. Criar servidor HTTP usando o app Express
const httpServer = http.createServer(app);

// 2. Inicializar o Socket.io nesse servidor
initSocket(httpServer);

// 3. Mudar de app.listen para httpServer.listen
httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🚒 SISOCC Backend - Sistema de Ocorrências      ║
║   📍 Corpo de Bombeiros de Recife/PE              ║
║                                                   ║
║   🚀 Server running on port ${PORT}                  ║
║   📡 Socket.io: ATIVO                             ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
  `);
});