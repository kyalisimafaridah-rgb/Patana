import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { requireAdmin, AuthRequest } from '../middleware/auth.js';
import { generateActivationKey, generateUnique } from '../utils/reference.js';
import { phonesMatch } from '../utils/phone.js';

const router = Router();

router.use(requireAdmin);

// GET /api/v1/admin/applications
router.get('/applications', async (req, res) => {
  try {
    const status = (req.query.status as string) || undefined;
    const applications = await prisma.onboardingApplication.findMany({
      where: status ? { applicationStatus: status as any } : undefined,
      orderBy: { dateSubmitted: 'desc' },
      take: 100,
    });
    res.json(applications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list applications' });
  }
});

// GET /api/v1/admin/applications/:id
router.get('/applications/:id', async (req, res) => {
  try {
    const application = await prisma.onboardingApplication.findUnique({
      where: { id: req.params.id },
      include: { verificationDocuments: true },
    });
    if (!application) return res.status(404).json({ error: 'Not found' });
    res.json(application);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// POST /api/v1/admin/applications/:id/approve
router.post('/applications/:id/approve', async (req: AuthRequest, res) => {
  try {
    const application = await prisma.onboardingApplication.findUnique({
      where: { id: req.params.id },
    });
    if (!application) return res.status(404).json({ error: 'Not found' });
    if (application.applicationStatus !== 'SUBMITTED' && application.applicationStatus !== 'UNDER_REVIEW') {
      return res.status(400).json({ error: 'Application already decided' });
    }

    // Soft match so 07… and +2567… cannot create duplicate sellers
    const allSellers = await prisma.seller.findMany({
      select: { id: true, referenceNumber: true, whatsappNumber: true },
    });
    const existingByPhone = allSellers.find((s) =>
      phonesMatch(s.whatsappNumber, application.whatsappNumber)
    );
    if (existingByPhone) {
      return res.status(409).json({
        error: 'A seller with this WhatsApp number already exists',
        referenceNumber: existingByPhone.referenceNumber,
      });
    }

    const keyValue = await generateUnique(
      () => generateActivationKey(),
      async (v) => !!(await prisma.activationKey.findUnique({ where: { keyValue: v } }))
    );
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      const seller = await tx.seller.create({
        data: {
          fullName: application.fullName,
          businessName: application.businessName,
          primaryPhone: application.primaryPhone,
          whatsappNumber: application.whatsappNumber,
          locationCity: application.location,
          bio: application.businessDescription,
          category: application.category,
          subcategory: application.subcategory,
          listingType: application.listingType,
          languagesSpoken: application.languagesSpoken,
          customOrders: application.customOrders,
          wholesaleAvailable: application.wholesale,
          deliveryAvailable: application.deliveryAvailable,
          returnPolicy: application.returnPolicy,
          instagramUrl: application.instagramUrl,
          tiktokUrl: application.tiktokUrl,
          verificationStatus: 'VERIFIED',
          accountStatus: 'OFFLINE',
          referenceNumber: application.referenceNumber,
          subscriptionTier: application.listingType === 'ONE_TIME' ? 'ONE_TIME' : 'STARTER',
        },
      });

      const key = await tx.activationKey.create({
        data: {
          sellerId: seller.id,
          keyValue,
          status: 'ACTIVE',
          expiresAt,
        },
      });

      const updated = await tx.onboardingApplication.updateMany({
        where: {
          id: application.id,
          applicationStatus: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
        },
        data: {
          applicationStatus: 'APPROVED',
          dateDecided: new Date(),
          adminId: req.user?.sub,
          sellerId: seller.id,
        },
      });
      if (updated.count === 0) {
        throw new Error('APPLICATION_ALREADY_DECIDED');
      }

      return { seller, key };
    });

    res.json({
      message: 'Application approved. Fetch activation key via POST /admin/keys/reveal',
      sellerId: result.seller.id,
      referenceNumber: result.seller.referenceNumber,
      keyId: result.key.id,
      expiresAt,
    });
  } catch (err: any) {
    if (err?.message === 'APPLICATION_ALREADY_DECIDED') {
      return res.status(400).json({ error: 'Application already decided' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to approve application' });
  }
});

// POST /api/v1/admin/applications/:id/reject
router.post('/applications/:id/reject', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({ reason: z.string().min(5).max(500) });
    const { reason } = schema.parse(req.body);

    const application = await prisma.onboardingApplication.findUnique({
      where: { id: req.params.id },
    });
    if (!application) return res.status(404).json({ error: 'Not found' });
    if (!['SUBMITTED', 'UNDER_REVIEW'].includes(application.applicationStatus)) {
      return res.status(400).json({ error: 'Application already decided' });
    }

    const updated = await prisma.onboardingApplication.updateMany({
      where: {
        id: application.id,
        applicationStatus: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
      },
      data: {
        applicationStatus: 'REJECTED',
        rejectionReason: reason,
        dateDecided: new Date(),
        adminId: req.user?.sub,
      },
    });
    if (updated.count === 0) {
      return res.status(400).json({ error: 'Application already decided' });
    }

    // TODO: Send WhatsApp rejection explanation

    res.json({ message: 'Application rejected' });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Reason required', details: err.errors });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to reject application' });
  }
});

// GET /api/v1/admin/sellers
router.get('/sellers', async (_req, res) => {
  try {
    const sellers = await prisma.seller.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        fullName: true,
        businessName: true,
        whatsappNumber: true,
        referenceNumber: true,
        accountStatus: true,
        verificationStatus: true,
        trustScore: true,
        memberSince: true,
        subscriptionTier: true,
      },
    });
    res.json(sellers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list sellers' });
  }
});


// POST /api/v1/admin/keys/reveal — return activation key (admin only, audited)
router.post('/keys/reveal', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      keyId: z.string().optional(),
      sellerId: z.string().optional(),
      referenceNumber: z.string().optional(),
    });
    const body = schema.parse(req.body);

    let key: { id: string; keyValue: string; sellerId: string; status: string; expiresAt: Date } | null = null;

    if (body.keyId) {
      key = await prisma.activationKey.findUnique({ where: { id: body.keyId } });
    } else if (body.sellerId) {
      key = await prisma.activationKey.findFirst({
        where: { sellerId: body.sellerId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });
    } else if (body.referenceNumber) {
      const seller = await prisma.seller.findUnique({
        where: { referenceNumber: body.referenceNumber.trim().toUpperCase() },
      });
      if (seller) {
        key = await prisma.activationKey.findFirst({
          where: { sellerId: seller.id, status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
        });
      }
    } else {
      return res.status(400).json({ error: 'Provide keyId, sellerId, or referenceNumber' });
    }

    if (!key || key.status !== 'ACTIVE') {
      return res.status(404).json({ error: 'No active activation key found' });
    }
    if (key.expiresAt < new Date()) {
      await prisma.activationKey.update({ where: { id: key.id }, data: { status: 'EXPIRED' } });
      return res.status(400).json({ error: 'Key expired' });
    }

    console.log(`[KEY REVEAL] admin=${req.user?.sub} keyId=${key.id} sellerId=${key.sellerId}`);

    res.json({
      keyId: key.id,
      activationKey: key.keyValue,
      sellerId: key.sellerId,
      expiresAt: key.expiresAt,
      warning: 'Show this key once to the seller via WhatsApp. Do not store it longer than needed.',
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: err.errors });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to reveal key' });
  }
});

export default router;
