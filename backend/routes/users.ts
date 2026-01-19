/**
 * ============================================================================
 * USER ROUTES
 * ============================================================================
 * 
 * This module handles all user-related API endpoints including:
 * - User profile retrieval (customer & business owner profiles)
 * - User role management
 * - User CRUD operations (Create, Read, Update, Delete)
 * - User statistics
 * 
 * SECURITY:
 * - ✅ PROTECTED routes require JWT authentication
 * - ✅ User-specific routes enforce authorization (users can only access their own data)
 * - ⚠️  PUBLIC routes allow unauthenticated access (registration, stats)
 * 
 * BASE PATH: /api/users or /users (depending on server configuration)
 * ============================================================================
 */

import { Router, Request, Response,NextFunction} from "express";
import bcrypt from "bcryptjs";
import { supabase } from "../config/Supabase";
import { authenticateToken, authorizeUser, AuthRequest } from "../middleware/auth";

const router = Router();

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface UserStatsRow {
  user_type: string;
  count: string;
}

// ============================================================================
// PROTECTED ENDPOINTS - Require Authentication & Authorization
// ============================================================================

/**
 * GET /users/:userId/profile
 * 
 * Purpose: Fetch complete user profile including customer and business owner data
 * 
 * Security:
 * - ✅ Requires valid JWT token (authenticateToken)
 * - ✅ User can only access their own profile (authorizeUser)
 * 
 * Returns:
 * - User basic info (user_id, email, user_type)
 * - Customer profile (if exists)
 * - Business owner profile (if exists)
 * 
 * Example: GET /users/175/profile
 * Headers: Authorization: Bearer <token>
 */
router.get("/:userId/profile", authenticateToken, authorizeUser, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    // Fetch basic user information from users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('user_id, user_type, email, created_at')
      .eq('user_id', userId)
      .single();

    // Handle user not found
    if (userError) {
      if (userError.code === 'PGRST116') {  // Supabase code for "not found"
        return res.status(404).json({
          success: false,
          error: "User not found"
        });
      }
      throw userError;
    }

    // Fetch customer profile if user has one
    const { data: customerData } = await supabase
      .from('customers')
      .select('customer_id, full_name, phone_number, zip_code, service_needed')
      .eq('user_id', userId)
      .single();

    // Fetch business owner profile if user has one
    const { data: businessData } = await supabase
      .from('business_owners')
      .select('business_id, business_name, service_category, description, phone_number, zip_code, service_radius_miles')
      .eq('user_id', userId)
      .single();

    // Return combined profile data
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

/**
 * GET /users/:userId/roles
 * 
 * Purpose: Get user's available roles (customer, business_owner, or both)
 * 
 * Security:
 * - ✅ Requires authentication
 * - ✅ User can only access their own roles
 * 
 * Returns:
 * - customer: Customer profile or null
 * - business_owner: Business owner profile or null
 * - availableRoles: Array of role strings ["customer", "business_owner"]
 */
router.get("/:userId/roles", authenticateToken, authorizeUser, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    // Check if user has a customer profile
    const { data: customerData } = await supabase
      .from('customers')
      .select('customer_id, full_name, phone_number, zip_code, service_needed')
      .eq('user_id', userId)
      .single();

    // Check if user has a business owner profile
    const { data: businessData } = await supabase
      .from('business_owners')
      .select('business_id, business_name, service_category, description, phone_number, zip_code, service_radius_miles')
      .eq('user_id', userId)
      .single();

    // Build roles object
    const roles = {
      customer: customerData ?? null,
      business_owner: businessData ?? null,
      availableRoles: [] as string[],
    };

    // Populate availableRoles array
    if (roles.customer) roles.availableRoles.push("customer");
    if (roles.business_owner) roles.availableRoles.push("business_owner");

    res.json(roles);
  } catch (error) {
    console.error("Error fetching user roles:", error);
    res.status(500).json({ error: "Failed to fetch user roles" });
  }
});

