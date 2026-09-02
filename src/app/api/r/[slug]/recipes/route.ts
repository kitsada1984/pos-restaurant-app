import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStoreAccess } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { store } = await requireStoreAccess(params.slug);
    const { searchParams } = new URL(request.url);
    const menuItemId = searchParams.get('menuItemId');

    if (menuItemId) {
      const recipes = await prisma.menuItemRecipe.findMany({
        where: { menuItemId, menuItem: { storeId: store.id } },
        include: { ingredient: true },
      });
      return NextResponse.json({ recipes });
    }

    const allRecipes = await prisma.menuItemRecipe.findMany({
      where: { menuItem: { storeId: store.id } },
      include: {
        menuItem: { select: { id: true, name: true, basePrice: true } },
        ingredient: true,
      },
    });

    return NextResponse.json({ recipes: allRecipes });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: 401 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { store } = await requireStoreAccess(params.slug);
    const body = await request.json();
    const { menuItemId, ingredients } = body; // ingredients: [{ ingredientId: string, quantity: number }]

    if (!menuItemId || !Array.isArray(ingredients)) {
      return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
    }

    // Verify menuItem belongs to store
    const item = await prisma.menuItem.findFirst({
      where: { id: menuItemId, storeId: store.id },
    });

    if (!item) {
      return NextResponse.json({ error: 'ไม่พบเมนูอาหาร' }, { status: 404 });
    }

    // Replace existing recipes for this item
    await prisma.$transaction(async (tx) => {
      await tx.menuItemRecipe.deleteMany({
        where: { menuItemId },
      });

      if (ingredients.length > 0) {
        await tx.menuItemRecipe.createMany({
          data: ingredients
            .filter((ing: any) => ing.ingredientId && Number(ing.quantity) > 0)
            .map((ing: any) => ({
              menuItemId,
              ingredientId: ing.ingredientId,
              quantity: Number(ing.quantity),
            })),
        });
      }
    });

    const updatedRecipes = await prisma.menuItemRecipe.findMany({
      where: { menuItemId },
      include: { ingredient: true },
    });

    return NextResponse.json({ success: true, recipes: updatedRecipes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
