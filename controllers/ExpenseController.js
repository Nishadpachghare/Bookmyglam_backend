import Expense from "../models/Expense.js";

// POST /api/expenses
export const createExpense = async (req, res) => {
  try {
    const { amount, date, expiryDate, notes, fileName } = req.body;

    // Optional basic validation
    if (!amount || !date || !notes) {
      return res
        .status(400)
        .json({ message: "Amount, date and notes are required" });
    }

    const expense = await Expense.create({
      amount,
      date,
      expiryDate,
      notes,
      fileName,
    });

    res.status(201).json({ message: "Expense created", expense });
  } catch (err) {
    console.error("Error creating expense:", err);
    res
      .status(500)
      .json({ message: "Error creating expense", details: err.message });
  }
};

// GET /api/expenses
export const getAllExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ createdAt: -1 });
    res.json(expenses);
  } catch (err) {
    console.error("Error fetching expenses:", err);
    res
      .status(500)
      .json({ message: "Error fetching expenses", details: err.message });
  }
};

// PUT /api/expenses/:id
export const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, date, expiryDate, notes, fileName } = req.body;

    const expense = await Expense.findByIdAndUpdate(
      id,
      { amount, date, expiryDate, notes, fileName },
      { new: true }
    );

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json({ message: "Expense updated", expense });
  } catch (err) {
    console.error("Error updating expense:", err);
    res
      .status(500)
      .json({ message: "Error updating expense", details: err.message });
  }
};

// DELETE /api/expenses/:id
export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findByIdAndDelete(id);

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json({ message: "Expense deleted" });
  } catch (err) {
    console.error("Error deleting expense:", err);
    res
      .status(500)
      .json({ message: "Error deleting expense", details: err.message });
  }
};
