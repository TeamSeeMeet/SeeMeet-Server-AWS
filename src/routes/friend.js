const express = require('express');
const friend = require('../controllers/friend');
const router = express.Router();

router.get('/list', friend.getFriend);
router.post('/search', friend.searchFriend);
router.post('/addFriend', friend.addFriend);
router.put('/block', friend.blockFriend);
router.put('/cancelblock', friend.cancleBlockFriend);

module.exports = router;
