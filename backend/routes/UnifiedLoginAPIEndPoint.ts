import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import pool from "../config/pool";
import jwt from "jsonwebtoken";

const router = Router();

/**
 * POST /auth/login
 * Body: { email: string, password: string }
 */
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required." });
  }

  try {
    const result = await pool.query(
      "SELECT user_id, email, password, user_type, created_at FROM users WHERE LOWER(email) = LOWER($1)",
      [email.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const user = result.rows[0];
    
    // Debug logging (remove in production)
    console.log(`Login attempt for: ${email}`);
    console.log(`User found: ${user.user_id}`);
    console.log(`Password exists: ${!!user.password}`);
    console.log(`Password length: ${user.password ? user.password.length : 'NULL'}`);
    console.log(`Password starts with $2a (bcrypt): ${user.password ? user.password.startsWith('$2a$') || user.password.startsWith('$2b$') : 'NO'}`);
    console.log(`Input password: "${password}"`);
    console.log(`Stored password hash: "${user.password}"`);
    
    // Check if password is NULL or empty
    if (!user.password || user.password.trim() === '') {
      return res.status(422).json({ 
        message: "Account exists but no password is set. Please set up your password first.",
        accountExists: true,
        needsPasswordSetup: true,
        userId: user.user_id
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log(`Password comparison result: ${passwordMatch}`);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.user_id, userType: user.user_type },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: { id: user.user_id, email: user.email, type: user.user_type },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /auth/setup-password
 * Body: { email: string, password: string, confirmPassword: string, userId?: number }
 */
router.post("/setup-password", async (req: Request, res: Response) => {
  const { email, password, confirmPassword, userId } = req.body;

  if (!email || !password || !confirmPassword) {
    return res.status(400).json({ 
      message: "Email, password, and confirm password are required." 
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match." });
  }

  if (password.length < 6) {
    return res.status(400).json({ 
      message: "Password must be at least 6 characters long." 
    });
  }

  try {
    // Check if user exists and has no password
    const userResult = await pool.query(
      "SELECT user_id, password FROM users WHERE LOWER(email) = LOWER($1)",
      [email.trim()]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = userResult.rows[0];
    
    // Check if user already has a password
    if (user.password && user.password.trim() !== '') {
      return res.status(400).json({ 
        message: "User already has a password. Use password reset instead." 
      });
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update user with new password
    await pool.query(
      "UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2",
      [hashedPassword, user.user_id]
    );

    res.json({ 
      message: "Password set successfully. You can now log in." 
    });

  } catch (err) {
    console.error("Setup password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;