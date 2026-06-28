const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const products = [
  { sku_barcode: '6001011', name: 'Coca-Cola 500ml',          price: 1.99, cost: 0.90, stock_quantity: 100, category: 'Beverages' },
  { sku_barcode: '6001012', name: 'Pepsi 500ml',              price: 1.89, cost: 0.85, stock_quantity: 80,  category: 'Beverages' },
  { sku_barcode: '6001013', name: 'Mineral Water 1L',         price: 0.99, cost: 0.40, stock_quantity: 200, category: 'Beverages' },
  { sku_barcode: '6002011', name: 'Lays Original 100g',       price: 2.49, cost: 1.10, stock_quantity: 60,  category: 'Snacks'    },
  { sku_barcode: '6002012', name: 'Pringles Original',        price: 3.99, cost: 1.80, stock_quantity: 45,  category: 'Snacks'    },
  { sku_barcode: '6002013', name: 'Oreo Cookies 154g',        price: 2.99, cost: 1.30, stock_quantity: 55,  category: 'Snacks'    },
  { sku_barcode: '6003011', name: 'Dove Soap Bar',            price: 3.49, cost: 1.60, stock_quantity: 40,  category: 'Personal Care' },
  { sku_barcode: '6003012', name: 'Head & Shoulders 200ml',   price: 6.99, cost: 3.20, stock_quantity: 30,  category: 'Personal Care' },
  { sku_barcode: '6003013', name: 'Colgate Toothpaste',       price: 4.99, cost: 2.30, stock_quantity: 35,  category: 'Personal Care' },
  { sku_barcode: '6004011', name: 'Loaf Bread 500g',          price: 2.29, cost: 1.00, stock_quantity: 25,  category: 'Bakery'    },
  { sku_barcode: '6004012', name: 'Croissant x4',             price: 3.79, cost: 1.70, stock_quantity: 20,  category: 'Bakery'    },
  { sku_barcode: '6005011', name: 'Whole Milk 1L',            price: 1.79, cost: 0.80, stock_quantity: 50,  category: 'Dairy'     },
  { sku_barcode: '6005012', name: 'Greek Yogurt 500g',        price: 4.49, cost: 2.00, stock_quantity: 30,  category: 'Dairy'     },
  { sku_barcode: '6006011', name: 'Paracetamol 500mg x16',    price: 5.99, cost: 2.70, stock_quantity: 20,  category: 'Pharmacy'  },
  { sku_barcode: '6006012', name: 'Vitamin C 1000mg x30',     price: 8.99, cost: 4.00, stock_quantity: 15,  category: 'Pharmacy'  },
];

const users = [
  { name: 'Ahmad',  pin_hash: bcrypt.hashSync('1234', 10), role: 'admin'   },
  { name: 'Sara',   pin_hash: bcrypt.hashSync('0000', 10), role: 'cashier' },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  for (const user of users) {
    await prisma.user.create({ data: user });
  }
  console.log(`✅ Created ${users.length} users`);

  for (const product of products) {
    await prisma.product.create({ data: product });
  }
  console.log(`✅ Created ${products.length} products`);

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
