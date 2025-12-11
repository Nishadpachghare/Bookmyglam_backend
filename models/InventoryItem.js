// models/InventoryItem.js
import mongoose from "mongoose";

const InventoryItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },   // Product name

    category: { type: String, default: "" }, // Shampoo, Tools, etc.
    brand: { type: String, default: "" },

    sku: { type: String, default: "" },       // Barcode / internal code
    unit: { type: String, default: "pcs" },   // pcs, ml, g, box

    stockQty: { type: Number, default: 0 },  
    costPrice: { type: Number, default: 0 },
    salePrice: { type: Number, default: 0 },

    reorderLevel: { type: Number, default: 0 },
    supplierName: { type: String, default: "" },

    notes: { type: String, default: "" },

    date: { type: Date, default: Date.now }, // ✅ FIXED DATE FIELD
  },
  { timestamps: true }
);

export default mongoose.models.InventoryItem ||
  mongoose.model("InventoryItem", InventoryItemSchema);
