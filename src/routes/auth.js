const express = require('express');
const auth = require('../controllers/auth');
const router = express.Router();

router.post('/social', auth.authSocialLogin);
router.put('/', auth.authSignup);
router.put('/withdrawal', auth.authWithdrawal);
module.exports = router;
