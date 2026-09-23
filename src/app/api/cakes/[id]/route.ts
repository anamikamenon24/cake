import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await pool.connect();

    try {
      // Find by UUID or slug
      const productRes = await client.query(
        `SELECT 
          p.id, p.name, p.slug, p.description, p.base_price, p.image_url, p.is_active,
          COALESCE(
            json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug)) 
            FILTER (WHERE c.id IS NOT NULL), '[]'
          ) AS categories,
          COALESCE(
            json_agg(DISTINCT jsonb_build_object('id', dt.id, 'name', dt.name, 'slug', dt.slug, 'icon', dt.icon)) 
            FILTER (WHERE dt.id IS NOT NULL), '[]'
          ) AS dietary_tags
        FROM products p
        LEFT JOIN product_categories pc ON p.id = pc.product_id
        LEFT JOIN categories c ON pc.category_id = c.id
        LEFT JOIN product_dietary_tags pdt ON p.id = pdt.product_id
        LEFT JOIN dietary_tags dt ON pdt.dietary_tag_id = dt.id
        WHERE p.id::text = $1 OR p.slug = $1
        GROUP BY p.id`,
        [id]
      );

      if (productRes.rows.length === 0) {
        return NextResponse.json({ error: "Cake not found" }, { status: 404 });
      }

      const product = productRes.rows[0];

      // Fetch options
      const optionsRes = await client.query(
        `SELECT id, product_id, option_type, name, price_modifier, is_default 
         FROM product_options 
         WHERE product_id = $1 
         ORDER BY price_modifier ASC`,
        [product.id]
      );

      const sizes = optionsRes.rows
        .filter((o) => o.option_type === "size")
        .map((o) => ({
          id: o.id,
          productId: o.product_id,
          name: o.name,
          priceModifier: o.price_modifier,
          isDefault: o.is_default,
        }));

      const flavours = optionsRes.rows
        .filter((o) => o.option_type === "flavour")
        .map((o) => ({
          id: o.id,
          productId: o.product_id,
          name: o.name,
          priceModifier: o.price_modifier,
          isDefault: o.is_default,
        }));

      return NextResponse.json({
        cake: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          basePrice: product.base_price,
          imageUrl: product.image_url,
          isActive: product.is_active,
          categories: typeof product.categories === "string" ? JSON.parse(product.categories) : product.categories,
          dietaryTags: typeof product.dietary_tags === "string" ? JSON.parse(product.dietary_tags) : product.dietary_tags,
          sizes,
          flavours,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching cake:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch cake details" },
      { status: 500 }
    );
  }
}
