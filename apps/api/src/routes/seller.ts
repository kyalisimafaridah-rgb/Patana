import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { requireSeller, AuthRequest } from '../middleware/auth.js';
import { signReviewToken } from '../utils/jwt.js';
import { phonesMatch } from '../utils/phone.js';
import { upload } from '../middleware/upload.js';
import { uploadImage, cloudinaryConfigured } from '../config/cloudinary.js';

const router = Router();
router.use(requireSeller);

// GET /api/v1/seller/dashboard
router.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    const sellerId = req.user!.sub;
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      include: {
        products: { select: { id: true, productName: true, viewsCount: true, whatsappTapsCount: true, availabilityStatus: true } },
        _count: { select: { reviews: true, products: true } },
      },
    });
    if (!seller) return res.status(404).json({ error: 'Seller not found' });

    const totalViews = seller.products.reduce((s, p) => s + p.viewsCount, 0);
    const totalTaps = seller.products.reduce((s, p) => s + p.whatsappTapsCount, 0);

    res.json({
      seller: {
        id: seller.id,
        fullName: seller.fullName,
        businessName: seller.businessName,
        referenceNumber: seller.referenceNumber,
        accountStatus: seller.accountStatus,
        trustScore: seller.trustScore,
        subscriptionTier: seller.subscriptionTier,
        renewalDate: seller.renewalDate,
        memberSince: seller.memberSince,
      },
      stats: {
        totalListings: seller._count.products,
        totalReviews: seller._count.reviews,
        totalViews,
        totalWhatsappTaps: totalTaps,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// GET /api/v1/seller/listings
router.get('/listings', async (req: AuthRequest, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { sellerId: req.user!.sub },
      orderBy: { dateListed: 'desc' },
    });
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load listings' });
  }
});

// POST /api/v1/seller/listings
router.post('/listings', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      productName: z.string().min(2).max(200),
      description: z.string().max(2000).optional(),
      price: z.number().positive().optional(),
      priceMin: z.number().positive().optional(),
      priceMax: z.number().positive().optional(),
      priceType: z.enum(['FIXED', 'RANGE', 'NEGOTIABLE']).default('FIXED'),
      category: z.string().min(1),
      subcategory: z.string().optional(),
      listingType: z.enum(['PRODUCT', 'SERVICE', 'PROPERTY', 'VEHICLE']).default('PRODUCT'),
      photoUrls: z.array(z.string().min(1).max(500)).max(10).optional(),
      customOrderAvailable: z.boolean().optional(),
      wholesaleAvailable: z.boolean().optional(),
    });
    const body = schema.parse(req.body);

    const product = await prisma.product.create({
      data: {
        sellerId: req.user!.sub,
        productName: body.productName,
        description: body.description,
        price: body.price,
        priceMin: body.priceMin,
        priceMax: body.priceMax,
        priceType: body.priceType,
        category: body.category,
        subcategory: body.subcategory,
        listingType: body.listingType,
        photoUrls: body.photoUrls || [],
        customOrderAvailable: body.customOrderAvailable ?? false,
        wholesaleAvailable: body.wholesaleAvailable ?? false,
      },
    });
    res.status(201).json(product);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: err.errors });
    console.error(err);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

// PUT /api/v1/seller/listings/:id
router.put('/listings/:id', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.product.findFirst({
      where: { id: req.params.id, sellerId: req.user!.sub },
    });
    if (!existing) return res.status(404).json({ error: 'Listing not found' });

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        productName: req.body.productName,
        description: req.body.description,
        price: req.body.price,
        priceMin: req.body.priceMin,
        priceMax: req.body.priceMax,
        priceType: req.body.priceType,
        category: req.body.category,
        subcategory: req.body.subcategory,
        photoUrls: req.body.photoUrls,
        customOrderAvailable: req.body.customOrderAvailable,
        wholesaleAvailable: req.body.wholesaleAvailable,
      },
    });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

