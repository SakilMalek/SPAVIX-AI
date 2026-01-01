import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import 'dotenv/config';
import { authRoutes } from "./routes/auth.js";
import { generationRoutes } from "./routes/generation.js";
import { uploadRoutes } from "./routes/upload.js";
import productsRoutes from "./routes/products.js";
import { materialsRoutes } from "./routes/materials.js";
import { stylesRoutes } from "./routes/styles.js";
import { projectRoutes } from "./routes/projects.js";
import { chatRoutes } from "./routes/chat.js";
import { Database } from "./db.js";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Initialize database
  await Database.initializeDatabase();

  // Register auth routes
  app.use("/api/auth", authRoutes);

  // Register other routes
  app.use("/api/generations", generationRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/products", productsRoutes);
  app.use("/api/materials", materialsRoutes);
  app.use("/api/styles", stylesRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/chat", chatRoutes);

  return httpServer;
}
