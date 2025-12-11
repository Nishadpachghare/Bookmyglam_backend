import express from "express";
import {
  getInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from "../controllers/inventoryController.js";

const router = express.Router();

// GET all inventory (or low stock with ?lowStock=true)
router.get("/", getInventory);

// CREATE new item
router.post("/", createInventoryItem);

// UPDATE item
router.put("/:id", updateInventoryItem);

// DELETE item
router.delete("/:id", deleteInventoryItem);

export default router;