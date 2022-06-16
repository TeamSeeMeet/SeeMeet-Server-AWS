const express = require('express');
const user = require('../controllers/user');
const router = express.Router();

router.delete('/userDelete', user.deleteUser);
router.put('/password', user.resetPassword);
module.exports = router;
