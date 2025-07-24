const express = require('express');
const router = express.Router();

// get user reports: GET /api/reports/users
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        profiles.id,
        profiles.name,
        profiles.role,
        profiles.skills,
        profiles.created_at
      FROM profiles
    `);

    res.json({
      title: "User Report",
      generatedAt: new Date(),
      data: result.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;