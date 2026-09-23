import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categorySlug = searchParams.get("category");
    const dietarySlug = searchParams.get("dietary");
    const flavourQuery = searchParams.get("flavour");
    const sizeQuery = searchParams.get("size");
    const maxPrice = searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!, 10) : null;
    const sort = searchParams.get("sort") || "popular";

    const client = await pool.connect();
    try {
      // 1. Fetch categories
      const categoriesRes = await client.query(
        `SELECT id, name, slug, description, image_url, display_order 
         FROM categories 
         ORDER BY display_order ASC`
      );

      // 2. Fetch dietary tags
      const dietaryRes = await client.query(
        `SELECT id, name, slug, icon FROM dietary_tags ORDER BY name ASC`
      );

      // 3. Fetch products query
      let query = `
        SELECT 
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
        WHERE p.is_active = true
      `;

      const params: any[] = [];
      let paramIdx = 1;

      if (categorySlug && categorySlug !== "all") {
        query += ` AND EXISTS (
          SELECT 1 FROM product_categories pc2 
          JOIN categories c2 ON pc2.category_id = c2.id 
          WHERE pc2.product_id = p.id AND c2.slug = $${paramIdx++}
        )`;
        params.push(categorySlug);
      }

      if (dietarySlug && dietarySlug !== "all") {
        query += ` AND EXISTS (
          SELECT 1 FROM product_dietary_tags pdt2 
          JOIN dietary_tags dt2 ON pdt2.dietary_tag_id = dt2.id 
          WHERE pdt2.product_id = p.id AND dt2.slug = $${paramIdx++}
        )`;
        params.push(dietarySlug);
      }

      if (maxPrice) {
        query += ` AND p.base_price <= $${paramIdx++}`;
        params.push(maxPrice);
      }

      query += ` GROUP BY p.id`;

      if (sort === "price-asc") {
        query += ` ORDER BY p.base_price ASC`;
      } else if (sort === "price-desc") {
        query += ` ORDER BY p.base_price DESC`;
      } else {
        query += ` ORDER BY p.created_at ASC`;
      }

      const productsRes = await client.query(query, params);

      // 4. Fetch options (sizes, flavours) for all products
      const optionsRes = await client.query(
        `SELECT id, product_id, option_type, name, price_modifier, is_default 
         FROM product_options 
         ORDER BY price_modifier ASC`
      );

      const optionsByProduct: Record<string, { sizes: any[]; flavours: any[] }> = {};
      for (const opt of optionsRes.rows) {
        if (!optionsByProduct[opt.product_id]) {
          optionsByProduct[opt.product_id] = { sizes: [], flavours: [] };
        }
        if (opt.option_type === "size") {
          optionsByProduct[opt.product_id].sizes.push({
            id: opt.id,
            productId: opt.product_id,
            name: opt.name,
            priceModifier: opt.price_modifier,
            isDefault: opt.is_default,
          });
        } else if (opt.option_type === "flavour") {
          optionsByProduct[opt.product_id].flavours.push({
            id: opt.id,
            productId: opt.product_id,
            name: opt.name,
            priceModifier: opt.price_modifier,
            isDefault: opt.is_default,
          });
        }
      }

      // Combine products with options and filter by flavour or size if requested
      let cakes = productsRes.rows.map((row) => {
        const opts = optionsByProduct[row.id] || { sizes: [], flavours: [] };
        return {
          id: row.id,
          name: row.name,
          slug: row.slug,
          description: row.description,
          basePrice: row.base_price,
          imageUrl: row.image_url,
          isActive: row.is_active,
          categories: typeof row.categories === "string" ? JSON.parse(row.categories) : row.categories,
          dietaryTags: typeof row.dietary_tags === "string" ? JSON.parse(row.dietary_tags) : row.dietary_tags,
          sizes: opts.sizes,
          flavours: opts.flavours,
        };
      });

      if (flavourQuery && flavourQuery !== "all") {
        cakes = cakes.filter((c) =>
          c.flavours.some((f: any) => f.name.toLowerCase().includes(flavourQuery.toLowerCase()))
        );
      }

      if (sizeQuery && sizeQuery !== "all") {
        cakes = cakes.filter((c) =>
          c.sizes.some((s: any) => s.name.toLowerCase().includes(sizeQuery.toLowerCase()))
        );
      }

      return NextResponse.json({
        cakes,
        categories: categoriesRes.rows,
        dietaryTags: dietaryRes.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching cakes:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch cakes" },
      { status: 500 }
    );
  }
}
