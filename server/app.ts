import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { serverEnv } from "./config/env";
import authRoutes from "./routes/auth.routes";
import { errorMiddleware, notFoundMiddleware } from "./middleware/error.middleware";

const app = express();

app.use(
  cors({
    origin: serverEnv.CORS_ORIGIN,
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
