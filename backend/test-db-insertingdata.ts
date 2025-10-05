import { Pool } from 'pg';

// Database connection configuration
const pool = new Pool({
     host: "localhost",
  user: "postgres",
  port: 5432,
  password: "Omganeshaya3!",
  database: "mydb",
    
});

interface UserData {
    fullName: string;
    email: string;
    passwordHash: string; // Store hashed password, not plain text
}

async function insertUser(userData: UserData): Promise<void> {
    const { fullName, email, passwordHash } = userData;
    try {
        const client = await pool.connect();
        const query = `
            INSERT INTO users (full_name, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const values = [fullName, email, passwordHash];
        const result = await client.query(query, values);
        console.log('User inserted successfully:', result.rows[0]);
        client.release(); // Release the client back to the pool
    } catch (error) {
        console.error('Error inserting user:', error);
    } finally {
        await pool.end(); // Close the pool when done (for a single script)
    }
}

// Example usage:
const newUser: UserData = {
    fullName: 'Shiridi Sai',
    email: 'john.sai@example.com',
    passwordHash: 'hashed_password_example', // Replace with an actual hashed password
};

insertUser(newUser);

