import mongoose from 'mongoose';
import Quiz, { QuizSubmission } from '../models/Quiz.js';
import Flashcard from '../models/Flashcard.js';
import Document from '../models/Document.js';
import { generateQuizWithGemini, stripTopicNoise } from '../utils/geminiService.js';

export const generateQuiz = async (req, res) => {
  try {
    const {
      userId,
      documentId,
      topic,
      customTopic,
      title,
      category,
      difficulty = 'Medium',
      questionCount = 5,
      count,
      pdfText,
    } = req.body;

    const resolvedTopic = String(topic || customTopic || title || '').trim();
    const boundedCount = Math.max(1, Math.min(20, Number(questionCount ?? count) || 5));
    const normalizedDifficulty = ['Easy', 'Medium', 'Hard'].includes(difficulty)
      ? difficulty
      : 'Medium';

    let sourceTitle = stripTopicNoise(resolvedTopic || 'Study Quiz');
    let sourceContent = String(pdfText || '').trim();

    if (documentId && mongoose.Types.ObjectId.isValid(documentId)) {
      const doc = await Document.findById(documentId);
      if (doc) {
        sourceTitle = stripTopicNoise(resolvedTopic || doc.title || sourceTitle);
        sourceContent = [doc.extractedText || doc.content || '', sourceContent]
          .filter(Boolean)
          .join('\n\n');
      }
    }

    const promptInput = sourceContent || sourceTitle;
    const generated = await generateQuizWithGemini(
      promptInput,
      boundedCount,
      normalizedDifficulty
    );

    const rawQuestions = Array.isArray(generated?.questions) ? generated.questions : [];
    const formattedQuestions = rawQuestions.slice(0, boundedCount).map((q, idx) => {
      const opts =
        Array.isArray(q.options) && q.options.length > 0
          ? q.options
          : ['Option A', 'Option B', 'Option C', 'Option D'];
      const correctAns = q.correctAnswer || opts[0];
      return {
        id: q.id || `q-${idx + 1}`,
        question: q.question || `Question ${idx + 1}`,
        options: opts,
        correctAnswer: correctAns,
        explanation: q.explanation || `${correctAns} is the correct answer.`,
      };
    });

    const quizDoc = await Quiz.create({
      userId: userId || null,
      documentId:
        documentId && mongoose.Types.ObjectId.isValid(documentId) ? documentId : null,
      title: sourceTitle,
      topic: sourceTitle,
      category: category || 'Most Important (Mixed)',
      difficulty: normalizedDifficulty,
      questions: formattedQuestions,
    });

    return res.status(201).json({
      success: true,
      data: quizDoc,
    });
  } catch (error) {
    console.error('Generate Quiz Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getQuizzes = async (req, res) => {
  try {
    const { userId } = req.query;
    const filter = userId ? { userId: String(userId) } : {};
    const quizzes = await Quiz.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: quizzes.length,
      data: quizzes,
    });
  } catch (error) {
    console.error('Get Quizzes Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getQuizById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid quiz ID' });
    }
    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }
    return res.status(200).json({ success: true, data: quiz });
  } catch (error) {
    console.error('Get Quiz By ID Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const submitQuiz = async (req, res) => {
  try {
    const { quizId, userId, answers = [] } = req.body;

    if (!quizId || !mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ success: false, error: 'Valid quizId is required' });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }

    const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
    let score = 0;

    const evaluatedAnswers = questions.map((q, idx) => {
      const submittedItem = Array.isArray(answers)
        ? answers.find((a) => Number(a.questionIndex) === idx)
        : null;
      const selectedAnswer = submittedItem?.selectedAnswer ?? '';
      const isCorrect =
        String(selectedAnswer).trim() !== '' &&
        String(selectedAnswer).trim() === String(q.correctAnswer).trim();
      if (isCorrect) score += 1;

      return {
        questionIndex: idx,
        question: q.question || submittedItem?.question || `Question ${idx + 1}`,
        selectedAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const totalQuestions = questions.length;
    const percentage =
      totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
    const cleanTitle = stripTopicNoise(quiz.title || quiz.topic || 'Study Quiz');

    const submission = await QuizSubmission.create({
      quizId: quiz._id,
      userId: userId || quiz.userId || null,
      title: cleanTitle,
      topic: cleanTitle,
      category: quiz.category || 'Most Important (Mixed)',
      difficulty: quiz.difficulty || 'Medium',
      answers: evaluatedAnswers,
      score,
      totalQuestions,
      percentage,
    });

    return res.status(201).json({
      success: true,
      data: {
        submissionId: submission._id,
        quizId: quiz._id,
        title: submission.title,
        topic: submission.topic,
        score,
        totalQuestions,
        percentage,
        questions,
        results: evaluatedAnswers,
      },
    });
  } catch (error) {
    console.error('Submit Quiz Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getAllSubmissions = async (req, res) => {
  try {
    const { userId } = req.query;
    const filter = userId ? { userId: String(userId) } : {};
    const submissions = await QuizSubmission.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: submissions.length,
      data: submissions,
    });
  } catch (error) {
    console.error('Get All Submissions Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteQuizSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return res.status(400).json({ success: false, error: 'Invalid submission ID' });
    }

    const deleted = await QuizSubmission.findByIdAndDelete(submissionId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Quiz submission deleted successfully',
      data: { deletedId: submissionId },
    });
  } catch (error) {
    console.error('Delete Quiz Submission Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getQuizSubmissions = async (req, res) => {
  try {
    const { quizId } = req.params;
    const submissions = await QuizSubmission.find({ quizId }).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: submissions.length,
      data: submissions,
    });
  } catch (error) {
    console.error('Get Quiz Submissions Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Quiz.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }
    await QuizSubmission.deleteMany({ quizId: id });
    return res.status(200).json({ success: true, message: 'Quiz deleted' });
  } catch (error) {
    console.error('Delete Quiz Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const saveFlashcardsFromQuiz = async (req, res) => {
  try {
    const { quizId, userId, flashcards } = req.body;
    const items = Array.isArray(flashcards) ? flashcards : [];
    const saved = await Flashcard.insertMany(
      items.map((fc) => ({
        userId: userId || null,
        quizId: quizId || null,
        front: fc.front || fc.question || '',
        back: fc.back || fc.answer || '',
      }))
    );
    return res.status(201).json({ success: true, data: saved });
  } catch (error) {
    console.error('Save Flashcards From Quiz Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export { generateQuiz as generateAIQuiz };