const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/friend', require('./friend'));
router.use('/plan', require('./plan'));
// router.use('/invitation', require('./invitation'));
// router.use('/invitationResponse', require('./invitationResponse'));
module.exports = router;
