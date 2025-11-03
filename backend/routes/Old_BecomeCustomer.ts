import { Router, Request, Response } from "express";
import pool from "../config/pool";

const router = Router(); // ✅ only once

// ---- 1. Get user roles ----
router.get("/users/:userId/roles", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const customerResult = await pool.query(
      `SELECT customer_id, full_name, phone_number, zip_code, service_needed
       FROM customers WHERE user_id = $1`,
      [userId]
    );

    const businessResult = await pool.query(
      `SELECT business_id, business_name, service_category, description,
              phone_number, zip_code, service_radius_miles
       FROM business_owners WHERE user_id = $1`,
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
  } catch (err) {
    console.error("Error fetching user roles:", err);
    res.status(500).json({ error: "Failed to fetch user roles" });
  }
});

// ---- 2. Business owner becomes customer ----
router.post(
  "/users/:userId/become-customer",
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { full_name, phone_number, zip_code, service_needed } = req.body;

      const existingCustomer = await pool.query(
        "SELECT * FROM customers WHERE user_id = $1",
        [userId]
      );

      if (existingCustomer.rows.length > 0) {
        return res
          .status(400)
          .json({ error: "User already has a customer profile" });
      }

      const result = await pool.query(
        `INSERT INTO customers
           (user_id, full_name, phone_number, zip_code, service_needed)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [userId, full_name, phone_number, zip_code, service_needed]
      );

      res.json({
        message: "Customer profile created successfully",
        customer: result.rows[0],
      });
    } catch (err) {
      console.error("Error creating customer profile:", err);
      res.status(500).json({ error: "Failed to create customer profile" });
    }
  }
);

export default router; // ✅ only once at the bottom
