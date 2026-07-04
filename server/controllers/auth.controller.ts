import type { Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import { authService } from "../services/auth.service";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  rememberMe: z.boolean().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

function handleError(err: unknown, res: Response) {
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: err.flatten().fieldErrors as Record<string, string[]>,
      },
    });
  }

  const error = err as Error & { statusCode?: number; code?: string };
  return res.status(error.statusCode ?? 500).json({
    success: false,
    error: {
      code: error.code ?? "INTERNAL_ERROR",
      message: error.message,
    },
  });
}

export const authController = {
  async login(req: AuthenticatedRequest, res: Response) {
    try {
      const body = loginSchema.parse(req.body);
      const result = await authService.login(body.email, body.password);
      res.json({ success: true, data: result });
    } catch (err) {
      handleError(err, res);
    }
  },

  async logout(req: AuthenticatedRequest, res: Response) {
    try {
      const refreshToken = req.body?.refreshToken as string | undefined;
      await authService.logout(refreshToken);
      res.json({ success: true, message: "Logged out successfully" });
    } catch (err) {
      handleError(err, res);
    }
  },

  async refresh(req: AuthenticatedRequest, res: Response) {
    try {
      const body = refreshSchema.parse(req.body);
      const tokens = await authService.refresh(body.refreshToken);
      res.json({ success: true, data: tokens });
    } catch (err) {
      handleError(err, res);
    }
  },

  async me(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
      }
      const user = await authService.getMe(req.user.userId);
      res.json({ success: true, data: user });
    } catch (err) {
      handleError(err, res);
    }
  },

  async forgotPassword(req: AuthenticatedRequest, res: Response) {
    try {
      const body = forgotPasswordSchema.parse(req.body);
      const result = await authService.forgotPassword(body.email);
      res.json({ success: true, data: result });
    } catch (err) {
      handleError(err, res);
    }
  },

  async resetPassword(req: AuthenticatedRequest, res: Response) {
    try {
      const body = resetPasswordSchema.parse(req.body);
      if (body.password !== body.confirmPassword) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Passwords do not match" },
        });
      }
      const result = await authService.resetPassword(body.token, body.password);
      res.json({ success: true, data: result });
    } catch (err) {
      handleError(err, res);
    }
  },
};
