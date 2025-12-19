// routes/expenseRoutes.js
import express from "express";
import {
  createExpense,
  getAllExpenses,
  updateExpense,
  deleteExpense,
} from "../controllers/ExpenseController.js";

const router = express.Router();

router.post("/", createExpense);
router.get("/", getAllExpenses);
router.put("/:id", updateExpense);
router.delete("/:id", deleteExpense);

export default router;
