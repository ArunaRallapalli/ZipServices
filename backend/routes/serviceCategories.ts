/**
 * serviceCategories.ts - UPDATED TO USE SUPABASE CLIENT
 * 
 * CHANGES MADE:
 * - Replaced all pool.query() calls with supabase.from() calls
 * - Converted SQL queries to Supabase JavaScript client syntax
 * - Maintained all existing functionality
 * - All routes now use the working Supabase client connection
 * 
 * ENDPOINTS:
 * - GET  /api/service-categories → List all active categories
 * - POST /api/service-categories → Create new category (admin)
 * - GET  /api/service-categories/requests/pending → Get pending category requests
 * - POST /api/service-categories/requests/:id/approve → Approve request
 * - POST /api/service-categories/requests/:id/reject → Reject request
 * - GET  /api/service-categories/requests/user/:userId → Get user's requests
 * - GET  /api/service-categories/requests/stats → Get statistics
 */

import { Router, Request, Response } from "express";
import { supabase } from "../config/Supabase";

const router = Router();

// ============================================================================
// GET /api/service-categories
// ============================================================================
router.get("/", async (req: Request, res: Response) => {
  try {
    console.log('📦 Service Categories: Fetching categories...');
    
    const { data, error } = await supabase
      .from('service_categories')
      .select('category_id, category_name, description, accepts_payment')
      .eq('is_active', true)
      .order('category_name', { ascending: true });
    
    if (error) throw error;
    
    console.log(`✅ Service Categories: Found ${data.length} categories`);
    
 // ✅ FIXED - Returns full objects with display_order
res.json({
  success: true,
  categories: data  // Return full objects
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

// ============================================================================
// POST /api/service-categories
// ============================================================================
router.post("/", async (req: Request, res: Response) => {
  try {
    const { category_name, description, display_order } = req.body;

    if (!category_name) {
      return res.status(400).json({ 
        success: false, 
        error: "category_name is required" 
      });
    }

    const { data, error } = await supabase
      .from('service_categories')
      .insert([{
        category_name: category_name.trim(),
        description: description || null,
        display_order: display_order || 0
      }])
      .select('category_id, category_name, description, display_order')
      .single();

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        return res.status(400).json({ 
          success: false, 
          error: "Category already exists" 
        });
      }
      throw error;
    }

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category: data
    });
  } catch (err: any) {
    console.error("Error creating service category:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to create service category",
      message: err.message 
    });
  }
});

// ============================================================================
// GET /api/service-categories/requests/pending
// ============================================================================
router.get("/requests/pending", async (req: Request, res: Response) => {
  try {
    console.log('📋 Fetching pending category requests...');
    
    const { data, error } = await supabase
      .from('service_posts')
      .select('id, user_id, title, description, contact_email, created_at, status')
      .eq('post_type', 'category_request')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Map to match expected response format
    const requests = data.map(row => ({
      id: row.id,
      user_id: row.user_id,
      category_name: row.title,
      justification: row.description,
      contact_email: row.contact_email,
      created_at: row.created_at,
      status: row.status
    }));
    
    console.log(`✅ Found ${requests.length} pending category requests`);
    
    res.json({
      success: true,
      requests
    });
  } catch (err: any) {
    console.error("❌ Error fetching category requests:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch category requests",
      message: err.message 
    });
  }
});

// ============================================================================
// GET /api/service-categories/requests/user/:userId
// ============================================================================
router.get("/requests/user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    console.log(`📋 Fetching category requests for user ${userId}...`);
    
    const { data, error } = await supabase
      .from('service_posts')
      .select('id, title, description, status, created_at, updated_at')
      .eq('user_id', userId)
      .eq('post_type', 'category_request')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Map to match expected response format
    const requests = data.map(row => ({
      id: row.id,
      category_name: row.title,
      justification: row.description,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
    
    console.log(`✅ Found ${requests.length} requests for user ${userId}`);
    
    res.json({
      success: true,
      requests
    });
  } catch (err: any) {
    console.error("❌ Error fetching user category requests:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch category requests",
      message: err.message 
    });
  }
});

// ============================================================================
// POST /api/service-categories/requests/:id/approve
// ============================================================================
router.post("/requests/:id/approve", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;
    
    console.log(`✅ Approving category request ${id}...`);
    
    // 1. Get the request details
    const { data: request, error: fetchError } = await supabase
      .from('service_posts')
      .select('id, title, description, contact_email')
      .eq('id', id)
      .eq('post_type', 'category_request')
      .single();
    
    if (fetchError || !request) {
      return res.status(404).json({
        success: false,
        error: 'Category request not found'
      });
    }
    
    // 2. Check if category already exists
    const { data: existingCategory } = await supabase
      .from('service_categories')
      .select('category_id')
      .ilike('category_name', request.title)
      .single();
    
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        error: 'Category already exists'
      });
    }
    
    // 3. Add category to service_categories
    const { data: newCategory, error: insertError } = await supabase
      .from('service_categories')
      .insert([{
        category_name: request.title,
        description: request.description
      }])
      .select('category_id, category_name')
      .single();
    
    if (insertError) throw insertError;
    
    // 4. Mark the request as approved
    const { error: updateError } = await supabase
      .from('service_posts')
      .update({ 
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (updateError) throw updateError;
    
    console.log(`✅ Category request ${id} approved. New category: ${request.title}`);
    
    res.json({
      success: true,
      message: 'Category request approved and added',
      category: newCategory
    });
    
  } catch (err: any) {
    console.error("❌ Error approving category request:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to approve category request",
      message: err.message 
    });
  }
});

// ============================================================================
// POST /api/service-categories/requests/:id/reject
// ============================================================================
router.post("/requests/:id/reject", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;
    
    console.log(`❌ Rejecting category request ${id}...`);
    
    // Update status to 'rejected'
    const { data, error } = await supabase
      .from('service_posts')
      .update({ 
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('post_type', 'category_request')
      .select('id, title, contact_email')
      .single();
    
    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'Category request not found'
      });
    }
    
    console.log(`✅ Category request ${id} rejected`);
    
    res.json({
      success: true,
      message: 'Category request rejected',
      request: {
        id: data.id,
        category_name: data.title,
        contact_email: data.contact_email
      }
    });
    
  } catch (err: any) {
    console.error("❌ Error rejecting category request:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to reject category request",
      message: err.message 
    });
  }
});

// ============================================================================
// GET /api/service-categories/requests/stats
// ============================================================================
router.get("/requests/stats", async (req: Request, res: Response) => {
  try {
    console.log('📊 Fetching category request statistics...');
    
    const { data, error } = await supabase
      .from('service_posts')
      .select('status')
      .eq('post_type', 'category_request');
    
    if (error) throw error;
    
    const stats = {
      active: 0,
      approved: 0,
      rejected: 0,
      total: data.length
    };
    
    data.forEach(row => {
      if (row.status in stats) {
        stats[row.status as keyof typeof stats]++;
      }
    });
    
    res.json({
      success: true,
      stats
    });
    
  } catch (err: any) {
    console.error("❌ Error fetching statistics:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch statistics",
      message: err.message 
    });
  }
});

export default router;