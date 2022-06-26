const express = require('express');
const invitation = require('../controllers/invitation');
const router = express.Router();

router.get('/list', invitation.getInvitation);
router.post('/', invitation.postInvitation);
router.get('/:invitationId', invitation.getInvitationById);
router.post('/:invitationId', invitation.confirmInvitation);
router.put('/:invitationId', invitation.cancelInvitation);
router.get('/canceled/:invitationId', invitation.getCanceledInvitation);
router.put('/list/:invitationId', invitation.updateInvisible);

module.exports = router;
