const express = require('express');
const user = require('../controllers/user');
const file = require('../controllers/file');
const router = express.Router();
const upload = require('../config/multer');

router.delete('/userDelete', user.deleteUser);
router.post('/upload', upload.single('file'), file.uploadFileToS3);
module.exports = router;