/**
 * GET /users
 * 
 * Purpose: Fetch all users (admin functionality)
 * 
 * Security:
 * - ✅ Requires authentication
 * - ⚠️  TODO: Should add admin-only authorization check
 * 
 * Returns: Array of all users with basic info
 */
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Fetch all users, ordered by most recent first
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

/**
 * GET /users/:id
 * 
 * Purpose: Fetch specific user by ID
 * 
 * Security:
 * - ✅ Requires authentication
 * - ✅ User can only access their own data
 * 
 * Note: This route must come AFTER specific routes like /profile and /roles
 * to avoid route conflicts (Express matches routes in order)
 */
router.get("/:id", authenticateToken, authorizeUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;

    // Validate user ID format (must be numeric)
    if (!/^\d+$/.test(userId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID"
      });
    }

    // Fetch user from database
    const { data, error } = await supabase
      .from('users')
      .select('user_id, user_type, email, created_at')
      .eq('user_id', userId)
      .single();

    // Handle not found
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

/**
 * PUT /users/:id
 * 
 * Purpose: Update user information
 * 
 * Security:
 * - ✅ Requires authentication
 * - ✅ User can only update their own data
 * 
 * Body:
 * - user_type: "customer" | "business_owner"
 * - email: string (optional)
 */
router.put("/:id", authenticateToken, authorizeUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const { user_type, email } = req.body;

    // Validate user ID
    if (!/^\d+$/.test(userId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID"
      });
    }

    // Validate user_type
    if (!user_type || !["customer", "business_owner"].includes(user_type)) {
      return res.status(400).json({
        success: false,
        error: "user_type must be 'customer' or 'business_owner'"
      });
    }

    // Update user in database
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

/**
 * DELETE /users/:id
 * 
 * Purpose: Delete a user account
 * 
 * Security:
 * - ✅ Requires authentication
 * - ✅ User can only delete their own account
 * 
 * Note: This will cascade delete related records if foreign keys are set up
 */
router.delete("/:id", authenticateToken, authorizeUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;

    // Validate user ID
    if (!/^\d+$/.test(userId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID"
      });
    }

    // Delete user from database
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

// ============================================================================
// PUBLIC ENDPOINTS - No Authentication Required
// ============================================================================

/**
 * GET /users/stats/summary
 * 
 * Purpose: Get user statistics (total users, customers, business owners)
 * 
 * Security:
 * - ⚠️  PUBLIC - No authentication required
 * - Returns aggregate data only, no personal information
 * 
 * Returns:
 * - total: Total number of users
 * - customers: Number of customer accounts
 * - business_owners: Number of business owner accounts
 */
router.get("/stats/summary", async (req: Request, res: Response) => {
  try {
    // Fetch all users (just the user_type field)
    const { data, error } = await supabase
      .from('users')
      .select('user_type');

    if (error) throw error;

    // Calculate statistics
    const stats = {
      total: data?.length || 0,
      customers: 0,
      business_owners: 0
    };

    // Count each user type
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

/**
 * POST /users
 * 
 * Purpose: Create a new user (registration endpoint)
 * 
 * Security:
 * - ⚠️  PUBLIC - Anyone can register
 * - Passwords are hashed with bcrypt before storage
 * - Email uniqueness is enforced
 * 
 * Body:
 * - user_type: "customer" | "business_owner" (required)
 * - email: string (optional for guest customers)
 * - password: string (optional for guest customers)
 * 
 * Special Case: Guest customers can register without email/password
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { user_type, email, password } = req.body;

    // Validate required fields
    if (!user_type) {
      return res.status(400).json({
        success: false,
        error: "user_type is required"
      });
    }

    // Validate user_type value
    if (!["customer", "business_owner"].includes(user_type)) {
      return res.status(400).json({
        success: false,
        error: "user_type must be 'customer' or 'business_owner'"
      });
    }

    // Allow guest customers (no email/password required)
    if (user_type === "customer" && !email && !password) {
      console.log("Creating guest customer with no email/password");
    }

    // Check for existing email (if provided)
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

    // Hash password if provided (bcrypt with 10 rounds)
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Insert new user into database
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

    // Return success with new user info (no password!)
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

export default router;
