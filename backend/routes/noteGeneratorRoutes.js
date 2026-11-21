import express from 'express';
import {
  analyzeDocumentController,
  generateStudyNoteController,
  getUserStudyNotesController,
  updateStudyNoteController,
  regenerateStudyNoteController,
  deleteStudyNoteController,
  exportStudyNoteController,
} from '../controllers/noteGeneratorController.js';

const router = express.Router();

router.post('/analyze', analyzeDocumentController);
router.post('/generate', generateStudyNoteController);
router.get('/user/:userId', getUserStudyNotesController);
router.put('/:noteId', updateStudyNoteController);
router.post('/:noteId/regenerate', regenerateStudyNoteController);
router.delete('/:noteId', deleteStudyNoteController);
router.post('/export', exportStudyNoteController);

export default router;