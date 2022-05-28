const express = require('express');
const auth = require('../controllers/auth');
const router = express.Router();

router.post('/social', auth.authSocialLogin);
router.put('/', auth.authSignup);
router.post('/', auth.signUp);
router.post('/login', auth.authLogin);

module.exports = router;
