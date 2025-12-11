// controllers/inventoryController.js
import InventoryItem from "../models/InventoryItem.js";

// Helper: normalize body data (numbers + dates)
const normalizeItemPayload = (body) => {
  const {
    name,
    category,
    brand,
    sku,
    unit,
    stockQty,
    costPrice,
    salePrice,
    reorderLevel,
    supplierName,
    notes,
    date,
    expiryDate, // agar model me yeh field bhi hai to support ho jayega
  } = body;

  return {
    name,
    category: category || "",
    brand: brand || "",
    sku: sku || "",
    unit: unit || "pcs",

    stockQty: Number(stockQty) || 0,
    costPrice: Number(costPrice) || 0,
    salePrice: Number(salePrice) || 0,
    reorderLevel: Number(reorderLevel) || 0,

    supplierName: supplierName || "",
    notes: notes || "",

    // "date" field (e.g. added / purchased on)
    ...(date && { date: new Date(date) }),

    // optional expiryDate support
    ...(expiryDate && { expiryDate: new Date(expiryDate) }),
  };
};

// GET /api/inventory  (optional query: ?lowStock=true)
export const getInventory = async (req, res) => {
  try {
    const { lowStock } = req.query;
    let filter = {};

    if (lowStock === "true") {
      filter = {
        reorderLevel: { $gt: 0 },
        $expr: { $lte: ["$stockQty", "$reorderLevel"] },
      };
    }

    const items = await InventoryItem.find(filter).sort({ name: 1 });
    res.json({ ok: true, items });
  } catch (err) {
    console.error("getInventory error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
};

// POST /api/inventory
export const createInventoryItem = async (req, res) => {
  try {
    const payload = normalizeItemPayload(req.body);
    const item = await InventoryItem.create(payload);
    res.status(201).json({ ok: true, item });
  } catch (err) {
    console.error("createInventoryItem error:", err);
    res.status(400).json({ ok: false, error: err.message });
  }
};

// PUT /api/inventory/:id
export const updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = normalizeItemPayload(req.body);

    const item = await InventoryItem.findByIdAndUpdate(id, payload, {
      new: true,
    });

    if (!item) {
      return res.status(404).json({ ok: false, error: "Item not found" });
    }
    res.json({ ok: true, item });
  } catch (err) {
    console.error("updateInventoryItem error:", err);
    res.status(400).json({ ok: false, error: err.message });
  }
};

// DELETE /api/inventory/:id
export const deleteInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await InventoryItem.findByIdAndDelete(id);
    if (!item) {
      return res.status(404).json({ ok: false, error: "Item not found" });
    }
    res.json({ ok: true, message: "Item deleted" });
  } catch (err) {
    console.error("deleteInventoryItem error:", err);
    res.status(400).json({ ok: false, error: err.message });
  }
};
