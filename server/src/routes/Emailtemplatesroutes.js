import express from "express";
import prisma from "../prismaClient.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();
            
// Get all templates for the logged-in user
router.get("/", protect, async (req, res) => {
  try {
    const templates = await prisma.emailTemplate.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: [{ leadStatus: "asc" }, { createdAt: "desc" }],
    });

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch templates",
      error: error.message,
    });
  }
});

// Get single template by ID
router.get("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;

    const template = await prisma.emailTemplate.findUnique({
      where: { id: parseInt(id) },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    // Verify ownership
    if (template.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this template",
      });
    }

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error("Error fetching template:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch template",
      error: error.message,
    });
  }
});

// Get templates filtered by lead status
router.get("/by-status/:status", protect, async (req, res) => {
  try {
    const { status } = req.params;

    const templates = await prisma.emailTemplate.findMany({
      where: {
        userId: req.user.id,
        leadStatus: status,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error("Error fetching templates by status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch templates",
      error: error.message,
    });
  }
});

// Create new template
router.post("/", protect, async (req, res) => {
  try {
    const { name, subject, bodyHtml, leadStatus, category, isShared } =
      req.body;

    if (!name || !bodyHtml) {
      return res.status(400).json({
        success: false,
        message: "Template name and body are required",
      });
    }

    const template = await prisma.emailTemplate.create({
      data: {
        userId: req.user.id,
        name,
        subject: subject || null,
        bodyHtml,
        leadStatus: leadStatus || null,
        category: category || null,
        isShared: isShared || false,
      },
    });

    res.status(201).json({
      success: true,
      message: "Template created successfully",
      data: template,
    });
  } catch (error) {
    console.error("Error creating template:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create template",
      error: error.message,
    });
  }
});

// Update existing template
router.put("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject, bodyHtml, leadStatus, category, isShared } =
      req.body;

    // Check if template exists and user owns it
    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    if (existingTemplate.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this template",
      });
    }

    const updatedTemplate = await prisma.emailTemplate.update({
      where: { id: parseInt(id) },
      data: {
        name: name || existingTemplate.name,
        subject: subject !== undefined ? subject : existingTemplate.subject,
        bodyHtml: bodyHtml || existingTemplate.bodyHtml,
        leadStatus:
          leadStatus !== undefined ? leadStatus : existingTemplate.leadStatus,
        category: category !== undefined ? category : existingTemplate.category,
        isShared: isShared !== undefined ? isShared : existingTemplate.isShared,
      },
    });

    res.json({
      success: true,
      message: "Template updated successfully",
      data: updatedTemplate,
    });
  } catch (error) {
    console.error("Error updating template:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update template",
      error: error.message,
    });
  }
});

// Delete template
router.delete("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if template exists and user owns it
    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    if (existingTemplate.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this template",
      });
    }

    await prisma.emailTemplate.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete template",
      error: error.message,
    });
  }
});

// Increment template use count
router.patch("/:id/use", protect, async (req, res) => {
  try {
    const { id } = req.params;

    const template = await prisma.emailTemplate.update({
      where: { id: parseInt(id) },
      data: {
        useCount: {
          increment: 1,
        },
      },
    });

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error("Error incrementing template use count:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update template use count",
      error: error.message,
    });
  }
});

export default router;
