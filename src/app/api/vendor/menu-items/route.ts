import { randomUUID } from "crypto";
import { sql } from "@vercel/postgres";
import { getCurrentUser } from "@/lib/auth";
import {
  ensureFeatureAccess,
  getVendorSubscriptionContextForUser,
} from "@/lib/vendorEntitlements";

type MenuRow = {
  id: string;
};

function parsePriceToCents(input: string): number | null {
  const cleaned = input.replace(/[^0-9.]/g, "").trim();
  if (!cleaned) return null;
  const numberValue = Number(cleaned);
  if (!Number.isFinite(numberValue)) return null;
  return Math.round(numberValue * 100);
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  const userId = String((currentUser as { id?: string } | null)?.id ?? "");

  if (!userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const context = await getVendorSubscriptionContextForUser(userId);
  if (!context) {
    return Response.json({ error: "vendor_not_found" }, { status: 404 });
  }

  const tierResponse = ensureFeatureAccess(context.tier, "menu_upload");
  if (tierResponse) return tierResponse;

  const formData = await request.formData();

  const name = String(formData.get("menuItemTitle") ?? "").trim();
  const descriptionRaw = String(formData.get("menuItemDescription") ?? "").trim();
  const priceRaw = String(formData.get("menuItemPrice") ?? "");

  if (!name) {
    return Response.json({ error: "missing_name" }, { status: 400 });
  }

  const description = descriptionRaw.length > 0 ? descriptionRaw : null;
  const priceCents = parsePriceToCents(priceRaw);

  const isGlutenFree = formData.get("menuItemGlutenFree") !== null;
  const isSpicy = formData.get("menuItemSpicy") !== null;
  const isVegan = formData.get("menuItemVegan") !== null;
  const isVegetarian = formData.get("menuItemVegetarian") !== null;

  const menuLookup = await sql`
    SELECT id
    FROM menus
    WHERE vendor_id = ${context.vendorId}
    ORDER BY is_active DESC
    LIMIT 1
  `;

  let menuId = (menuLookup.rows[0] as MenuRow | undefined)?.id;

  if (!menuId) {
    menuId = randomUUID();
    await sql`
      INSERT INTO menus (id, vendor_id, name, is_active)
      VALUES (${menuId}, ${context.vendorId}, 'Main Menu', TRUE)
    `;
  }

  const itemId = randomUUID();

  const insertResult = await sql`
    INSERT INTO menu_items (
      id,
      menu_id,
      name,
      description,
      price_cents,
      is_available,
      is_gluten_free,
      is_spicy,
      is_vegan,
      is_vegetarian
    )
    VALUES (
      ${itemId},
      ${menuId},
      ${name},
      ${description},
      ${priceCents},
      TRUE,
      ${isGlutenFree},
      ${isSpicy},
      ${isVegan},
      ${isVegetarian}
    )
    RETURNING id, name, description, price_cents, is_gluten_free, is_spicy, is_vegan, is_vegetarian
  `;

  return Response.json(insertResult.rows[0], { status: 201 });
}
