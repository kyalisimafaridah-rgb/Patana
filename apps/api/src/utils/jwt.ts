import jwt, { type SignOptions } from 'jsonwebtoken';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'dev-secret-change-me' || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'FATAL: JWT_SECRET must be set to a strong random string (32+ chars) in production'
      );
    }
    console.warn(
      '⚠️  JWT_SECRET is missing or weak. Set a strong JWT_SECRET in .env before any real use.'
    );
    return secret && secret.length > 0 ? secret : 'dev-secret-change-me-NOT-FOR-PRODUCTION';
  }
  return secret;
}

export interface TokenPayload {
  sub: string;
  role: 'seller' | 'admin';
  email?: string;
  whatsapp?: string;
}

export function signSellerToken(payload: { sellerId: string; whatsapp: string }) {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
  };
  return jwt.sign(
    { sub: payload.sellerId, role: 'seller', whatsapp: payload.whatsapp },
    getSecret(),
    options
  );
}

export function signAdminToken(payload: { adminId: string; email: string; role: string }) {
  const options: SignOptions = {
    expiresIn: (process.env.ADMIN_JWT_EXPIRES_IN || '1d') as SignOptions['expiresIn'],
  };
  return jwt.sign(
    { sub: payload.adminId, role: 'admin', email: payload.email },
    getSecret(),
    options
  );
}

/** Short-lived token for review links (7 days) */
export function signReviewToken(payload: {
  transactionId: string;
  sellerId: string;
  buyerWhatsapp: string;
}) {
  const options: SignOptions = { expiresIn: '7d' };
  return jwt.sign(
    {
      sub: payload.transactionId,
      role: 'review',
      sellerId: payload.sellerId,
      buyerWhatsapp: payload.buyerWhatsapp,
    },
    getSecret(),
    options
  );
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, getSecret()) as TokenPayload;
}

export function verifyReviewToken(token: string): {
  sub: string;
  role: string;
  sellerId: string;
  buyerWhatsapp: string;
} {
  const payload = jwt.verify(token, getSecret()) as any;
  if (payload.role !== 'review') throw new Error('Invalid review token');
  return payload;
}
