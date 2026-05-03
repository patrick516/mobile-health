// src/index.js

import "dotenv/config";
import http from "http";
import app from "./app.js";
import { env } from "./config/env.js";
import prisma from "./config/db.js";
import { initSocket } from "./config/socket.js";

const start = async () => {
  try {
    await prisma.$connect();
    console.log(" Database connected");

    const httpServer = http.createServer(app);

    initSocket(httpServer);
    console.log(" WebSocket server initialized");

    httpServer.listen(env.PORT, () => {
      console.log(`\n Server running on http://localhost:${env.PORT}`);
      console.log(`   Mobile API → http://localhost:${env.PORT}/api/mobile`);
      console.log(`   Admin  API → http://localhost:${env.PORT}/api/admin`);
      console.log(`   WebSocket  → ws://localhost:${env.PORT}\n`);
    });
  } catch (err) {
    console.error(" Failed to start server:", err);
    await prisma.$disconnect();
    process.exit(1);
  }
};

start();
