const express = require('express');
const router = express.Router();

// simple notifications endpoint (history not implemented)
router.get('/', (req, res) => {
  res.json([{ id:1, text: 'Welcome to LMS' }]);
});

module.exports = router;