// PUT /api/v1/seller/listings/:id/status
router.put('/listings/:id/status', async (req: AuthRequest, res) => {
  try {
    const status = z.enum(['AVAILABLE', 'OUT_OF_STOCK', 'SOLD']).parse(req.body.status);
    const existing = await prisma.product.findFirst({
      where: { id: req.params.id, sellerId: req.user!.sub },
    });
    if (!existing) return res.status(404).json({ error: 'Listing not found' });

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { availabilityStatus: status },
    });
    res.json(product);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Invalid status' });
    console.error(err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// DELETE /api/v1/seller/listings/:id
router.delete('/listings/:id', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.product.findFirst({
      where: { id: req.params.id, sellerId: req.user!.sub },
    });
    if (!existing) return res.status(404).json({ error: 'Listing not found' });
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// GET /api/v1/seller/profile
router.get('/profile', async (req: AuthRequest, res) => {
  try {
    const seller = await prisma.seller.findUnique({ where: { id: req.user!.sub } });
    if (!seller) return res.status(404).json({ error: 'Not found' });
    res.json(seller);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// PUT /api/v1/seller/profile
router.put('/profile', async (req: AuthRequest, res) => {
  try {
    const seller = await prisma.seller.update({
      where: { id: req.user!.sub },
      data: {
        bio: req.body.bio,
        operatingHours: req.body.operatingHours,
        locationCity: req.body.locationCity,
        locationArea: req.body.locationArea,
        profilePhotoUrl: req.body.profilePhotoUrl,
        specialisationTags: req.body.specialisationTags,
        languagesSpoken: req.body.languagesSpoken,
        customOrders: req.body.customOrders,
        wholesaleAvailable: req.body.wholesaleAvailable,
        deliveryAvailable: req.body.deliveryAvailable,
        deliveryAreas: req.body.deliveryAreas,
        returnPolicy: req.body.returnPolicy,
        liveStatus: req.body.liveStatus,
        turnaroundTime: req.body.turnaroundTime,
        instagramUrl: req.body.instagramUrl,
        tiktokUrl: req.body.tiktokUrl,
      },
    });
    res.json(seller);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/v1/seller/insights
router.get('/insights', async (req: AuthRequest, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { sellerId: req.user!.sub },
      select: {
        id: true,
        productName: true,
        viewsCount: true,
        whatsappTapsCount: true,
        dateListed: true,
      },
      orderBy: { viewsCount: 'desc' },
    });
    const reviews = await prisma.review.findMany({
      where: { sellerId: req.user!.sub },
      orderBy: { dateSubmitted: 'desc' },
      take: 20,
    });
    res.json({ products, reviews });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load insights' });
  }
});

// POST /api/v1/seller/transactions/confirm
router.post('/transactions/confirm', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      productId: z.string(),
      buyerWhatsapp: z.string().min(10),
    });
    const body = schema.parse(req.body);

    const product = await prisma.product.findFirst({
      where: { id: body.productId, sellerId: req.user!.sub },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const seller = await prisma.seller.findUnique({ where: { id: req.user!.sub } });
    if (seller && phonesMatch(seller.whatsappNumber, body.buyerWhatsapp)) {
      return res.status(400).json({ error: 'Cannot confirm a transaction with your own WhatsApp number' });
    }

    const confirmation = await prisma.transactionConfirmation.create({
      data: {
        sellerId: req.user!.sub,
        productId: body.productId,
        buyerWhatsapp: body.buyerWhatsapp,
        reviewRequestSent: true,
        reviewRequestDate: new Date(),
      },
    });

    const reviewToken = signReviewToken({
      transactionId: confirmation.id,
      sellerId: req.user!.sub,
      buyerWhatsapp: body.buyerWhatsapp,
    });

    // Production: send WhatsApp to buyer with link containing reviewToken
    // Dev: return token so flows can be tested
    const reviewPath = `/review?token=${reviewToken}`;
    res.status(201).json({
      message: 'Transaction confirmed. Share the review link with the buyer.',
      confirmationId: confirmation.id,
      reviewPath,
      ...(process.env.NODE_ENV !== 'production' ? { reviewToken } : {}),
    });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Invalid input' });
    console.error(err);
    res.status(500).json({ error: 'Failed to confirm transaction' });
  }
});


// POST /api/v1/seller/upload — upload product images (max 5, 5MB each)
router.post('/upload', upload.array('photos', 5), async (req: AuthRequest, res) => {
  try {
    if (!cloudinaryConfigured) {
      return res.status(503).json({
        error: 'Image upload not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in env.',
      });
    }
    const files = req.files as Express.Multer.File[];
    if (!files?.length) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    const folder = (req.body.folder as string) || 'products';
    const results: { url: string; publicId: string }[] = [];
    for (const file of files) {
      const uploaded = await uploadImage(file.buffer, folder);
      results.push(uploaded);
    }
    res.status(201).json({
      message: 'Uploaded',
      urls: results.map((r) => r.url),
      files: results,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

export default router;
