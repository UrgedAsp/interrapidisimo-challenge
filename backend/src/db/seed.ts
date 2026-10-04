import 'dotenv/config';
import bcrypt from 'bcrypt';
import db from './database';
import seedData from './seed-data.json';

async function seed() {
  console.log('🌱 Iniciando seed...');

  // Limpiar datos existentes (orden inverso de dependencias)
  db.exec(`
    DELETE FROM points_ledger;
    DELETE FROM favorites;
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM cart_items;
    DELETE FROM carts;
    DELETE FROM products;
    DELETE FROM categories;
    DELETE FROM users;
  `);

  // Usuarios seed
  const users = [
    { email: 'ana@example.com', name: 'Ana García', password: 'password123' },
    { email: 'carlos@example.com', name: 'Carlos López', password: 'password123' },
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (email, password, name, points)
    VALUES (@email, @password, @name, 0)
  `);

  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 10);
    insertUser.run({ email: user.email, password: hash, name: user.name });
    console.log(`  ✅ Usuario creado: ${user.email}`);
  }

  // Categorías y productos
  const insertCategory = db.prepare(`
    INSERT INTO categories (slug, name) VALUES (@slug, @name)
  `);
  const insertProduct = db.prepare(`
    INSERT INTO products (category_id, name, description, price, stock, image_url, rating)
    VALUES (@category_id, @name, @description, @price, @stock, @image_url, @rating)
  `);

  for (const category of seedData) {
    const catResult = insertCategory.run({ slug: category.slug, name: category.name });
    const categoryId = catResult.lastInsertRowid;
    console.log(`  📦 Categoría: ${category.name}`);

    for (const product of category.products) {
      insertProduct.run({
        category_id: categoryId,
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        image_url: product.image_url,
        rating: product.rating,
      });
    }
    console.log(`     └─ ${category.products.length} productos insertados`);
  }

  console.log('✅ Seed completado exitosamente');
}

seed().catch((err) => {
  console.error('❌ Error en seed:', err);
  process.exit(1);
});
