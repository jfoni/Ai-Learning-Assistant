import mongoose from 'mongoose';

const evaluationSchema = new mongoose.Schema(
  {
    score: { type: Number, min: 0, max: 100, default: 0 },
    summary: { type: String, default: '' },
    explainedCorrectly: { type: [String], default: [] },
    missingPoints: { type: [String], default: [] },
    misconceptions: { type: [String], default: [] },
    improvementTips: { type: [String], default: [] },
    correctedExplanation: { type: String, default: '' },
    followUpQuestion: { type: String, default: '' },
  },
  { _id: false }
);

const dialogueTurnSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['student', 'teacher'], required: true },
    actionType: {
      type: String,
      enum: ['evaluate', 'answer_followup', 'hint', 'clarify', 'corrected_explanation'],
      default: 'answer_followup',
    },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const teachMeSessionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    topic: { type: String, required: true, trim: true },
    sourceType: {
      type: String,
      enum: ['manual', 'document'],
      default: 'manual',
    },
    documentId: { type: String, default: '' },
    documentTitle: { type: String, default: '' },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Beginner',
    },
    explanation: { type: String, required: true },
    evaluation: { type: evaluationSchema, required: true },
    dialogue: { type: [dialogueTurnSchema], default: [] },
  },
  { timestamps: true }
);

teachMeSessionSchema.index({ userId: 1, topic: 1, createdAt: -1 });

const TeachMeSession =
  mongoose.models.TeachMeSession ||
  mongoose.model('TeachMeSession', teachMeSessionSchema);

export default TeachMeSession;