const express = require('express');
const plan = require('../controllers/plan');
const router = express.Router();

router.get('/response/:dateId', plan.getPlanByDate);
router.get('/month/:year/:month', plan.getPlanByMonth);
router.get('/detail/:planId', plan.getPlanById);
router.get('/comeplan/:year/:month', plan.getPlanCome);
router.get('/invitationplan/:year/:month', plan.getPlan3Month);
router.get('/lastplan/:year/:month/:day', plan.getPlanLast);
router.put('/delete/:planId', plan.deletePlan);

module.exports = router;
