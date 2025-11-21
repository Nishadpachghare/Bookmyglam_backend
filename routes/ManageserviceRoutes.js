import express from "express";
import { addService, getServices, deleteService, updateService } from "../controllers/ManageserviceController.js";

const router = express.Router();

router.post("/", addService);
router.get("/", getServices);
router.delete("/:id", deleteService);
router.put("/:id", updateService);

export default router;