import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    id: { type: String },
    question: { type: String, required: true },
    options: { type: [String], default: [] },
    correctAnswer: { type: String, required: true },
    explanation: { type: String, default: '' },
  },
  { _id: false }
);

const answerSchema = new mongoose.Schema(
  {
    questionIndex: { type: Number, required: true },
    selectedAnswer: { type: String, default: '' },
    correctAnswer: { type: String, default: '' },
    isCorrect: { type: Boolean, default: false },
    explanation: { type: String, default: '' },
  },
  { _id: false }
);

const quizSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: null,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null,
    },
    title: {
      type: String,
      required: true,
    },
    topic: {
      type: String,
      default: 'Study Quiz',
    },
    category: {
      type: String,
      default: 'Most Important (Mixed)',
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Medium',
    },
    questions: {
      type: [questionSchema],
      default: [],
    },
  },
  { timestamps: true }
);

const quizSubmissionSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      default: null,
    },
    userId: {
      type: String,
      default: null,
      index: true,
    },
    title: {
      type: String,
      default: 'Study Quiz',
    },
    topic: {
      type: String,
      default: 'Study Quiz',
    },
    category: {
      type: String,
      default: 'Most Important (Mixed)',
    },
    difficulty: {
      type: String,
      default: 'Medium',
    },
    answers: {
      type: [answerSchema],
      default: [],
    },
    score: {
      type: Number,
      default: 0,
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const Quiz = mongoose.models.Quiz || mongoose.model('Quiz', quizSchema);
export const QuizSubmission =
  mongoose.models.QuizSubmission ||
  mongoose.model('QuizSubmission', quizSubmissionSchema);

export default Quiz;