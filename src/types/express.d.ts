import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        // add your user properties
      };
    }
  }
}

export interface AuthRequest extends Request {}