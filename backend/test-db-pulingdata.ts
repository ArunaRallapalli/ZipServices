// src/test-db.ts
import { Client } from "pg";

const client = new Client({
  host: "localhost",
  user: "postgres",
  port: 5432,
  password: "Omganeshaya3!",
  database: "mydb",

});

async function testConnection() {
  try {
    await client.connect();
    console.log("✅ Connected successfully to PostgreSQL!");
    const result = await client.query('SELECT * FROM business.owners');

        console.log('Fetched data:', result.rows);
    
  } catch (err) {
    if (err instanceof Error) {
      console.error("❌ Connection error:", err.message);
    } else {
      console.error("❌ Unknown error:", err);
    }
  } finally {
    await client.end();
    console.log("🔒 Connection closed");
  }
}

testConnection();
