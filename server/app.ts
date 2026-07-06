import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { serverEnv, isDev } from "./config/env";
import authRoutes from "./routes/auth.routes";
import { errorMiddleware, notFoundMiddleware } from "./middleware/error.middleware";

/** Legacy Express application (ADR-014). Auth routes retained for local parity; production auth uses Next.js Route Handlers. */
const app = express();

const configuredOrigins = serverEnv.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (configuredOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      if (isDev) {
        try {
          const { hostname } = new URL(origin);
          if (hostname === "localhost" || hostname === "127.0.0.1") {
            callback(null, true);
            return;
          }
        } catch {
          // ignore invalid origin URL
        }
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok", service: "compass-api" } });
});

app.use("/api/auth", authRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
