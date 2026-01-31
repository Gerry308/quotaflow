import type { Express } from "express";
import type { Server } from "http";

export async function registerRoutes(server: Server, app: Express) {
  // Basic health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", message: "QuotaFlow API is running" });
  });

  // Placeholder for other routes
  app.get("/api/*", (_req, res) => {
    res.status(501).json({ 
      message: "API routes are being configured. Check back soon!" 
    });
  });

  console.log("Routes registered successfully");
}
