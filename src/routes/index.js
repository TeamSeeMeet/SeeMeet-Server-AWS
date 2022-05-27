const express = require('express');
const router = express.Router();

router.use('/user', require('./user'));
router.use('/auth', require('./auth'));
router.use('/friend', require('./friend'));
router.use('/plan', require('./plan'));
router.use('/invitation', require('./invitation'));
router.use('/invitation-response', require('./invitationResponse'));

module.exports = router;
