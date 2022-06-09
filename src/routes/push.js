const express = require('express');
const push = require('../controllers/push');
const router = express.Router();

router.get('/', push.pushAlarm);

module.exports = router;
