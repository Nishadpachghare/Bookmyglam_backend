import Service from "../models/Manageservice.js";

// Add new service
export const addService = async (req, res) => {
  try {
    const { service, description, duration, price } = req.body;

    if (!service || !description || !duration || !price) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newService = new Service({ service, description, duration, price });
    await newService.save();

    res.status(201).json({ message: "Service added successfully", service: newService });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all services
export const getServices = async (req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a service
export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    await Service.findByIdAndDelete(id);
    res.status(200).json({ message: "Service deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a service
export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { service, description, duration, price } = req.body;

    if (!service || !description || !duration || !price) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const updatedService = await Service.findByIdAndUpdate(
      id,
      { service, description, duration, price },
      { new: true }
    );

    if (!updatedService) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.status(200).json({ 
      message: "Service updated successfully", 
      service: updatedService 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};