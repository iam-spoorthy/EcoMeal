const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const { protect, restrictTo } = require('../middleware/auth.middleware');

/**
 * @route   GET /api/inventory
 * @desc    Get paginated, filtered, sorted inventory items
 * @access  Private (All roles can view)
 */
router.get('/', protect, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const { search, category, status, sortBy, sortOrder } = req.query;

    // Build query filters dynamically
    const filterQuery = {};

    // Filter by name search
    if (search) {
      filterQuery.name = { $regex: search, $options: 'i' };
    }

    // Filter by category
    if (category && category !== 'All') {
      filterQuery.category = category;
    }

    // Filter by status (good, low_stock, expiring_soon, expired)
    if (status && status !== 'All') {
      filterQuery.status = status;
    }

    // Build sorting logic
    const sortQuery = {};
    if (sortBy) {
      const order = sortOrder === 'desc' ? -1 : 1;
      sortQuery[sortBy] = order;
    } else {
      // Default: sort by expiryDate ascending (closest to expire first)
      sortQuery.expiryDate = 1;
    }

    // Execute query with pagination and index support
    const items = await Inventory.find(filterQuery)
      .sort(sortQuery)
      .skip(skip)
      .limit(limit);

    // Count total documents matching filters for pagination control
    const totalItems = await Inventory.countDocuments(filterQuery);
    const totalPages = Math.ceil(totalItems / limit);

    res.status(200).json({
      success: true,
      data: items,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/inventory/stats
 * @desc    Get summary statistics for dashboard cards
 * @access  Private
 */
router.get('/stats', protect, async (req, res, next) => {
  try {
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    const totalItems = await Inventory.countDocuments();
    
    // Aggregation queries or separate counts
    const outOfStock = await Inventory.countDocuments({ quantity: 0 });
    const expired = await Inventory.countDocuments({ expiryDate: { $lt: now } });
    const expiringSoon = await Inventory.countDocuments({
      expiryDate: { $gte: now, $lte: threeDaysFromNow }
    });
    
    // Low stock: quantity is less than or equal to lowStockThreshold and not out of stock
    const lowStock = await Inventory.countDocuments({
      $expr: { $lte: ['$quantity', '$lowStockThreshold'] },
      quantity: { $gt: 0 }
    });

    res.status(200).json({
      success: true,
      stats: {
        totalItems,
        outOfStock,
        expired,
        expiringSoon,
        lowStock
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/inventory/:id
 * @desc    Get single inventory item
 * @access  Private
 */
router.get('/:id', protect, async (req, res, next) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found',
      });
    }
    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/inventory
 * @desc    Create new inventory item
 * @access  Private (Admin & Kitchen Manager only)
 */
router.post(
  '/',
  protect,
  restrictTo('admin', 'kitchen_manager'),
  async (req, res, next) => {
    try {
      // Set the modifier user ID
      const itemData = { ...req.body, lastUpdatedBy: req.user._id };
      
      const newItem = await Inventory.create(itemData);

      // Real-time WebSocket emission to synchronize other tabs/devices
      if (req.io) {
        req.io.emit('inventory_change', {
          action: 'create',
          data: newItem,
        });
      }

      res.status(201).json({
        success: true,
        data: newItem,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route   PUT /api/inventory/:id
 * @desc    Update existing inventory item
 * @access  Private (Admin & Kitchen Manager only)
 */
router.put(
  '/:id',
  protect,
  restrictTo('admin', 'kitchen_manager'),
  async (req, res, next) => {
    try {
      const item = await Inventory.findById(req.params.id);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found',
        });
      }

      // Merge new data and set modified modifier
      const updateData = { ...req.body, lastUpdatedBy: req.user._id };
      
      // Update inventory and re-run pre-save hooks for status re-calculation
      Object.assign(item, updateData);
      const updatedItem = await item.save();

      // Real-time WebSocket emission to other active sessions
      if (req.io) {
        req.io.emit('inventory_change', {
          action: 'update',
          data: updatedItem,
        });
      }

      res.status(200).json({
        success: true,
        data: updatedItem,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route   DELETE /api/inventory/:id
 * @desc    Delete inventory item
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  protect,
  restrictTo('admin'),
  async (req, res, next) => {
    try {
      const item = await Inventory.findById(req.params.id);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found',
        });
      }

      await item.deleteOne();

      // Real-time WebSocket emission to refresh screen data instantly
      if (req.io) {
        req.io.emit('inventory_change', {
          action: 'delete',
          id: req.params.id,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Inventory item successfully deleted',
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
