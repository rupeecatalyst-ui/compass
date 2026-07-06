import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import { authService } from "../services/auth.service";
import {
  forgotPasswordSchema,
  formatAuthError,
  loginSchema,
  refreshSchema,
  resetPasswordSchema,
} from "../validators/auth.validators";

function sendAuthError(err: unknown, res: Response) {
  const { status, body } = formatAuthError(err);
  return res.status(status).json(body);
}

export const authController = {
  async login(req: AuthenticatedRequest, res: Response) {
    try {
      const body = loginSchema.parse(req.body);
      const result = await authService.login(body.email, body.password);
      res.json({ success: true, data: result });
    } catch (err) {
      sendAuthError(err, res);
    }
  },

  async logout(req: AuthenticatedRequest, res: Response) {
    try {
      const refreshToken = req.body?.refreshToken as string | undefined;
      await authService.logout(refreshToken);
      res.json({ success: true, message: "Logged out successfully" });
    } catch (err) {
      sendAuthError(err, res);
    }
  },

  async refresh(req: AuthenticatedRequest, res: Response) {
    try {
      const body = refreshSchema.parse(req.body);
      const tokens = await authService.refresh(body.refreshToken);
      res.json({ success: true, data: tokens });
    } catch (err) {
      sendAuthError(err, res);
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
      sendAuthError(err, res);
    }
  },

  async forgotPassword(req: AuthenticatedRequest, res: Response) {
    try {
      const body = forgotPasswordSchema.parse(req.body);
      const result = await authService.forgotPassword(body.email);
      res.json({ success: true, data: result });
    } catch (err) {
      sendAuthError(err, res);
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
      sendAuthError(err, res);
    }
  },
};
