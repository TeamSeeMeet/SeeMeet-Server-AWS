const express = require('express');
const invitationResponse = require('../controllers/invitationResponse');
const router = express.Router();

router.post('/:invitationId', invitationResponse.responseInvitation);
router.post('/:invitationId/reject', invitationResponse.rejectInvitation);
module.exports = router;
