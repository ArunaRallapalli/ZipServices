// Updated users.ts routes
import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import pool from "../config/pool";

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
    const userResult = await pool.query(
      `SELECT user_id, user_type, email, created_at FROM users WHERE user_id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found" 
      });
    }

    const user = userResult.rows[0];

    // Get customer profile if exists
    const customerResult = await pool.query(
      `SELECT customer_id, full_name, phone_number, zip_code, service_needed 
       FROM customers 
       WHERE user_id = $1`,
      [userId]
    );

    // Get business profile if exists
    const businessResult = await pool.query(
      `SELECT business_id, business_name, service_category, description, 
              phone_number, zip_code, service_radius_miles 
       FROM business_owners 
       WHERE user_id = $1`,
      [userId]
    );

    res.json({
      success: true,
      profile: {
        user: user,
        customerProfile: customerResult.rows[0] || null,
        businessProfile: businessResult.rows[0] || null
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
    const customerResult = await pool.query(
      `SELECT customer_id, full_name, phone_number, zip_code, service_needed 
       FROM customers 
       WHERE user_id = $1`,
      [userId]
    );

    // Check if user exists in business_owners table
    const businessResult = await pool.query(
      `SELECT business_id, business_name, service_category, description, 
              phone_number, zip_code, service_radius_miles 
       FROM business_owners 
       WHERE user_id = $1`,
      [userId]
    );

    const roles = {
      customer: customerResult.rows[0] ?? null,
      business_owner: businessResult.rows[0] ?? null,
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
    const result = await pool.query(
      `SELECT user_id, user_type, email, created_at FROM users ORDER BY user_id DESC`
    );
    
    res.json({
      success: true,
      users: result.rows,
      count: result.rows.length
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
    const result = await pool.query(`
      SELECT 
        user_type,
        COUNT(*) as count
      FROM users 
      GROUP BY user_type
    `);
    
    const stats = {
      total: 0,
      customers: 0,
      business_owners: 0
    };
    
    result.rows.forEach((row: UserStatsRow) => {
      stats.total += parseInt(row.count);
      if (row.user_type === 'customer') {
        stats.customers = parseInt(row.count);
      } else if (row.user_type === 'business_owner') {
        stats.business_owners = parseInt(row.count);
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

    const result = await pool.query(
      `SELECT user_id, user_type, email, created_at FROM users WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found" 
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
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
      const existingUser = await pool.query(
        "SELECT user_id FROM users WHERE email = $1",
        [email]
      );
      if (existingUser.rowCount && existingUser.rowCount > 0) {
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
    const result = await pool.query(
      `INSERT INTO users (user_type, email, password, created_at) 
       VALUES ($1, $2, $3, NOW()) 
       RETURNING user_id, user_type, email, created_at`,
      [user_type, email || null, hashedPassword]
    );

    const newUser = result.rows[0];
    
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

    const result = await pool.query(
      `UPDATE users SET user_type = $1, email = $2 WHERE user_id = $3 
       RETURNING user_id, user_type, email, created_at`,
      [user_type, email || null, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found" 
      });
    }

    res.json({
      success: true,
      message: "User updated successfully",
      user: result.rows[0]
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

    const result = await pool.query(
      `DELETE FROM users WHERE user_id = $1 RETURNING user_id, user_type, email`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found" 
      });
    }

    res.json({
      success: true,
      message: "User deleted successfully",
      deletedUser: result.rows[0]
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