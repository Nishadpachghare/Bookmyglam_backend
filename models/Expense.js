import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    date: { type: String, required: true },
    expiryDate: { type: String },
    notes: { type: String, required: true },
    fileName: { type: String },
  },
  { timestamps: true } // ⬅️ isse createdAt, updatedAt milta hai
);

export default mongoose.model("Expense", expenseSchema);
