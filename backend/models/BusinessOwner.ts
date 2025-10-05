// backend/models/BusinessOwner.ts
// ⚠️ Updated: Removed `email` references because email is now stored in the `users` table. 
// This change affects the interface, creation function, and removed find-by-email function.

import { Pool } from "pg";

export interface IBusinessOwner {
  id?: number;
  name: string;
  password: string; // password stored in users table
  phone?: string;
  businessName?: string;
  createdAt?: Date;
}

// Create a new business owner
export async function createBusinessOwner(pool: Pool, owner: IBusinessOwner) {
  const result = await pool.query(
    `INSERT INTO business_owners (name, password, phone, business_name, created_at)
     VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
    [owner.name, owner.password, owner.phone, owner.businessName]
  );
  return result.rows[0];
}

// Find a business owner by ID
export async function findBusinessOwnerById(pool: Pool, id: number) {
  const result = await pool.query(
    `SELECT * FROM business_owners WHERE id = $1`,
    [id]
  );
  return result.rows[0];
}
