const express = require('express');
const router = express.Router();
const {
  analyzeKnowledgeGapsController,
} = require('../controllers/knowledgeGapController');

router.post('/analyze', analyzeKnowledgeGapsController);

module.exports = router;