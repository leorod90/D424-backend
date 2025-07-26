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
        name VARCHAR(100) NOT NULL,
        role VARCHAR(50) DEFAULT 'employee',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS skills (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS profile_skills (
        id SERIAL PRIMARY KEY,
        profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
        skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(profile_id, skill_id)
      );
    `);

    console.log("Tables created successfully.");
  } catch (err) {
    console.error("Error creating tables:", err);
  }
}

async function deleteAllTables() {
  try {
    await pool.query('DROP TABLE IF EXISTS profile_skills CASCADE;');
    await pool.query('DROP TABLE IF EXISTS skills CASCADE;');
    await pool.query('DROP TABLE IF EXISTS profiles CASCADE;');
    await pool.query('DROP TABLE IF EXISTS auth CASCADE;');

    console.log("All tables deleted successfully.");
  } catch (err) {
    console.error("Error deleting tables:", err);
  }
}

module.exports = {
  createTables,
  deleteAllTables
};