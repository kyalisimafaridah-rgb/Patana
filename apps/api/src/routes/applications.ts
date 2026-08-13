import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { generateReferenceNumber, generateUnique } from '../utils/reference.js';
import { applicationLimiter } from '../utils/rateLimiters.js';
import { normalizePhone, phonesMatch } from '../utils/phone.js';

const router = Router();

const submitSchema = z.object({
  listingType: z.enum(['PRODUCTS', 'SERVICES', 'ONE_TIME']),
  fullName: z.string().min(2).max(120),
  whatsappNumber: z.string().min(10).max(20),
  primaryPhone: z.string().min(10).max(20),
  location: z.string().min(2).max(120),
  businessName: z.string().max(120).optional(),
  businessDescription: z.string().max(500).optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  nationalIdNumber: z.string().min(5).max(30),
  yearsInOperation: z.number().int().min(0).max(50).optional(),
  previousPlatformExperience: z.string().max(200).optional(),
  customOrders: z.boolean().optional(),
  wholesale: z.boolean().optional(),
  deliveryAvailable: z.boolean().optional(),
  targetCustomers: z.enum(['INDIVIDUALS', 'BUSINESSES', 'BOTH']).optional(),
  returnPolicy: z.string().max(500).optional(),
  languagesSpoken: z.array(z.string()).optional(),
  instagramUrl: z.string().url().optional().or(z.literal('')),
  tiktokUrl: z.string().url().optional().or(z.literal('')),
});

// POST /api/v1/applications/submit
router.post('/submit', applicationLimiter, async (req, res) => {
  try {
    const body = submitSchema.parse(req.body);

    // Basic blacklist check
    const phones = [body.whatsappNumber, body.primaryPhone].filter(Boolean);
    const blacklisted = await prisma.blacklist.findFirst({
      where: {
        OR: [
          { phoneNumber: { in: phones } },
          { nationalIdNumber: body.nationalIdNumber },
        ],
      },
    });
    // Also match normalized digit forms stored inconsistently
    if (!blacklisted) {
      const allBanned = await prisma.blacklist.findMany({
        where: { phoneNumber: { not: null } },
        select: { phoneNumber: true },
      });
      const normSet = new Set(phones.map((p) => normalizePhone(p)));
      const hit = allBanned.some((b) => b.phoneNumber && normSet.has(normalizePhone(b.phoneNumber)));
      if (hit) {
        return res.status(403).json({ error: 'Application cannot be processed' });
      }
    }
    if (blacklisted) {
      return res.status(403).json({ error: 'Application cannot be processed' });
    }

    // Prevent duplicate pending applications (soft phone match: 07… vs +2567…)
    const pendingApps = await prisma.onboardingApplication.findMany({
      where: { applicationStatus: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
      select: { id: true, referenceNumber: true, whatsappNumber: true },
    });
    const existing = pendingApps.find((a) => phonesMatch(a.whatsappNumber, body.whatsappNumber));
    if (existing) {
      return res.status(409).json({
        error: 'You already have a pending application',
        referenceNumber: existing.referenceNumber,
      });
    }

    // Block if already a verified seller with this WhatsApp (soft match)
    const candidateSellers = await prisma.seller.findMany({
      where: {
        verificationStatus: 'VERIFIED',
        accountStatus: { in: ['ACTIVE', 'GRACE_PERIOD', 'OFFLINE'] },
      },
      select: { id: true, referenceNumber: true, whatsappNumber: true },
    });
    const existingSeller = candidateSellers.find((s) =>
      phonesMatch(s.whatsappNumber, body.whatsappNumber)
    );
    if (existingSeller) {
      return res.status(409).json({
        error: 'A seller account already exists for this WhatsApp number. Use Activate or Seller Login.',
        referenceNumber: existingSeller.referenceNumber,
      });
    }

    const referenceNumber = await generateUnique(
      () => generateReferenceNumber('PAT'),
      async (v) => {
        const [app, seller] = await Promise.all([
          prisma.onboardingApplication.findUnique({ where: { referenceNumber: v } }),
          prisma.seller.findUnique({ where: { referenceNumber: v } }),
        ]);
        return !!(app || seller);
      }
    );

    const application = await prisma.onboardingApplication.create({
      data: {
        referenceNumber,
        listingType: body.listingType,
        fullName: body.fullName,
        whatsappNumber: body.whatsappNumber,
        primaryPhone: body.primaryPhone,
        location: body.location,
        businessName: body.businessName,
        businessDescription: body.businessDescription,
        category: body.category,
        subcategory: body.subcategory,
        nationalIdNumber: body.nationalIdNumber,
        yearsInOperation: body.yearsInOperation,
        previousPlatformExperience: body.previousPlatformExperience,
        customOrders: body.customOrders ?? false,
        wholesale: body.wholesale ?? false,
        deliveryAvailable: body.deliveryAvailable ?? false,
        targetCustomers: body.targetCustomers,
        returnPolicy: body.returnPolicy,
        languagesSpoken: body.languagesSpoken ?? [],
        instagramUrl: body.instagramUrl || null,
        tiktokUrl: body.tiktokUrl || null,
        applicationStatus: 'SUBMITTED',
      },
    });

    // TODO Phase 1+: send WhatsApp confirmation with reference number

    res.status(201).json({
      message: 'Application submitted successfully',
      referenceNumber: application.referenceNumber,
      expectedReviewHours: 24,
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// GET /api/v1/applications/status/:reference
router.get('/status/:reference', async (req, res) => {
  try {
    const reference = (req.params.reference || '').trim().toUpperCase();
    const application = await prisma.onboardingApplication.findUnique({
      where: { referenceNumber: reference },
      select: {
        referenceNumber: true,
        applicationStatus: true,
        dateSubmitted: true,
        dateDecided: true,
        rejectionReason: true,
        listingType: true,
        fullName: true,
      },
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(application);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

export default router;
