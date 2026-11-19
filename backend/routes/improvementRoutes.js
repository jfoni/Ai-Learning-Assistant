const express = require('express');
const router = express.Router();
const { getUserImprovementData } = require('../controllers/improvementController');

router.get('/:userId', getUserImprovementData);

module.exports = router;