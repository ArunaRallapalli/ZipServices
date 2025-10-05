import { Router, Request, Response } from "express";
import pool from "../config/pool";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { full_name, zip_code, phone_number, service_needed } = req.body;

    // Validate required fields
    if (!full_name || !zip_code || !service_needed) {
      return res.status(400).json({ message: "full_name, zip_code, and service_needed are required" });
    }

    // Insert into customers table
    const query = `
      INSERT INTO customers (full_name, zip_code, phone_number, service_needed)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [full_name, zip_code, phone_number || null, service_needed];

    const result = await pool.query(query, values);

    return res.status(201).json({ customer: result.rows[0] });
  } catch (error: any) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
