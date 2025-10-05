import { Router, Request, Response } from "express";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  const pool = (req as any).pool;

  const { service_category, zip_code, city, state } = req.query;

  try {
    let query = "SELECT * FROM business_owners WHERE 1=1";
    const values: any[] = [];
    let counter = 1;

    if (service_category) {
      query += ` AND service_category = $${counter++}`;
      values.push(service_category);
    }
    if (zip_code) {
      query += ` AND zip_code = $${counter++}`;
      values.push(zip_code);
    }
    if (city) {
      query += ` AND city = $${counter++}`;
      values.push(city);
    }
    if (state) {
      query += ` AND state = $${counter++}`;
      values.push(state);
    }

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
