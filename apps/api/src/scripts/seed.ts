/**
 * Seed admin + main categories/subcategories
 * Run: npx tsx src/scripts/seed.ts
 */
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/index.js';
import { hashPassword } from '../utils/password.js';

const prisma = new PrismaClient();

const CATEGORIES = [
  {
    name: 'Fashion',
    type: 'PRODUCTS' as const,
    subs: ["Women's Clothing", "Men's Clothing", 'Shoes', 'Accessories', 'Kids Wear'],
  },
  {
    name: 'Electronics',
    type: 'PRODUCTS' as const,
    subs: ['Phones', 'Laptops', 'Accessories', 'TVs', 'Audio'],
  },
  {
    name: 'Food and Drinks',
    type: 'PRODUCTS' as const,
    subs: ['Fresh Food', 'Processed', 'Drinks', 'Snacks'],
  },
  {
    name: 'Furniture and Home',
    type: 'PRODUCTS' as const,
    subs: ['Living Room', 'Bedroom', 'Kitchen', 'Office'],
  },
  {
    name: 'Beauty and Skincare',
    type: 'PRODUCTS' as const,
    subs: ['Skincare', 'Makeup', 'Hair Products', 'Fragrance'],
  },
  {
    name: 'Agriculture',
    type: 'PRODUCTS' as const,
    subs: ['Crops', 'Livestock', 'Farm Inputs', 'Equipment'],
  },
  {
    name: 'Vehicles',
    type: 'PRODUCTS' as const,
    subs: ['Cars', 'Motorcycles', 'Parts', 'Bicycles'],
  },
  {
    name: 'Baby Products',
    type: 'PRODUCTS' as const,
    subs: ['Clothing', 'Gear', 'Feeding', 'Toys'],
  },
  {
    name: 'Building Materials',
    type: 'PRODUCTS' as const,
    subs: ['Cement', 'Hardware', 'Timber', 'Paint'],
  },
  {
    name: 'Books and Stationery',
    type: 'PRODUCTS' as const,
    subs: ['Books', 'Stationery', 'School Supplies'],
  },
  {
    name: 'Art and Crafts',
    type: 'PRODUCTS' as const,
    subs: ['Handmade', 'Paintings', 'Crafts'],
  },
  {
    name: 'Sports Equipment',
    type: 'PRODUCTS' as const,
    subs: ['Football', 'Fitness', 'Outdoor'],
  },
  {
    name: 'Hair and Beauty',
    type: 'SERVICES' as const,
    subs: ['Hairdressing', 'Barber', 'Nails', 'Makeup'],
  },
  {
    name: 'Home Services',
    type: 'SERVICES' as const,
    subs: ['Plumbing', 'Electrical', 'Cleaning', 'Moving'],
  },
  {
    name: 'Events',
    type: 'SERVICES' as const,
    subs: ['Catering', 'Decoration', 'DJ', 'Photography'],
  },
  {
    name: 'Transport',
    type: 'SERVICES' as const,
    subs: ['Taxi', 'Delivery', 'Hire'],
  },
  {
    name: 'Repairs and Maintenance',
    type: 'SERVICES' as const,
    subs: ['Phone Repair', 'Appliance', 'Auto'],
  },
  {
    name: 'Tutoring and Education',
    type: 'SERVICES' as const,
    subs: ['Academic', 'Skills', 'Languages'],
  },
  {
    name: 'Cleaning',
    type: 'SERVICES' as const,
    subs: ['Home', 'Office', 'Laundry'],
  },
  {
    name: 'IT Services',
    type: 'SERVICES' as const,
    subs: ['Web', 'Support', 'Software'],
  },
  {
    name: 'Legal Services',
    type: 'SERVICES' as const,
    subs: ['Consultation', 'Documents'],
  },
  {
    name: 'Medical Services',
    type: 'SERVICES' as const,
    subs: ['Clinic', 'Pharmacy', 'Home Care'],
  },
  {
    name: 'Photography',
    type: 'SERVICES' as const,
    subs: ['Events', 'Portrait', 'Product'],
  },
  {
    name: 'Other Services',
    type: 'SERVICES' as const,
    subs: ['General'],
  },
  {
    name: 'Property',
    type: 'PROPERTY' as const,
    subs: ['Land', 'Residential', 'Commercial', 'Rental'],
  },
];

async function main() {
  // Admin
  const email = process.env.ADMIN_EMAIL || 'admin@patana.ug';
  const password = process.env.ADMIN_PASSWORD || 'ChangeMeImmediately123!';
  const name = process.env.ADMIN_NAME || 'Patana Admin';

  const existingAdmin = await prisma.admin.findUnique({ where: { email } });
  if (!existingAdmin) {
    const passwordHash = await hashPassword(password);
    await prisma.admin.create({
      data: { name, email: email.toLowerCase(), passwordHash, role: 'SUPER_ADMIN' },
    });
    console.log('✅ Admin created:', email);
  } else {
    console.log('ℹ️  Admin already exists:', email);
  }

  // Categories
  let order = 0;
  for (const cat of CATEGORIES) {
    order += 1;
    let category = await prisma.category.findUnique({ where: { name: cat.name } });
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: cat.name,
          type: cat.type,
          displayOrder: order,
          isActive: true,
        },
      });
      console.log('  + Category:', cat.name);
    }

    let subOrder = 0;
    for (const subName of cat.subs) {
      subOrder += 1;
      const existingSub = await prisma.subcategory.findFirst({
        where: { categoryId: category.id, name: subName },
      });
      if (!existingSub) {
        await prisma.subcategory.create({
          data: {
            categoryId: category.id,
            name: subName,
            displayOrder: subOrder,
            isActive: true,
          },
        });
      }
    }
  }

  // Platform stats row
  const stats = await prisma.platformStatistics.findFirst();
  if (!stats) {
    await prisma.platformStatistics.create({
      data: {
        totalVerifiedSellers: 0,
        totalActiveListings: 0,
        totalWhatsappTapsAlltime: 0,
        totalCategories: CATEGORIES.length,
        totalSuccessfulTransactions: 0,
      },
    });
    console.log('✅ Platform statistics initialized');
  }

  console.log('\n✅ Seed complete');
  console.log('   Categories:', CATEGORIES.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
