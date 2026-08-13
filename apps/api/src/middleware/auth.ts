import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt.js';
import prisma from '../config/prisma.js';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = header.slice(7);
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

/**
 * Seller must be authenticated AND still ACTIVE or GRACE_PERIOD in the database.
 * Suspended / offline sellers cannot use seller APIs even with a valid JWT.
 */
export async function requireSeller(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = header.slice(7);
    const payload = verifyToken(token);
    if (payload.role !== 'seller') {
      return res.status(403).json({ error: 'Seller access required' });
    }

    const seller = await prisma.seller.findUnique({
      where: { id: payload.sub },
      select: { id: true, accountStatus: true },
    });

    if (!seller) {
      return res.status(401).json({ error: 'Seller account not found' });
    }
    if (!['ACTIVE', 'GRACE_PERIOD'].includes(seller.accountStatus)) {
      return res.status(403).json({
        error: 'Seller account is not active',
        accountStatus: seller.accountStatus,
      });
    }

    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
