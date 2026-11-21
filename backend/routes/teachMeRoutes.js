import express from 'express';
import {
  evaluateExplanationController,
  interactTeachMeController,
  getTeachMeHistoryController,
  getTeachMeSessionByIdController,
  deleteTeachMeSessionController,
  deleteAllTeachMeHistoryController,
} from '../controllers/teachMeController.js';

const router = express.Router();

router.post('/evaluate', evaluateExplanationController);
router.post('/interact', interactTeachMeController);
router.get('/history/:userId', getTeachMeHistoryController);
router.get('/session/:sessionId', getTeachMeSessionByIdController);
router.delete('/session/:sessionId', deleteTeachMeSessionController);
router.delete('/history/:userId', deleteAllTeachMeHistoryController);

export default router;