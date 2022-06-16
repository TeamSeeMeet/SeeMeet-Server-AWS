const express = require('express');
const push = require('../controllers/push');
const router = express.Router();

router.get('/', push.sendPushAlarm);
router.get('/plan', push.pushPlan);

module.exports = router;
