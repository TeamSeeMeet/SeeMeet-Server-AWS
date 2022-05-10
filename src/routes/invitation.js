const express = require('express');
const invitation = require('../controllers/invitation');
const router = express.Router();

router.post('/social', auth.authSocialLogin);
router.put('/', auth.authSignup);

router.get('/list', invitation.getInvitation);
router.post('/', invitation.postInvitation);
router.get('/:invitationId', invitation.getInvitationById);
router.post('/:invitationId', invitation.confirmInvitation);
router.put('/:invitationId', invitation.cancelInvitation);
router.get('/canceled/:invitationId', invitation.getCanceledInvitation);

module.exports = router;
