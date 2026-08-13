import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { signSellerToken } from '../utils/jwt.js';
import { activateLimiter } from '../utils/rateLimiters.js';

const router = Router();

const activateSchema = z.object({
  referenceNumber: z.string().min(5),
  activationKey: z.string().min(8),
});

// POST /api/v1/activate
router.post('/', activateLimiter, async (req, res) => {
  try {
    const parsed = activateSchema.parse(req.body);
    const referenceNumber = parsed.referenceNumber.trim().toUpperCase();
    const activationKey = parsed.activationKey.trim().toUpperCase();

    const seller = await prisma.seller.findUnique({
      where: { referenceNumber },
    });
    if (!seller) {
      return res.status(404).json({ error: 'Invalid reference number' });
    }

    if (seller.accountStatus === 'ACTIVE') {
      return res.status(400).json({ error: 'This listing is already active. Use seller login.' });
    }

    const key = await prisma.activationKey.findFirst({
      where: {
        sellerId: seller.id,
        keyValue: activationKey,
        status: 'ACTIVE',
      },
    });

    if (!key) {
      return res.status(400).json({ error: 'Invalid or already used activation key' });
    }

    if (key.expiresAt < new Date()) {
      await prisma.activationKey.update({
        where: { id: key.id },
        data: { status: 'EXPIRED' },
      });
      return res.status(400).json({ error: 'Activation key has expired. Contact admin.' });
    }

    try {
      await prisma.$transaction(async (tx) => {
        const used = await tx.activationKey.updateMany({
          where: { id: key.id, status: 'ACTIVE' },
          data: { status: 'USED', usedAt: new Date() },
        });
        if (used.count === 0) {
          throw new Error('KEY_ALREADY_USED');
        }

        await tx.seller.update({
          where: { id: seller.id },
          data: {
            accountStatus: 'ACTIVE',
            verificationStatus: 'VERIFIED',
            memberSince: seller.memberSince || new Date(),
            newSellerBoostActive: true,
            boostExpiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      });
    } catch (e: any) {
      if (e?.message === 'KEY_ALREADY_USED') {
        return res.status(400).json({ error: 'Invalid or already used activation key' });
      }
      throw e;
    }

    const token = signSellerToken({
      sellerId: seller.id,
      whatsapp: seller.whatsappNumber,
    });

    res.json({
      message: 'Listing activated successfully. You can now add products.',
      referenceNumber: seller.referenceNumber,
      businessName: seller.businessName || seller.fullName,
      status: 'ACTIVE',
      token,
      sellerId: seller.id,
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: err.errors });
    }
    console.error(err);
    res.status(500).json({ error: 'Activation failed' });
  }
});

export default router;
