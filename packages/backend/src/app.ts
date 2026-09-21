import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";
import { createContext } from "@backend/trpc/context.ts";
import { appRouter } from "@backend/routers/index.ts";

export function createApp() {
  const app = express();

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({ router: appRouter, createContext }),
  );

  return app;
}
