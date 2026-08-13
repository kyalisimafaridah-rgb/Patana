import { Router } from 'express';
import prisma from '../config/prisma.js';
import { shuffled as shuffleArray } from '../utils/shuffle.js';
import { tapLimiter } from '../utils/rateLimiters.js';

const router = Router();

/** Build international digits for wa.me (Uganda-friendly) */
function toWaMeNumber(phone: string): string {
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('0') && d.length === 10) d = '256' + d.slice(1);
  if (d.startsWith('7') && d.length === 9) d = '256' + d;
  return d;
}


// GET /api/v1/public/stats
router.get('/stats', async (_req, res) => {
  try {
    const [sellers, listings, categories, stats] = await Promise.all([
      prisma.seller.count({ where: { accountStatus: 'ACTIVE', verificationStatus: 'VERIFIED' } }),
      prisma.product.count({ where: { availabilityStatus: 'AVAILABLE' } }),
      prisma.category.count({ where: { isActive: true } }),
      prisma.platformStatistics.findFirst(),
    ]);
    res.json({
      totalVerifiedSellers: sellers || stats?.totalVerifiedSellers || 0,
      totalActiveListings: listings || stats?.totalActiveListings || 0,
      totalCategories: categories || stats?.totalCategories || 0,
      totalWhatsappTaps: stats?.totalWhatsappTapsAlltime || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// GET /api/v1/public/categories
router.get('/categories', async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        subcategories: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

// GET /api/v1/public/products
router.get('/products', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const category = req.query.category as string | undefined;
    const subcategory = req.query.subcategory as string | undefined;
    const q = req.query.q as string | undefined;

    const where: any = {
      availabilityStatus: 'AVAILABLE',
      seller: { accountStatus: { in: ['ACTIVE', 'GRACE_PERIOD'] }, verificationStatus: 'VERIFIED' },
    };
    if (category) where.category = category;
    if (subcategory) where.subcategory = subcategory;
    if (q) {
      where.OR = [
        { productName: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          seller: {
            select: {
              id: true,
              businessName: true,
              fullName: true,
              profilePhotoUrl: true,
              locationCity: true,
              trustScore: true,
              verificationStatus: true,
              referenceNumber: true,
              responseTimeAverage: true,
            },
          },
        },
        orderBy: { dateListed: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // Fair visibility: Fisher–Yates shuffle within page
    res.json({
      data: shuffleArray(products),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

// GET /api/v1/public/products/:id
router.get('/products/:id', async (req, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: {
        id: req.params.id,
        availabilityStatus: 'AVAILABLE',
        seller: {
          verificationStatus: 'VERIFIED',
          accountStatus: { in: ['ACTIVE', 'GRACE_PERIOD'] },
        },
      },
      include: {
        seller: {
          select: {
            id: true,
            businessName: true,
            fullName: true,
            profilePhotoUrl: true,
            locationCity: true,
            locationArea: true,
            bio: true,
            trustScore: true,
            verificationStatus: true,
            referenceNumber: true,
            responseTimeAverage: true,
            liveStatus: true,
            operatingHours: true,
            languagesSpoken: true,
            customOrders: true,
            wholesaleAvailable: true,
            deliveryAvailable: true,
            deliveryAreas: true,
            returnPolicy: true,
            memberSince: true,
            transactionCount: true,
            whatsappNumber: true, // loaded for tap route only; stripped before response
          },
        },
      },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // View counting is debounced per IP+product for 30 minutes (in-memory MVP)
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    const viewKey = `${ip}:${product.id}`;
    const now = Date.now();
    const prev = (global as any).__patanaViews?.get(viewKey) || 0;
    if (!((global as any).__patanaViews)) (global as any).__patanaViews = new Map();
    if (now - prev > 30 * 60 * 1000) {
      (global as any).__patanaViews.set(viewKey, now);
      await prisma.product.update({
        where: { id: product.id },
        data: { viewsCount: { increment: 1 } },
      });
    }

    // More from this seller
    const moreFromSeller = await prisma.product.findMany({
      where: {
        sellerId: product.sellerId,
        id: { not: product.id },
        availabilityStatus: 'AVAILABLE',
      },
      take: 4,
      orderBy: { dateListed: 'desc' },
    });

    // Similar products (same subcategory, other sellers)
    const similar = await prisma.product.findMany({
      where: {
        subcategory: product.subcategory || undefined,
        category: product.category,
        sellerId: { not: product.sellerId },
        availabilityStatus: 'AVAILABLE',
      },
      take: 6,
      include: {
        seller: { select: { businessName: true, fullName: true, profilePhotoUrl: true } },
      },
    });

    // Never expose seller phone on public product payload
    const { whatsappNumber: _wa, ...publicSeller } = product.seller as any;
    res.json({
      ...product,
      seller: publicSeller,
      moreFromSeller: shuffleArray(moreFromSeller),
      similar: shuffleArray(similar),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load product' });
  }
});

// POST /api/v1/public/products/:id/tap  — record WhatsApp button tap
router.post('/products/:id/tap', tapLimiter, async (req, res) => {
  try {
    const existing = await prisma.product.findFirst({
      where: {
        id: req.params.id,
        availabilityStatus: 'AVAILABLE',
        seller: {
          verificationStatus: 'VERIFIED',
          accountStatus: { in: ['ACTIVE', 'GRACE_PERIOD'] },
        },
      },
      include: { seller: { select: { whatsappNumber: true, id: true } } },
    });
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { whatsappTapsCount: { increment: 1 } },
      include: { seller: { select: { whatsappNumber: true, id: true } } },
    });

    // Build pre-filled WhatsApp message (spec exact format)
    const priceText = product.price
      ? `${Number(product.price).toLocaleString()} UGX`
      : product.priceMin
        ? `${Number(product.priceMin).toLocaleString()} - ${Number(product.priceMax || 0).toLocaleString()} UGX`
        : 'Negotiable';

    const message = `Hello, I found your listing on Patana. I am interested in ${product.productName} listed at ${priceText}. Is it still available?`;
    const waUrl = `https://wa.me/${toWaMeNumber(product.seller.whatsappNumber)}?text=${encodeURIComponent(message)}`;

    res.json({ whatsappUrl: waUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to record tap' });
  }
});

// GET /api/v1/public/sellers/:id
router.get('/sellers/:id', async (req, res) => {
  try {
    const seller = await prisma.seller.findFirst({
      where: {
        OR: [{ id: req.params.id }, { referenceNumber: req.params.id }],
        verificationStatus: 'VERIFIED',
        accountStatus: { in: ['ACTIVE', 'GRACE_PERIOD'] },
      },
      select: {
        id: true,
        businessName: true,
        fullName: true,
        profilePhotoUrl: true,
        locationCity: true,
        locationArea: true,
        bio: true,
        category: true,
        subcategory: true,
        trustScore: true,
        verificationStatus: true,
        referenceNumber: true,
        memberSince: true,
        transactionCount: true,
        repeatBuyerCount: true,
        responseTimeAverage: true,
        liveStatus: true,
        operatingHours: true,
        languagesSpoken: true,
        customOrders: true,
        wholesaleAvailable: true,
        deliveryAvailable: true,
        deliveryAreas: true,
        returnPolicy: true,
        specialisationTags: true,
        instagramUrl: true,
        tiktokUrl: true,
        accountStatus: true,
        whatsappNumber: true,
      },
    });
    if (!seller) return res.status(404).json({ error: 'Seller not found' });

    const products = await prisma.product.findMany({
      where: { sellerId: seller.id, availabilityStatus: 'AVAILABLE' },
      orderBy: { dateListed: 'desc' },
    });

    const reviews = await prisma.review.findMany({
      where: { sellerId: seller.id },
      orderBy: { dateSubmitted: 'desc' },
      take: 10,
    });

    // Never expose raw phone — only via WhatsApp button
    const { whatsappNumber, ...publicSeller } = seller;

    res.json({
      ...publicSeller,
      products: shuffleArray(products),
      reviews,
      trustBadge:
        seller.trustScore >= 80
          ? 'Trusted Seller'
          : seller.trustScore >= 60
            ? 'Watch Listed'
            : seller.trustScore >= 40
              ? 'Restricted'
              : 'Critical',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load seller' });
  }
});

// GET /api/v1/public/homepage/recent
router.get('/homepage/recent', async (_req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const products = await prisma.product.findMany({
      where: {
        dateListed: { gte: thirtyDaysAgo },
        availabilityStatus: 'AVAILABLE',
        seller: {
          accountStatus: { in: ['ACTIVE', 'GRACE_PERIOD'] },
          verificationStatus: 'VERIFIED',
        },
      },
      include: {
        seller: {
          select: { businessName: true, fullName: true, profilePhotoUrl: true, locationCity: true },
        },
      },
      take: 24,
      orderBy: { dateListed: 'desc' },
    });
    res.json(shuffleArray(products).slice(0, 8));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load recent' });
  }
});

// GET /api/v1/public/search
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q) return res.json({ products: [], sellers: [], summary: 'Enter a search term' });

    const [products, sellers] = await Promise.all([
      prisma.product.findMany({
        where: {
          availabilityStatus: 'AVAILABLE',
          OR: [
            { productName: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { category: { contains: q, mode: 'insensitive' } },
          ],
          seller: {
            accountStatus: { in: ['ACTIVE', 'GRACE_PERIOD'] },
            verificationStatus: 'VERIFIED',
          },
        },
        include: {
          seller: {
            select: { businessName: true, fullName: true, profilePhotoUrl: true, locationCity: true },
          },
        },
        take: 30,
      }),
      prisma.seller.findMany({
        where: {
          verificationStatus: 'VERIFIED',
          accountStatus: { in: ['ACTIVE', 'GRACE_PERIOD'] },
          OR: [
            { businessName: { contains: q, mode: 'insensitive' } },
            { fullName: { contains: q, mode: 'insensitive' } },
            { category: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          businessName: true,
          fullName: true,
          profilePhotoUrl: true,
          locationCity: true,
          category: true,
          trustScore: true,
          referenceNumber: true,
        },
        take: 10,
      }),
    ]);

    res.json({
      summary: `Showing results for "${q}" — ${products.length} Products, ${sellers.length} Sellers`,
      products: shuffleArray(products),
      sellers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
