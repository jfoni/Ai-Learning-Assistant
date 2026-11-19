import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    relevantChunks: {
      type: [Number],
      default: [],
    },
  },
  { _id: false }
);

const chatSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      default: 'New Chat',
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
  },
  { _id: false }
);

const chatHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    sessions: {
      type: [chatSessionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

chatHistorySchema.index({ userId: 1, documentId: 1 });

const ChatHistory = mongoose.model('ChatHistory', chatHistorySchema);

export default ChatHistory;