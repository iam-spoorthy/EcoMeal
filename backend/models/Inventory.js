const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please enter ingredient name'],
      trim: true,
      index: true, // Index for searching
    },
    quantity: {
      type: Number,
      required: [true, 'Please enter quantity'],
      min: [0, 'Quantity cannot be negative'],
    },
    unit: {
      type: String,
      required: [true, 'Please enter unit (e.g., kg, liters, pcs)'],
      trim: true,
    },
    expiryDate: {
      type: Date,
      required: [true, 'Please enter expiry date'],
      index: true, // Index for sorting/filtering expiring items
    },
    category: {
      type: String,
      required: [true, 'Please select a category'],
      trim: true,
      index: true, // Index for filtering by category
    },
    supplierName: {
      type: String,
      default: 'General Supplier',
    },
    supplierContact: {
      type: String,
      default: '',
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
    },
    status: {
      type: String,
      enum: ['good', 'low_stock', 'expiring_soon', 'expired'],
      default: 'good',
      index: true, // Index for filtering status
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Mongoose Compound Index for optimization on sorting by category and expiryDate
InventorySchema.index({ category: 1, expiryDate: 1 });
InventorySchema.index({ name: 'text' }); // Text search index

// Pre-save hook: auto-compute stock status based on expiration date and quantities
InventorySchema.pre('save', function (next) {
  const now = new Date();
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(now.getDate() + 3);

  if (this.expiryDate < now) {
    this.status = 'expired';
  } else if (this.expiryDate <= threeDaysFromNow) {
    this.status = 'expiring_soon';
  } else if (this.quantity <= this.lowStockThreshold) {
    this.status = 'low_stock';
  } else {
    this.status = 'good';
  }

  next();
});

module.exports = mongoose.model('Inventory', InventorySchema);
