const pool = require('./index.js');

async function createTables() {
  try {
    await pool.query(`
      CREATE TABLE profiles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(50) DEFAULT 'employee',
        skills TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      );
    `);

    await pool.query(`
      CREATE TABLE auth (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(100) NOT NULL
      );
    `);


    console.log('Tables created or already exist.');
  } catch (err) {
    console.error('Error creating tables:', err);
  }
}

module.exports = createTables;
