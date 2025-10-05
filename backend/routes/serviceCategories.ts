// routes/serviceCategories.ts
import { Router, Request, Response } from "express";
import { Pool } from "pg";

const router = Router();

// GET /api/service-categories → fetch all active service categories
router.get("/", async (req: Request, res: Response) => {
  try {
    console.log('📦 Service Categories: Fetching categories...');
    
    const pool = (req as any).pool as Pool;
    
    const result = await pool.query(
      `SELECT category_id, category_name, description 
       FROM service_categories 
       WHERE is_active = true 
       ORDER BY display_order, category_name`
    );
    
    console.log(`✅ Service Categories: Found ${result.rows.length} categories`);
    
    res.json({
      success: true,
      categories: result.rows.map(row => row.category_name)
    });
  } catch (err: any) {
    console.error("❌ Error fetching service categories:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch service categories",
      message: err.message 
    });
  }
});

// POST /api/service-categories → add new category (admin only)
router.post("/", async (req: Request, res: Response) => {
  try {
    const pool = (req as any).pool as Pool;
    const { category_name, description, display_order } = req.body;

    if (!category_name) {
      return res.status(400).json({ 
        success: false, 
        error: "category_name is required" 
      });
    }

    const result = await pool.query(
      `INSERT INTO service_categories (category_name, description, display_order) 
       VALUES ($1, $2, $3) 
       RETURNING category_id, category_name, description, display_order`,
      [category_name.trim(), description || null, display_order || 0]
    );

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category: result.rows[0]
    });
  } catch (err: any) {
    console.error("Error creating service category:", err);
    
    // Handle unique constraint violation
    if (err.code === '23505') {
      return res.status(400).json({ 
        success: false, 
        error: "Category already exists" 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: "Failed to create service category",
      message: err.message 
    });
  }
});

export default router;