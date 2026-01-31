/**
 * ============================================================================
 * BUSINESS OWNER PROFILE ROUTES - WITH DEBUG LOGGING
 * ============================================================================
 *  * GET /business-owners/by-user/:user_id (for fetching data)
 * PUT /business-owners/by-user/:user_id (for update)
 * Last Updated: January 9, 2026
 * Changes: Added debug logging for troubleshooting
 * 
 * Copy this file to replace your existing business-owners.routes.ts
 * Or manually add the debug logging as indicated below
 * ============================================================================
 */

import { Router, Request, Response } from "express";
import { supabase } from "./config/Supabase";
import bcrypt from "bcryptjs";
import { authenticateToken, authorizeUser, AuthRequest } from "./middleware/auth";

const router = Router();
import pool from './config/pool';

/**
 * GET /business-owners/by-user/:user_id
 /**
 * GET /business-owners/by-user/:user_id
 */
router.get("/by-user/:user_id", authenticateToken, authorizeUser, async (req: AuthRequest, res: Response) => {
  const { user_id } = req.params;
  const userId = parseInt(user_id, 10);

  console.log(`[business-owner-profile] ===== GET PROFILE REQUEST =====`);
  console.log(`[business-owner-profile] Requested user_id: ${user_id} (parsed: ${userId})`);
  console.log(`[business-owner-profile] Authenticated user: ${req.user?.user_id}`);

  if (isNaN(userId)) {
    console.log(`[business-owner-profile] ❌ Invalid user ID`);
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    // ✅ Use pool instead of supabase
    const query = `
      SELECT 
        bo.business_id,
        bo.user_id,
        bo.business_name,
        bo.service_category,
        bo.description,
        bo.phone_number,
        bo.zip_code,
        bo.service_radius_miles,
        bo.street,
        bo.city,
        bo.state,
        u.email,
        u.user_type,
        u.created_at,
        u.updated_at
      FROM business_owners bo
      JOIN users u ON bo.user_id = u.user_id
      WHERE bo.user_id = $1
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      console.log(`[business-owner-profile] ❌ No business owner found for user_id: ${userId}`);
      return res.status(404).json({ message: "Business owner not found for this user_id" });
    }

    const data = result.rows[0];

    const businessOwnerData = {
      business_id: parseInt(data.business_id, 10),
      user_id: parseInt(data.user_id, 10),
      business_name: data.business_name,
      service_category: data.service_category,
      description: data.description,
      phone_number: data.phone_number,
      zip_code: data.zip_code,
      service_radius_miles: data.service_radius_miles,
      street: data.street,
      city: data.city,
      state: data.state,
      email: data.email,
      user_type: data.user_type,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    console.log(`[business-owner-profile] ✅ Successfully fetched profile for user ${userId}`);
    res.json(businessOwnerData);
  } catch (err: any) {
    console.error("[business-owner-profile] ❌ Error:", err);
    res.status(500).json({ message: "Failed to fetch business owner", error: err.message });
  }
});
/**
 * PUT /business-owners/by-user/:user_id
 */
router.put("/by-user/:user_id", authenticateToken, authorizeUser, async (req: AuthRequest, res: Response) => {
  const { user_id } = req.params;
  const userId = parseInt(user_id, 10);

  const {
    business_name,
    service_category,
    description,
    phone_number,
    zip_code,
    service_radius_miles,
    street,
    city,
    state,
    email,
    password
  } = req.body;

  // ✅ ADDED: Debug logging
  console.log(`[business-owner-update] ===== PUT PROFILE REQUEST =====`);
  console.log(`[business-owner-update] Requested user_id: ${user_id} (parsed: ${userId})`);
  console.log(`[business-owner-update] Authenticated user: ${req.user?.user_id}`);

  if (isNaN(userId)) {
    console.log(`[business-owner-update] ❌ Invalid user ID`);
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    // Update business_owners table
    const { data: businessData, error: businessError } = await supabase
      .from('business_owners')
      .update({
        business_name,
        service_category,
        description,
        phone_number,
        zip_code,
        service_radius_miles: service_radius_miles || 12,
        street,
        city,
        state,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (businessError) {
      if (businessError.code === 'PGRST116') {
        console.log(`[business-owner-update] ❌ Business owner not found for user_id: ${userId}`);
        return res.status(404).json({ message: "Business owner not found" });
      }
      throw businessError;
    }

    // Update users table if email or password changed
    if (email || password) {
      const updateData: any = {};
      if (email) updateData.email = email;
      
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
        console.log(`[business-owner-update] Password hashed for user ${userId}`);
      }
      
      updateData.updated_at = new Date().toISOString();

      const { error: userError } = await supabase
        .from('users')
        .update(updateData)
        .eq('user_id', userId);

      if (userError) throw userError;
    }

    console.log(`[business-owner-update] ✅ Successfully updated profile for user ${userId}`);

    res.json({
      message: "Business owner profile updated successfully",
      business_owner: {
        ...businessData,
        business_id: parseInt(businessData.business_id, 10),
        user_id: parseInt(businessData.user_id, 10),
      },
    });
  } catch (err: any) {
    console.error("[business-owner-update] ❌ Error:", err);
    res.status(500).json({ message: "Failed to update profile", error: err.message });
  }
});

export default router;