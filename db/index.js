const express = require('express');
const router = express.Router();
const pool = require('../db');
const { ProfileFactory } = require('../models/Profile'); // Use the factory
const verifyToken = require('../middleware/verifyToken');

// Helper function to get or create skills
async function getOrCreateSkills(skillNames) {
  if (!Array.isArray(skillNames) || skillNames.length === 0) {
    return [];
  }

  const skillIds = [];
  
  for (const skillName of skillNames) {
    if (!skillName || skillName.trim() === '') continue;
    
    const trimmedSkill = skillName.trim();
    
    // Try to find existing skill
    let result = await pool.query(
      'SELECT id FROM skills WHERE LOWER(name) = LOWER($1)',
      [trimmedSkill]
    );
    
    if (result.rows.length > 0) {
      skillIds.push(result.rows[0].id);
    } else {
      // Create new skill
      result = await pool.query(
        'INSERT INTO skills (name) VALUES ($1) RETURNING id',
        [trimmedSkill]
      );
      skillIds.push(result.rows[0].id);
    }
  }
  
  return skillIds;
}

// Helper function to get profile with skills
async function getProfileWithSkills(profileId) {
  const profileResult = await pool.query(
    'SELECT * FROM profiles WHERE id = $1',
    [profileId]
  );
  
  if (profileResult.rows.length === 0) {
    return null;
  }
  
  const skillsResult = await pool.query(`
    SELECT s.name 
    FROM skills s 
    INNER JOIN profile_skills ps ON s.id = ps.skill_id 
    WHERE ps.profile_id = $1
  `, [profileId]);
  
  const profile = profileResult.rows[0];
  profile.skills = skillsResult.rows.map(row => row.name);
  
  return profile;
}

// create profiles: POST /api/profiles
router.post('/', verifyToken, async (req, res) => {
  const { name, role, skills, teamSize } = req.body;
  
  console.log('User creating profile:', req.userId);

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const finalRole = role || 'employee';
  const finalSkills = Array.isArray(skills) ? skills : [];

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create profile
    const profileResult = await client.query(
      'INSERT INTO profiles (name, role) VALUES ($1, $2) RETURNING *',
      [name, finalRole]
    );
    
    const savedProfile = profileResult.rows[0];
    
    // Handle skills if provided
    if (finalSkills.length > 0) {
      const skillIds = await getOrCreateSkills(finalSkills);
      
      // Link skills to profile
      for (const skillId of skillIds) {
        await client.query(
          'INSERT INTO profile_skills (profile_id, skill_id) VALUES ($1, $2)',
          [savedProfile.id, skillId]
        );
      }
    }
    
    await client.query('COMMIT');
    
    // Get the complete profile with skills for response
    const completeProfile = await getProfileWithSkills(savedProfile.id);
    const profile = ProfileFactory.createProfile(completeProfile.role, completeProfile.name, completeProfile.skills, teamSize);
    
    res.status(201).json({
      ...completeProfile,
      summary: profile.summary(),
      role_type: profile.getRole()
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// get all profiles: GET /api/profiles
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.*,
        COALESCE(
          json_agg(
            CASE WHEN s.name IS NOT NULL THEN s.name ELSE NULL END
          ) FILTER (WHERE s.name IS NOT NULL), 
          '[]'
        ) as skills
      FROM profiles p
      LEFT JOIN profile_skills ps ON p.id = ps.profile_id
      LEFT JOIN skills s ON ps.skill_id = s.id
      GROUP BY p.id, p.name, p.role, p.created_at
      ORDER BY p.created_at DESC
    `);
    
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

// add/update skills for profile: PUT /api/profiles/skills/:profile_id
router.put('/skills/:profile_id', async (req, res) => {
  const { profile_id } = req.params;
  const { skills } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    
    // Check if profile exists
    const profileCheck = await client.query('SELECT id FROM profiles WHERE id = $1', [profile_id]);
    if (profileCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Remove all existing skills for this profile
    await client.query('DELETE FROM profile_skills WHERE profile_id = $1', [profile_id]);

    // Add new skills if provided
    const updatedSkills = Array.isArray(skills) ? skills : [];
    if (updatedSkills.length > 0) {
      const skillIds = await getOrCreateSkills(updatedSkills);
      
      // Link new skills to profile
      for (const skillId of skillIds) {
        await client.query(
          'INSERT INTO profile_skills (profile_id, skill_id) VALUES ($1, $2)',
          [profile_id, skillId]
        );
      }
    }

    await client.query('COMMIT');

    // Get updated profile with skills for response
    const completeProfile = await getProfileWithSkills(profile_id);
    const profile = ProfileFactory.createProfile(
      completeProfile.role, 
      completeProfile.name, 
      completeProfile.skills
    );

    res.status(200).json({
      ...completeProfile,
      summary: profile.summary()
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// search by skill: GET /api/profiles/search?skill=CSS
router.get('/search', async (req, res) => {
  const { skill } = req.query;
  console.log("Searching for skill:", skill);
  
  try {
    const result = await pool.query(`
      SELECT 
        p.*,
        COALESCE(
          json_agg(
            CASE WHEN s.name IS NOT NULL THEN s.name ELSE NULL END
          ) FILTER (WHERE s.name IS NOT NULL), 
          '[]'
        ) as skills
      FROM profiles p
      LEFT JOIN profile_skills ps ON p.id = ps.profile_id
      LEFT JOIN skills s ON ps.skill_id = s.id
      WHERE p.id IN (
        SELECT DISTINCT p2.id 
        FROM profiles p2
        INNER JOIN profile_skills ps2 ON p2.id = ps2.profile_id
        INNER JOIN skills s2 ON ps2.skill_id = s2.id
        WHERE LOWER(s2.name) = LOWER($1)
      )
      GROUP BY p.id, p.name, p.role, p.created_at
      ORDER BY p.created_at DESC
    `, [skill]);
    
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

// get all available skills: GET /api/profiles/skills
router.get('/skills', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM skills ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// add new skill: POST /api/profiles/skills
router.post('/skills', async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Skill name is required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO skills (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // Unique constraint violation
      res.status(409).json({ error: 'Skill already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// delete skill: DELETE /api/profiles/skills/:id
router.delete('/skills/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Check if skill is being used by any profiles
    const usageCheck = await pool.query(
      'SELECT COUNT(*) as count FROM profile_skills WHERE skill_id = $1',
      [id]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(409).json({ 
        error: 'Cannot delete skill because it is currently assigned to one or more profiles' 
      });
    }

    const result = await pool.query('DELETE FROM skills WHERE id = $1 RETURNING *', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    res.json({ message: 'Skill deleted successfully', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// delete profile: DELETE /api/profiles/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // The CASCADE will automatically delete related profile_skills records
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