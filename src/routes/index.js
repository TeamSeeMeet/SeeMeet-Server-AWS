const express = require('express');
const router = express.Router();

router.use('/', require('./UserRouter')); //여기서 에러남

module.exports = router;
