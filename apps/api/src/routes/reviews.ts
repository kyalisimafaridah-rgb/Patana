import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { verifyReviewToken } from '../utils/jwt.js';
import { reviewLimiter } from '../utils/rateLimiters.js';
import { phonesMatch } from '../utils/phone.js';

const router = Router();

/**
 * POST /api/v1/reviews/submit
 * Requires a signed review token issued when seller confirms a transaction.
 * Token binds transactionId + buyerWhatsapp + sellerId — cannot spoof another buyer.
 */
router.post('/submit', reviewLimiter, async (req, res) => {
  try {
    const schema = z.object({
      reviewToken: z.string().min(20),
      starRating: z.number().int().min(1).max(5),
      writtenReview: z.string().max(200).optional(),
      categoryQuality: z.number().int().min(1).max(5).optional(),
      categoryCommunication: z.number().int().min(1).max(5).optional(),
      categoryValue: z.number().int().min(1).max(5).optional(),
      categorySpeed: z.number().int().min(1).max(5).optional(),
    });
    const body = schema.parse(req.body);

    let tokenPayload: { sub: string; sellerId: string; buyerWhatsapp: string };
    try {
      tokenPayload = verifyReviewToken(body.reviewToken);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired review link' });
    }

    const tx = await prisma.transactionConfirmation.findUnique({
      where: { id: tokenPayload.sub },
      include: { seller: { select: { id: true, whatsappNumber: true, trustScore: true } } },
    });

    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    if (tx.reviewCompleted) return res.status(400).json({ error: 'Already reviewed' });
    if (tx.sellerId !== tokenPayload.sellerId) {
      return res.status(403).json({ error: 'Token does not match transaction' });
    }
    if (!phonesMatch(tx.buyerWhatsapp, tokenPayload.buyerWhatsapp)) {
      return res.status(403).json({ error: 'Token does not match buyer' });
    }

    // Block self-reviews (seller reviewing themselves)
    if (phonesMatch(tx.seller.whatsappNumber, tx.buyerWhatsapp)) {
      return res.status(403).json({ error: 'Self-reviews are not allowed' });
    }

    const review = await prisma.review.create({
      data: {
        sellerId: tx.sellerId,
        transactionId: tx.id,
        buyerWhatsapp: tx.buyerWhatsapp,
        starRating: body.starRating,
        writtenReview: body.writtenReview,
        categoryQuality: body.categoryQuality,
        categoryCommunication: body.categoryCommunication,
        categoryValue: body.categoryValue,
        categorySpeed: body.categorySpeed,
        verifiedTransaction: true,
      },
    });

    await prisma.transactionConfirmation.update({
      where: { id: tx.id },
      data: { reviewCompleted: true, reviewId: review.id },
    });

    if (body.starRating >= 4) {
      const newScore = Math.min(100, tx.seller.trustScore + 5);
      await prisma.seller.update({
        where: { id: tx.sellerId },
        data: { trustScore: newScore },
      });
      await prisma.trustScoreHistory.create({
        data: {
          sellerId: tx.sellerId,
          eventType: 'POSITIVE_REVIEW',
          pointsChange: 5,
          scoreBefore: tx.seller.trustScore,
          scoreAfter: newScore,
        },
      });
    }

    res.status(201).json({ message: 'Review submitted', reviewId: review.id });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

export default router;
