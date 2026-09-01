import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, createSessionToken, COOKIE_NAME } from '@/lib/auth';

function generateSlug(storeName: string): string {
  const clean = storeName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (clean.length >= 3) {
    return `${clean}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  return `store-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, storeName, phone } = body;

    if (!name || !email || !password || !storeName) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน (ชื่อ, อีเมล, รหัสผ่าน, ชื่อร้าน)' },
        { status: 400 }
      );
    }

    // Check existing email
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'อีเมลนี้ถูกใช้งานในระบบแล้ว กรุณาเข้าสู่ระบบหรือใช้อีเมลอื่น' },
        { status: 400 }
      );
    }

    // Generate Slug
    let slug = generateSlug(storeName);
    while (await prisma.store.findUnique({ where: { slug } })) {
      slug = generateSlug(storeName);
    }

    // 90 Days Free Trial
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 90);

    const passwordHash = await hashPassword(password);

    // Create Store and User in a single transaction with extended timeout and batch inserts
    const result = await prisma.$transaction(
      async (tx) => {
        const store = await tx.store.create({
          data: {
            slug,
            name: storeName.trim(),
            phone: phone || null,
            status: 'TRIAL',
            trialEndsAt: trialEnd,
            subscriptionEnd: trialEnd,
            planId: 'plan_trial',
            tableCount: 10,
            receiptFooter: 'ขอบคุณที่อุดหนุนครับ/ค่ะ โอกาสหน้าเชิญใหม่',
          },
        });

        const user = await tx.user.create({
          data: {
            name: name.trim(),
            email: email.toLowerCase().trim(),
            passwordHash,
            phone: phone || null,
            role: 'STORE_OWNER',
            storeId: store.id,
          },
        });

        // Batch provision 10 tables in one query
        await tx.table.createMany({
          data: Array.from({ length: 10 }, (_, i) => ({
            storeId: store.id,
            tableNo: i + 1,
            name: `โต๊ะ ${i + 1}`,
            status: 'AVAILABLE',
          })),
        });

        // Provision initial Category
        const cat = await tx.category.create({
          data: {
            storeId: store.id,
            name: 'เมนูแนะนำ / ผัดกะเพรา',
            sortOrder: 1,
          },
        });

        // Provision initial Sample Items
        await tx.menuItem.create({
          data: {
            storeId: store.id,
            categoryId: cat.id,
            name: 'ผัดกะเพราราดข้าว (สูตรเด็ด)',
            basePrice: 50,
            description: 'ผัดกะเพราหอมกรุ่นคั่วพริกแห้งเข้มข้น',
            imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
            options: {
              create: [
                {
                  title: 'เลือกเนื้อสัตว์',
                  isRequired: true,
                  choices: {
                    create: [
                      { name: 'หมูสับ/หมูชิ้น', extraPrice: 0 },
                      { name: 'ไก่ชิ้น', extraPrice: 0 },
                      { name: 'หมูกรอบ', extraPrice: 15 },
                      { name: 'ทะเลรวม (กุ้ง+หมึก)', extraPrice: 20 },
                    ],
                  },
                },
                {
                  title: 'ระดับความเผ็ด',
                  isRequired: true,
                  choices: {
                    create: [
                      { name: 'เผ็ดน้อย', extraPrice: 0 },
                      { name: 'เผ็ดกลาง', extraPrice: 0 },
                      { name: 'เผ็ดมาก', extraPrice: 0 },
                    ],
                  },
                },
                {
                  title: 'เพิ่มไข่',
                  isRequired: false,
                  choices: {
                    create: [
                      { name: 'ไข่ดาวไม่สุก', extraPrice: 10 },
                      { name: 'ไข่ดาวสุก', extraPrice: 10 },
                      { name: 'ไข่เจียว', extraPrice: 15 },
                    ],
                  },
                },
              ],
            },
          },
        });

        await tx.menuItem.create({
          data: {
            storeId: store.id,
            categoryId: cat.id,
            name: 'ข้าวผัดโบราณ',
            basePrice: 50,
            description: 'ข้าวผัดไข่หอมกระทะ คะน้ากรอบ มะนาวผ่าซีก',
            imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80',
          },
        });

        return { user, store };
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    );

    // Create session token
    const token = await createSessionToken({
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: 'STORE_OWNER',
      storeId: result.store.id,
      storeSlug: result.store.slug,
      storeName: result.store.name,
      storeStatus: result.store.status,
      subscriptionEnd: result.store.subscriptionEnd.toISOString(),
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: 'STORE_OWNER',
        storeSlug: result.store.slug,
      },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Error in registration:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก' },
      { status: 500 }
    );
  }
}
