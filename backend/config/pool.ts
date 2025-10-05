import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  host: "localhost",
  user: "postgres",
  password: "Omganeshaya3!",
  database: "mydb",
  port: 5432,
});

export default pool;
