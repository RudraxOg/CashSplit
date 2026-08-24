const express = require('express');
const store = require('../data/store');

const router = express.Router();

router.get('/me', (req, res) => {
  const user = store.MEMBERS.find((member) => member.id === 'krishna');
  res.json({ ...user, email: 'krishna@roommate.local', avatarUrl: null });
});

module.exports = router;
