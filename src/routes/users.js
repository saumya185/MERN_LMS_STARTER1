const express = require('express');
const User = require('../models/User');
const router = express.Router();

router.get('/:id', async (req, res) => {
  const u = await User.findById(req.params.id).select('-passwordHash');
  if (!u) return res.status(404).json({ error: 'not found' });
  res.json(u);
});

module.exports = router;
