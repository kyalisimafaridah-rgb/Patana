import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { comparePassword } from '../utils/password.js';
import { signAdminToken, signSellerToken } from '../utils/jwt.js';
import { normalizePhone, phonesMatch } from '../utils/phone.js';
import { generateOtpCode } from '../utils/reference.js';
import { authLimiter, otpLimiter } from '../utils/rateLimiters.js';

const router = Router();

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// POST /api/v1/auth/admin-login
router.post('/admin-login', authLimiter, async (req, res) => {
  try {
    const body = adminLoginSchema.parse(req.body);
    const admin = await prisma.admin.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await comparePassword(body.password, admin.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });

    const token = signAdminToken({
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
    });

    res.json({
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: err.errors });
    }
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/v1/auth/request-otp
 * Seller must be ACTIVE/GRACE. Creates OTP in DB (10 min).
 * Production: send via WhatsApp Business API.
 * Development only: OTP returned in response for testing.
 */
router.post('/request-otp', otpLimiter, async (req, res) => {
  try {
    const schema = z.object({
      referenceNumber: z.string().min(5),
      whatsappNumber: z.string().min(9),
    });
    const body = schema.parse(req.body);
    const ref = body.referenceNumber.trim().toUpperCase();

    const seller = await prisma.seller.findFirst({
      where: {
        referenceNumber: ref,
        accountStatus: { in: ['ACTIVE', 'GRACE_PERIOD'] },
        verificationStatus: 'VERIFIED',
      },
    });

    // Always return generic message to avoid account enumeration
    const generic = {
      message: 'If this seller exists, an OTP was sent to their WhatsApp.',
      expiresInSeconds: 600,
    };

    if (!seller || !phonesMatch(seller.whatsappNumber, body.whatsappNumber)) {
      return res.json(generic);
    }

    // Invalidate previous unused OTPs for this number
    await prisma.otpToken.updateMany({
      where: { whatsappNumber: seller.whatsappNumber, used: false },
      data: { used: true, usedAt: new Date() },
    });

    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.otpToken.create({
      data: {
        whatsappNumber: seller.whatsappNumber,
        otpCode,
        expiresAt,
      },
    });

    // TODO: WhatsApp Business API — send OTP to seller.whatsappNumber
    console.log(`[OTP] ${seller.referenceNumber} → ${otpCode} (expires ${expiresAt.toISOString()})`);

    const payload: any = { ...generic };
    if (process.env.NODE_ENV !== 'production') {
      payload.devOtp = otpCode; // NEVER in production
    }
    res.json(payload);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: err.errors });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to request OTP' });
  }
});

/**
 * POST /api/v1/auth/verify-otp
 */
router.post('/verify-otp', authLimiter, async (req, res) => {
  try {
    const schema = z.object({
      referenceNumber: z.string().min(5),
      whatsappNumber: z.string().min(9),
      otp: z.string().min(4).max(8),
    });
    const body = schema.parse(req.body);
    const ref = body.referenceNumber.trim().toUpperCase();

    const seller = await prisma.seller.findFirst({
      where: {
        referenceNumber: ref,
        accountStatus: { in: ['ACTIVE', 'GRACE_PERIOD'] },
        verificationStatus: 'VERIFIED',
      },
    });

    if (!seller || !phonesMatch(seller.whatsappNumber, body.whatsappNumber)) {
      return res.status(401).json({ error: 'Invalid credentials or OTP' });
    }

    const tokenRow = await prisma.otpToken.findFirst({
      where: {
        whatsappNumber: seller.whatsappNumber,
        otpCode: body.otp.trim(),
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!tokenRow) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    await prisma.otpToken.update({
      where: { id: tokenRow.id },
      data: { used: true, usedAt: new Date() },
    });

    const jwtToken = signSellerToken({
      sellerId: seller.id,
      whatsapp: seller.whatsappNumber,
    });

    res.json({
      token: jwtToken,
      seller: {
        id: seller.id,
        fullName: seller.fullName,
        businessName: seller.businessName,
        referenceNumber: seller.referenceNumber,
        accountStatus: seller.accountStatus,
      },
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: err.errors });
    }
    console.error(err);
    res.status(500).json({ error: 'OTP verification failed' });
  }
});

/**
 * Legacy insecure seller-login is DISABLED.
 * Use request-otp + verify-otp.
 */
router.post('/seller-login', (_req, res) => {
  res.status(410).json({
    error: 'seller-login is disabled. Use POST /auth/request-otp then /auth/verify-otp.',
  });
});

export default router;
