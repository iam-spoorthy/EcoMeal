// Load environment variables
require('dotenv').config();

const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');

const CATEGORIES = ['Produce', 'Dairy', 'Meat & Seafood', 'Pantry Staples', 'Bakery'];
const UNITS = ['kg', 'grams', 'liters', 'pieces', 'crates', 'cans'];
const SUPPLIERS = [
  { name: 'Fresh Farms Produce', contact: '+1-555-0192' },
  { name: 'Metro Dairy Corp', contact: '+1-555-0144' },
  { name: 'Apex Meat Distributors', contact: '+1-555-0111' },
  { name: 'Supreme Pantry Goods', contact: '+1-555-0155' },
  { name: 'Golden Crust Mills', contact: '+1-555-0199' },
];

const INGREDIENT_TEMPLATES = {
  Produce: ['Mushroom', 'Tomato', 'Spinach', 'Onion', 'Garlic', 'Bell Pepper', 'Cilantro', 'Carrot', 'Potato', 'Lemon', 'Ginger', 'Lettuce', 'Basil', 'Avocado', 'Cucumber'],
  Dairy: ['Paneer', 'Milk', 'Heavy Cream', 'Butter', 'Cheddar Cheese', 'Mozzarella', 'Yogurt', 'Sour Cream', 'Cream Cheese'],
  'Meat & Seafood': ['Chicken Breast', 'Ground Beef', 'Pork Ribs', 'Salmon Fillet', 'Shrimp', 'Bacon', 'Turkey Breast'],
  'Pantry Staples': ['Olive Oil', 'Salt', 'Black Pepper', 'Rice', 'Flour', 'Sugar', 'Tomato Paste', 'Soy Sauce', 'Yeast', 'Pasta', 'Chickpeas', 'Cumin'],
  Bakery: ['Burger Buns', 'Sliced Bread', 'Tortillas', 'Croissants', 'Bagels', 'Pita Bread'],
};

/**
 * Seed database with 1050 randomized items.
 * Performance check dashboard tests target parameters limit.
 */
const seedDatabase = async () => {
  try {
    const dbUri = process.env.MONGODB_URI;
    if (!dbUri) {
      console.error('Error: MONGODB_URI is not set in environment.');
      process.exit(1);
    }

    console.log('Connecting to database for seeding...');
    await mongoose.connect(dbUri);
    console.log('Database connected successfully.');

    // Clear existing inventory
    console.log('Clearing existing inventory items...');
    await Inventory.deleteMany({});
    console.log('Database inventory collection cleared.');

    const seedItems = [];
    const now = new Date();

    // Generate 1050 items
    for (let i = 1; i <= 1050; i++) {
      // Pick category
      const category = CATEGORIES[i % CATEGORIES.length];
      
      // Pick template name
      const templates = INGREDIENT_TEMPLATES[category];
      const templateName = templates[i % templates.length];
      const itemName = `${templateName} (Batch #${Math.ceil(i / templates.length)})`;

      // Set randomized unit
      let unit = 'kg';
      if (category === 'Dairy' && (templateName.includes('Milk') || templateName.includes('Cream'))) {
        unit = 'liters';
      } else if (category === 'Pantry Staples' && (templateName.includes('Salt') || templateName.includes('Pepper') || templateName.includes('Cumin') || templateName.includes('Yeast'))) {
        unit = 'grams';
      } else if (category === 'Bakery' || templateName.includes('Lemon') || templateName.includes('Avocado')) {
        unit = 'pieces';
      }

      // Configure quantities
      let quantity = Math.floor(Math.random() * 80) + 1; // 1 to 80
      const lowStockThreshold = Math.random() > 0.5 ? 10 : 5;

      // Make a fraction of items out of stock (0 quantity)
      if (i % 25 === 0) {
        quantity = 0;
      }
      // Make a fraction of items low stock
      else if (i % 12 === 0) {
        quantity = Math.floor(Math.random() * lowStockThreshold) + 1;
      }

      // Configure expiry dates
      let expiryDate = new Date(now);
      if (i % 20 === 0) {
        // Already Expired: expiry date is 1 to 10 days in the past
        expiryDate.setDate(now.getDate() - (Math.floor(Math.random() * 10) + 1));
      } else if (i % 15 === 0) {
        // Expiring Soon: expiry date is 1 to 3 days in the future
        expiryDate.setDate(now.getDate() + (Math.floor(Math.random() * 3) + 1));
      } else {
        // Fresh: expiry date is 5 to 60 days in the future
        expiryDate.setDate(now.getDate() + (Math.floor(Math.random() * 55) + 5));
      }

      // Pick Supplier
      const supplier = SUPPLIERS[i % SUPPLIERS.length];

      seedItems.push({
        name: itemName,
        quantity,
        unit,
        expiryDate,
        category,
        supplierName: supplier.name,
        supplierContact: supplier.contact,
        lowStockThreshold,
        status: 'good', // Will be re-computed by model's pre-save hooks
      });
    }

    console.log(`Inserting ${seedItems.length} items. Please wait...`);
    await Inventory.insertMany(seedItems);
    console.log('Inventory successfully seeded with 1050 items!');
    
    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (err) {
    console.error(`Error seeding database: ${err.message}`, err);
    process.exit(1);
  }
};

seedDatabase();
