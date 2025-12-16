import { Router, Request, Response } from "express";
//import { supabase } from "../config/Supabase";
import { supabase } from "./config/Supabase"

const router = Router();

/**
 * GET /business-owners/by-user/:user_id
 * Fetch business owner data using user_id for business owner profile screen
 */
router.get("/by-user/:user_id", async (req: Request, res: Response) => {
  const { user_id } = req.params;
  const userId = parseInt(user_id, 10);

  console.log(`[business-owner-profile] Fetching profile for user_id: ${userId}`);

  if (isNaN(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    // Fetch business owner with joined user data
    const { data, error } = await supabase
      .from('business_owners')
      .select(`
        business_id,
        user_id,
        business_name,
        service_category,
        description,
        phone_number,
        zip_code,
        service_radius_miles,
        street,
        city,
        state,
        users!business_owners_user_id_fkey(
          email,
          user_type,
          password,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`[business-owner-profile] No business owner found for user_id: ${userId}`);
        return res.status(404).json({ message: "Business owner not found for this user_id" });
      }
      throw error;
    }

    // Flatten the structure
// Flatten the structure
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
  email: Array.isArray((data as any).users) ? (data as any).users[0]?.email : (data as any).users?.email,
  user_type: Array.isArray((data as any).users) ? (data as any).users[0]?.user_type : (data as any).users?.user_type,
  password: Array.isArray((data as any).users) ? (data as any).users[0]?.password : (data as any).users?.password,
  created_at: Array.isArray((data as any).users) ? (data as any).users[0]?.created_at : (data as any).users?.created_at,
  updated_at: Array.isArray((data as any).users) ? (data as any).users[0]?.updated_at : (data as any).users?.updated_at,
};

    console.log(`[business-owner-profile] Successfully fetched profile:`, businessOwnerData);
    res.json(businessOwnerData);
  } catch (err: any) {
    console.error("[business-owner-profile] Error:", err);
    res.status(500).json({ message: "Failed to fetch business owner", error: err.message });
  }
});

/**
 * PUT /business-owners/by-user/:user_id
 * Update business owner profile
 */
router.put("/by-user/:user_id", async (req: Request, res: Response) => {
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

  console.log(`[business-owner-update] Updating profile for user_id: ${userId}`);

  if (isNaN(userId)) {
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
        return res.status(404).json({ message: "Business owner not found" });
      }
      throw businessError;
    }

    // Update users table if email or password changed
    if (email || password) {
      const updateData: any = {};
      if (email) updateData.email = email;
      if (password) updateData.password = password; // Consider hashing password
      updateData.updated_at = new Date().toISOString();

      const { error: userError } = await supabase
        .from('users')
        .update(updateData)
        .eq('user_id', userId);

      if (userError) throw userError;
    }

    console.log(`[business-owner-update] Successfully updated profile`);
    
    res.json({
      message: "Business owner profile updated successfully",
      business_owner: {
        ...businessData,
        business_id: parseInt(businessData.business_id, 10),
        user_id: parseInt(businessData.user_id, 10),
      },
    });
  } catch (err: any) {
    console.error("[business-owner-update] Error:", err);
    res.status(500).json({ message: "Failed to update profile", error: err.message });
  }
});

export default router;