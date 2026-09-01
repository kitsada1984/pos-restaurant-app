import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSessionToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอกอีเมลและรหัสผ่าน' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { store: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'ไม่พบบัญชีผู้ใช้นี้ในระบบ หรืออีเมลไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง' },
        { status: 401 }
      );
    }

    // Check store status if user is store owner/staff
    if (user.role !== 'SUPER_ADMIN' && user.store) {
      if (user.store.status === 'SUSPENDED') {
        return NextResponse.json(
          { error: 'ร้านของคุณถูกระงับการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ' },
          { status: 403 }
        );
      }
    }

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
      storeId: user.storeId,
      storeSlug: user.store?.slug,
      storeName: user.store?.name,
      storeStatus: user.store?.status,
      subscriptionEnd: user.store?.subscriptionEnd?.toISOString(),
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        storeSlug: user.store?.slug,
        storeName: user.store?.name,
      },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Error in login:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' },
      { status: 500 }
    );
  }
}
