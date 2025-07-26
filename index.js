const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { createTables, deleteAllTables } = require('./db/initDb');

const corsOptions = {
  origin: [
    'http://localhost:5173', // dev
    'https://d424-frontend.onrender.com' // prod
  ],
  credentials: true,
};

const app = express();
// middleware
app.use(cors(corsOptions));
app.use(express.json());
// db
const pool = require('./db');

async function startServer() {
  // await deleteAllTables();
  await createTables();

  // routes
  app.use('/api/auth', require('./routes/authRoutes'));
  app.use('/api/profiles', require('./routes/profileRoutes'));
  app.use('/api/reports', require('./routes/reportRoutes'));

  // start server
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
