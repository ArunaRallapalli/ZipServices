// Updated users.ts routes
import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { supabase } from "../config/Supabase";

const router = Router();

// Interface for database row types
interface UserStatsRow {
  user_type: string;
  count: string;
}

// ✅ GET /users/:userId/profile - Get complete user profile
router.get("/:userId/profile", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Get user basic info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('user_id, user_type, email, created_at')
      .eq('user_id', userId)
      .single();

    if (userError) {
      if (userError.code === 'PGRST116') {
        return res.status(404).json({ 
          success: false, 
          error: "User not found" 
        });
      }
      throw userError;
    }

    // Get customer profile if exists
    const { data: customerData } = await supabase
      .from('customers')
      .select('customer_id, full_name, phone_number, zip_code, service_needed')
      .eq('user_id', userId)
      .single();

    // Get business profile if exists
    const { data: businessData } = await supabase
      .from('business_owners')
      .select('business_id, business_name, service_category, description, phone_number, zip_code, service_radius_miles')
      .eq('user_id', userId)
      .single();

    res.json({
      success: true,
      profile: {
        user: user,
        customerProfile: customerData || null,
        businessProfile: businessData || null
      }
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch user profile" 
    });
  }
});

// ✅ GET /users/:userId/roles - Get user roles
router.get("/:userId/roles", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists in customers table
    const { data: customerData } = await supabase
      .from('customers')
      .select('customer_id, full_name, phone_number, zip_code, service_needed')
      .eq('user_id', userId)
      .single();

    // Check if user exists in business_owners table
    const { data: businessData } = await supabase
      .from('business_owners')
      .select('business_id, business_name, service_category, description, phone_number, zip_code, service_radius_miles')
      .eq('user_id', userId)
      .single();

    const roles = {
      customer: customerData ?? null,
      business_owner: businessData ?? null,
      availableRoles: [] as string[],
    };

    if (roles.customer) roles.availableRoles.push("customer");
    if (roles.business_owner) roles.availableRoles.push("business_owner");

    res.json(roles);
  } catch (error) {
    console.error("Error fetching user roles:", error);
    res.status(500).json({ error: "Failed to fetch user roles" });
  }
});

// GET /users → fetch all users
router.get("/", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('user_id, user_type, email, created_at')
      .order('user_id', { ascending: false });
    
    if (error) throw error;

    res.json({
      success: true,
      users: data,
      count: data?.length || 0
    });
  } catch (err: any) {
    console.error("Error fetching users:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch users",
      message: err.message 
    });
  }
});

// GET /users/stats/summary → get user statistics
router.get("/stats/summary", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('user_type');
    
    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      customers: 0,
      business_owners: 0
    };
    
    (data || []).forEach((row) => {
      if (row.user_type === 'customer') {
        stats.customers++;
      } else if (row.user_type === 'business_owner') {
        stats.business_owners++;
      }
    });

    res.json({
      success: true,
      stats
    });
  } catch (err: any) {
    console.error("Error fetching user stats:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch user statistics",
      message: err.message 
    });
  }
});

// GET /users/:id → fetch specific user by ID
// NOTE: This must come AFTER specific routes like /profile and /roles
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    if (!/^\d+$/.test(userId)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid user ID" 
      });
    }

    const { data, error } = await supabase
      .from('users')
      .select('user_id, user_type, email, created_at')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ 
          success: false, 
          error: "User not found" 
        });
      }
      throw error;
    }

    res.json({
      success: true,
      user: data
    });
  } catch (err: any) {
    console.error("Error fetching user:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch user",
      message: err.message 
    });
  }
});

// POST /users → create new user with email and password support
router.post("/", async (req: Request, res: Response) => {
  try {
    const { user_type, email, password } = req.body;

    // Validate input
    if (!user_type) {
      return res.status(400).json({ 
        success: false, 
        error: "user_type is required" 
      });
    }

    if (!["customer", "business_owner"].includes(user_type)) {
      return res.status(400).json({ 
        success: false, 
        error: "user_type must be 'customer' or 'business_owner'" 
      });
    }

    // Allow guest customers
    if (user_type === "customer" && !email && !password) {
      console.log("Creating guest customer with no email/password");
    }
    
    // Check if email already exists (if provided)
    if (email) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('user_id')
        .eq('email', email)
        .single();

      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          error: "Email already registered" 
        });
      }
    }

    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Insert user with email and password (if provided)
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{
        user_type,
        email: email || null,
        password: hashedPassword,
        created_at: new Date().toISOString()
      }])
      .select('user_id, user_type, email, created_at')
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user_id: newUser.user_id,
      user_type: newUser.user_type,
      email: newUser.email,
      created_at: newUser.created_at
    });
  } catch (err: any) {
    console.error("Error creating user:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to create user",
      message: err.message 
    });
  }
});

// PUT /users/:id → update user
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const { user_type, email } = req.body;

    if (!/^\d+$/.test(userId)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid user ID" 
      });
    }

    if (!user_type || !["customer", "business_owner"].includes(user_type)) {
      return res.status(400).json({ 
        success: false, 
        error: "user_type must be 'customer' or 'business_owner'" 
      });
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        user_type,
        email: email || null
      })
      .eq('user_id', userId)
      .select('user_id, user_type, email, created_at')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ 
          success: false, 
          error: "User not found" 
        });
      }
      throw error;
    }

    res.json({
      success: true,
      message: "User updated successfully",
      user: data
    });
  } catch (err: any) {
    console.error("Error updating user:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to update user",
      message: err.message 
    });
  }
});

// DELETE /users/:id → delete user
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    if (!/^\d+$/.test(userId)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid user ID" 
      });
    }

    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('user_id', userId)
      .select('user_id, user_type, email')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ 
          success: false, 
          error: "User not found" 
        });
      }
      throw error;
    }

    res.json({
      success: true,
      message: "User deleted successfully",
      deletedUser: data
    });
  } catch (err: any) {
    console.error("Error deleting user:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to delete user",
      message: err.message 
    });
  }
});

export default router;