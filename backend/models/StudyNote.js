import mongoose from 'mongoose';

const topicSectionSchema = new mongoose.Schema(
  {
    topicNumber: { type: Number, default: 1 },
    heading: { type: String, default: '' },
    pageOrSlideRef: { type: String, default: '' },
    sourceBasis: {
      type: String,
      enum: ['source_grounded', 'mixed', 'ai_supplemented'],
      default: 'source_grounded',
    },
    subheadings: { type: [String], default: [] },
    definition: { type: String, default: '' },
    explanation: { type: String, default: '' },
    keyConcepts: { type: [String], default: [] },
    characteristics: { type: [String], default: [] },
    bulletPoints: { type: [String], default: [] },
    steps: { type: [String], default: [] },
    workingPrinciple: { type: String, default: '' },
    typesOrClassifications: { type: [String], default: [] },
    advantages: { type: [String], default: [] },
    disadvantages: { type: [String], default: [] },
    comparisons: { type: [String], default: [] },
    formulas: { type: [String], default: [] },
    examples: { type: [String], default: [] },
    importantFacts: { type: [String], default: [] },
    codeSnippet: { type: String, default: '' },
    tableMarkdown: { type: String, default: '' },
    aiSupplementaryNote: { type: String, default: '' },
  },
  { _id: false }
);

const noteVersionSchema = new mongoose.Schema(
  {
    version: { type: Number, required: true },
    title: { type: String, required: true },
    contentText: { type: String, required: true },
    sections: { type: [topicSectionSchema], default: [] },
    noteType: { type: String, default: 'Detailed Study Notes' },
    explanationLevel: { type: String, default: 'Intermediate' },
    language: { type: String, default: 'English' },
    savedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const studyNoteSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    documentTitle: { type: String, default: '' },
    fileFormat: { type: String, default: '' },
    subject: { type: String, default: '' },
    title: { type: String, required: true },
    topicScope: { type: String, default: 'entire' },
    topic: { type: String, default: '' },
    noteType: { type: String, default: 'Detailed Study Notes' },
    explanationLevel: { type: String, default: 'Intermediate' },
    difficulty: { type: String, default: 'Intermediate' },
    language: { type: String, default: 'English' },
    generationStatus: {
      type: String,
      enum: ['completed', 'partial', 'failed'],
      default: 'completed',
    },
    overview: {
      documentName: { type: String, default: '' },
      documentType: { type: String, default: '' },
      subject: { type: String, default: '' },
      totalPagesOrSlides: { type: Number, default: null },
      totalDetectedTopics: { type: Number, default: 0 },
      topicRelationships: { type: [String], default: [] },
      detectedTopics: {
        type: [
          {
            number: Number,
            title: String,
            subtopics: { type: [String], default: [] },
            pageOrSlideRef: { type: String, default: '' },
          },
        ],
        default: [],
      },
    },
    sections: { type: [topicSectionSchema], default: [] },
    definitions: {
      type: [{ term: String, definition: String }],
      default: [],
    },
    keyConcepts: { type: [String], default: [] },
    formulas: { type: [String], default: [] },
    examples: { type: [String], default: [] },
    importantPoints: { type: [String], default: [] },
    sourceLimitations: { type: [String], default: [] },
    contentText: { type: String, default: '' },
    version: { type: Number, default: 1 },
    versions: { type: [noteVersionSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.StudyNote ||
  mongoose.model('StudyNote', studyNoteSchema);