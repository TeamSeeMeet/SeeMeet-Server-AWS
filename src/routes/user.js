const express = require('express');
const user = require('../controllers/user');
const file = require('../controllers/file');
const router = express.Router();
const upload = require('../config/multer');

router.delete('/userDelete', user.deleteUser);
router.post('/upload', upload.single('file'), file.uploadFileToS3);
router.put('/password', user.resetPassword);

router.post('/push', user.changePush);
module.exports = router;
