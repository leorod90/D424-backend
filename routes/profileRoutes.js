const express = require('express');
const router = express.Router();
const pool = require('../db');
const { ProfileFactory } = require('../models/Profile'); // Use the factory
const verifyToken = require('../middleware/verifyToken');

// create profiles: POST /api/profiles
router.post('/', verifyToken, async (req, res) => {
  const { name, role, skills, teamSize } = req.body;
  
  // Now you can access req.userId from the token
  console.log('User creating profile:', req.userId);

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const finalRole = role || 'employee';
  const finalSkills = Array.isArray(skills) ? skills : [];

  try {
    const profile = ProfileFactory.createProfile(finalRole, name, finalSkills, teamSize);
    
    const result = await pool.query(
      'INSERT INTO profiles (name, role, skills) VALUES ($1, $2, $3) RETURNING *',
      [name, finalRole, finalSkills]
    );
    
    const savedProfile = result.rows[0];
    
    res.status(201).json({
      ...savedProfile,
      summary: profile.summary(),
      role_type: profile.getRole()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get all profiles: GET /api/profiles
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM profiles`);
    
    // polymorphism (same method calls, different behavior)
    const enhancedProfiles = result.rows.map(profileData => {
      const profile = ProfileFactory.createProfile(
        profileData.role, 
        profileData.name, 
        profileData.skills
      );
      
      return {
        ...profileData,
        summary: profile.summary(), // Polymorphism
        role_type: profile.getRole() // Polymorphism
      };
    });
    
    res.json(enhancedProfiles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// add skill to profile: PUT /api/profiles/skills/:profile_id
router.put('/skills/:profile_id', async (req, res) => {
  const { profile_id } = req.params;
  const { skills } = req.body;

  try {
    const updatedSkills = Array.isArray(skills) ? skills : [];

    const result = await pool.query(
      'UPDATE profiles SET skills = $1 WHERE id = $2 RETURNING *',
      [updatedSkills, profile_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // OOP for response
    const profileData = result.rows[0];
    const profile = ProfileFactory.createProfile(
      profileData.role, 
      profileData.name, 
      profileData.skills
    );

    res.status(200).json({
      ...profileData,
      summary: profile.summary()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// search by skill: GET /api/profiles/search?skill=CSS
router.get('/search', async (req, res) => {
  const { skill } = req.query;
  console.log("ASDSA", skill)
  try {
    const result = await pool.query(
      'SELECT * FROM profiles WHERE $1 = ANY(skills)',
      [skill]
    );
    
    // Apply OOP enhancements to search results
    const enhancedResults = result.rows.map(profileData => {
      const profile = ProfileFactory.createProfile(
        profileData.role, 
        profileData.name, 
        profileData.skills
      );
      
      return {
        ...profileData,
        summary: profile.summary(),
        has_skill: profile.hasSkill(skill) // Use encapsulated method
      };
    });
    
    res.json(enhancedResults);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get profile: GET /api/profiles/1
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT *
      FROM profiles
      WHERE id = $1
    `, [id]);

    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Profile not found' });

    // factory Pattern and polymorphism
    const profile = ProfileFactory.createProfile(user.role, user.name, user.skills);
    
    res.json({
      ...user,
      summary: profile.summary(), // polymorphism - different behavior per class
      role_type: profile.getRole() // polymorphism
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// update profile: PUT /api/profiles/:id
router.put('/:id', async (req, res) => {
  const { name, role, skills } = req.body;
  const { id } = req.params;

  const updates = [];
  const values = [];
  let paramCount = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramCount++}`);
    values.push(name);
  }

  if (role !== undefined) {
    updates.push(`role = $${paramCount++}`);
    values.push(role);
  }

  if (skills !== undefined) {
    if (!Array.isArray(skills)) {
      return res.status(400).json({ error: 'Skills must be an array' });
    }
    updates.push(`skills = $${paramCount++}`);
    values.push(skills);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  values.push(id);

  try {
    const result = await pool.query(
      `UPDATE profiles SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // OOP for response
    const profileData = result.rows[0];
    const profile = ProfileFactory.createProfile(
      profileData.role, 
      profileData.name, 
      profileData.skills
    );

    res.json({
      ...profileData,
      summary: profile.summary()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// delete profile: DELETE /api/profiles/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM profiles WHERE id = $1 RETURNING *', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ message: 'Profile deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;