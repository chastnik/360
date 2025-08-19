import { Request, Response, NextFunction } from 'express';
import { AuthTokenPayload } from '../types';
export interface AuthRequest extends Request {
    user?: AuthTokenPayload;
    headers: any;
}
export declare const authenticateToken: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requireRole: (roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const requireAdmin: (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const requireManagerOrAdmin: (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const requirePermission: (permission: string) => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.d.ts.map