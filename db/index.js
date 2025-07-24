const { Pool } = require('pg');
require('dotenv').config();

// connect postgre db
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;
