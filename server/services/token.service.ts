import jwt from "jsonwebtoken";
import { serverEnv } from "../config/env";

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, serverEnv.JWT_SECRET, {
    expiresIn: serverEnv.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, serverEnv.JWT_REFRESH_SECRET, {
    expiresIn: serverEnv.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, serverEnv.JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, serverEnv.JWT_REFRESH_SECRET) as TokenPayload;
}

export function getRefreshExpiryDate(): Date {
  const days = parseInt(serverEnv.JWT_REFRESH_EXPIRES_IN) || 7;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export function getResetExpiryDate(): Date {
  const date = new Date();
  date.setHours(date.getHours() + 1);
  return date;
}
