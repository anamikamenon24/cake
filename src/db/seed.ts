import { pool } from "./index";
import { runMigrations } from "./migrate";
import bcrypt from "bcryptjs";

export async function seedDatabase() {
  await runMigrations();
  console.log("🌱 Starting CakeCart database seeding...");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Seed Dietary Tags
    console.log("-> Seeding dietary tags...");
    const dietaryTagsData = [
      { name: "Eggless", slug: "eggless", icon: "egg-off" },
      { name: "Gluten-Free", slug: "gluten-free", icon: "wheat-off" },
      { name: "Nut-Free", slug: "nut-free", icon: "nut-off" },
    ];

    const tagMap: Record<string, string> = {};
    for (const tag of dietaryTagsData) {
      const res = await client.query(
        `INSERT INTO dietary_tags (name, slug, icon)
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon
         RETURNING id, slug`,
        [tag.name, tag.slug, tag.icon]
      );
      tagMap[res.rows[0].slug] = res.rows[0].id;
    }

    // 2. Seed Categories
    console.log("-> Seeding categories...");
    const categoriesData = [
      {
        name: "Celebration Cakes",
        slug: "celebration",
        description: "Show-stopping handcrafted multi-layer cakes for milestones and birthdays.",
        imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=800&auto=format&fit=crop",
        displayOrder: 1,
      },
      {
        name: "Artisan Chiffons & Sponges",
        slug: "chiffon-sponge",
        description: "Featherlight, cloud-soft sponges infused with pure botanicals and berries.",
        imageUrl: "https://images.unsplash.com/photo-1535141192574-5d4897c13136?q=80&w=800&auto=format&fit=crop",
        displayOrder: 2,
      },
      {
        name: "Dietary Specials",
        slug: "dietary-specials",
        description: "Gloriously rich artisan bakes crafted eggless, gluten-free, or nut-free without compromise.",
        imageUrl: "https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?q=80&w=800&auto=format&fit=crop",
        displayOrder: 3,
      },
    ];

    const catMap: Record<string, string> = {};
    for (const cat of categoriesData) {
      const res = await client.query(
        `INSERT INTO categories (name, slug, description, image_url, display_order)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (slug) DO UPDATE 
         SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url
         RETURNING id, slug`,
        [cat.name, cat.slug, cat.description, cat.imageUrl, cat.displayOrder]
      );
      catMap[res.rows[0].slug] = res.rows[0].id;
    }

    // 3. Seed Users (Demo Baker and Customer)
    console.log("-> Seeding users...");
    const passwordHash = await bcrypt.hash("BakeryPass123!", 10);
    const usersData = [
      {
        email: "baker@cakecart.com",
        fullName: "Chef Elena Rostova",
        phone: "+1 (555) 234-5678",
        role: "baker",
      },
      {
        email: "customer@cakecart.com",
        fullName: "Sarah Jenkins",
        phone: "+1 (555) 987-6543",
        role: "customer",
      },
    ];

    for (const u of usersData) {
      await client.query(
        `INSERT INTO users (email, password_hash, full_name, phone, role)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE 
         SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, password_hash = EXCLUDED.password_hash`,
        [u.email, passwordHash, u.fullName, u.phone, u.role]
      );
    }

    // 4. Seed Products
    console.log("-> Seeding artisan cakes...");
    const cakesData = [
      {
        name: "Belgian Dark Chocolate Truffle Cake",
        slug: "dark-chocolate-truffle",
        description: "Intense 70% Callebaut dark chocolate ganache layered between velvety fudge sponge and finished with cocoa velvet spray.",
        basePrice: 4800, // $48.00
        imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=800&auto=format&fit=crop",
        categorySlug: "celebration",
        dietary: ["nut-free"],
      },
      {
        name: "Tahitian Vanilla & Wild Berry Chiffon",
        slug: "vanilla-berry-chiffon",
        description: "Cloud-light vanilla bean chiffon layered with house-simmered blackberry and raspberry compote and Swiss meringue buttercream.",
        basePrice: 4500, // $45.00
        imageUrl: "https://images.unsplash.com/photo-1535141192574-5d4897c13136?q=80&w=800&auto=format&fit=crop",
        categorySlug: "chiffon-sponge",
        dietary: ["eggless", "nut-free"],
      },
      {
        name: "Sicilian Pistachio & Rose Water Sponge",
        slug: "pistachio-rose-sponge",
        description: "Slow-roasted Bronte pistachios folded into delicate sponge, perfumed with Persian rose water and white chocolate cardamom whip.",
        basePrice: 5200, // $52.00
        imageUrl: "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?q=80&w=800&auto=format&fit=crop",
        categorySlug: "celebration",
        dietary: [],
      },
      {
        name: "Salted Caramel Lotus Biscoff Dream",
        slug: "lotus-biscoff-dream",
        description: "Caramelized speculoos cookie butter folded through fluffy sponge, topped with house sea salt butterscotch drizzle and biscuit crunch.",
        basePrice: 4900, // $49.00
        imageUrl: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?q=80&w=800&auto=format&fit=crop",
        categorySlug: "celebration",
        dietary: ["eggless", "nut-free"],
      },
      {
        name: "Flourless Valencia Orange & Almond Torte",
        slug: "orange-almond-torte",
        description: "Naturally gluten-free Spanish torte made with whole poached Valencia oranges, finely milled Mediterranean almonds, and floral honey glaze.",
        basePrice: 5000, // $50.00
        imageUrl: "https://images.unsplash.com/photo-1519869325930-281384150729?q=80&w=800&auto=format&fit=crop",
        categorySlug: "dietary-specials",
        dietary: ["gluten-free"],
      },
      {
        name: "Classic Red Velvet with Whipped Mascarpone",
        slug: "classic-red-velvet",
        description: "A tender buttermilk cocoa crumb layered with delicate whipped Italian mascarpone frosting and crimson cake crumb velvet.",
        basePrice: 4600, // $46.00
        imageUrl: "https://images.unsplash.com/photo-1616541823729-00fe0aacd32c?q=80&w=800&auto=format&fit=crop",
        categorySlug: "celebration",
        dietary: ["nut-free"],
      },
      {
        name: "Spiced Carrot & Toasted Walnut Cake",
        slug: "spiced-carrot-cake",
        description: "Farm-fresh organic carrots with Ceylon cinnamon, nutmeg, toasted walnuts, and silky lemon zest cream cheese frosting.",
        basePrice: 4400, // $44.00
        imageUrl: "https://images.unsplash.com/photo-1621303837174-89787a7d4729?q=80&w=800&auto=format&fit=crop",
        categorySlug: "celebration",
        dietary: ["eggless"],
      },
      {
        name: "Matcha Green Tea & Yuzu Blossom Cake",
        slug: "matcha-yuzu-cake",
        description: "Ceremonial Uji matcha sponge with vibrant citrusy Japanese yuzu curd and white chocolate mousse layers.",
        basePrice: 5400, // $54.00
        imageUrl: "https://images.unsplash.com/photo-1542826438-bd32f43d626f?q=80&w=800&auto=format&fit=crop",
        categorySlug: "dietary-specials",
        dietary: ["gluten-free", "eggless", "nut-free"],
      },
    ];

    for (const cake of cakesData) {
      const prodRes = await client.query(
        `INSERT INTO products (name, slug, description, base_price, image_url, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (slug) DO UPDATE 
         SET name = EXCLUDED.name, description = EXCLUDED.description, 
             base_price = EXCLUDED.base_price, image_url = EXCLUDED.image_url
         RETURNING id`,
        [cake.name, cake.slug, cake.description, cake.basePrice, cake.imageUrl]
      );
      const productId = prodRes.rows[0].id;

      // Associate category
      const categoryId = catMap[cake.categorySlug];
      if (categoryId) {
        await client.query(
          `INSERT INTO product_categories (product_id, category_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [productId, categoryId]
        );
      }

      // Associate dietary tags
      for (const dSlug of cake.dietary) {
        const dId = tagMap[dSlug];
        if (dId) {
          await client.query(
            `INSERT INTO product_dietary_tags (product_id, dietary_tag_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [productId, dId]
          );
        }
      }

      // Seed options: Sizes
      const sizes = [
        { name: '6" Petit (Serves 6-8)', modifier: 0, isDefault: true },
        { name: '8" Classic (Serves 12-14)', modifier: 1500, isDefault: false },
        { name: '10" Grand (Serves 20-25)', modifier: 3200, isDefault: false },
      ];

      for (const sz of sizes) {
        await client.query(
          `INSERT INTO product_options (product_id, option_type, name, price_modifier, is_default)
           VALUES ($1, 'size', $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [productId, sz.name, sz.modifier, sz.isDefault]
        );
      }

      // Seed options: Flavours
      const flavours = [
        { name: "Original Baker's Signature", modifier: 0, isDefault: true },
        { name: "Dark Chocolate Truffle Whip", modifier: 200, isDefault: false },
        { name: "Salted Butter Caramel Drizzle", modifier: 200, isDefault: false },
        { name: "Wild Raspberry Coulis", modifier: 250, isDefault: false },
      ];

      for (const fl of flavours) {
        await client.query(
          `INSERT INTO product_options (product_id, option_type, name, price_modifier, is_default)
           VALUES ($1, 'flavour', $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [productId, fl.name, fl.modifier, fl.isDefault]
        );
      }
    }

    // 5. Seed Daily Capacity and Pickup Slots for the next 14 days
    console.log("-> Seeding 14 days of capacity and pickup slots...");
    const today = new Date();

    for (let i = 0; i < 14; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);
      const dateString = targetDate.toISOString().split("T")[0];

      // Day 12 closed for maintenance demonstration, other days open with capacity 8
      const isClosed = i === 12;
      const maxCakes = 8;
      const reservedCakes = i === 3 ? 2 : 0; // slight sample reservation

      await client.query(
        `INSERT INTO daily_capacity (bakery_date, max_cakes, reserved_cakes, is_closed)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (bakery_date) DO UPDATE 
         SET max_cakes = EXCLUDED.max_cakes, is_closed = EXCLUDED.is_closed`,
        [dateString, maxCakes, reservedCakes, isClosed]
      );

      // Seed 4 pickup slots per day
      const slots = [
        { start: "10:00:00", end: "12:00:00", max: 5 },
        { start: "12:00:00", end: "14:00:00", max: 5 },
        { start: "14:00:00", end: "16:00:00", max: 5 },
        { start: "16:00:00", end: "18:00:00", max: 5 },
      ];

      for (const slot of slots) {
        await client.query(
          `INSERT INTO pickup_slots (bakery_date, start_time, end_time, max_orders, reserved_orders)
           VALUES ($1, $2, $3, $4, 0)
           ON CONFLICT DO NOTHING`,
          [dateString, slot.start, slot.end, slot.max]
        );
      }
    }

    await client.query("COMMIT");
    console.log("✅ CakeCart database seeded successfully!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Direct execution when run via `npm run db:seed`
if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
