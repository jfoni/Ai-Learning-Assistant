import express from 'express';
import {
  evaluateExplanationController,
  interactTeachMeController,
  getTeachMeHistoryController,
  getTeachMeSessionByIdController,
} from '../controllers/teachMeController.js';

const router = express.Router();

router.post('/evaluate', evaluateExplanationController);
router.post('/interact', interactTeachMeController);
router.get('/history/:userId', getTeachMeHistoryController);
router.get('/session/:sessionId', getTeachMeSessionByIdController);

export default router;