// setup.js
const pool = require('./index');

async function createTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auth (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(100) NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES auth(id),
        name VARCHAR(100) NOT NULL,
        role VARCHAR(50) DEFAULT 'employee',
        skills TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Tables created successfully.");
  } catch (err) {
    console.error("Error creating tables:", err);
  }
}

module.exports = createTables;
