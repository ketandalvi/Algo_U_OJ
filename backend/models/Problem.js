import mongoose from 'mongoose';

const testCaseSchema = new mongoose.Schema({
  input: {
    type: String,
    required: true,
  },
  expectedOutput: {
    type: String,
    required: true,
  },
});

const problemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      required: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    testCases: {
      type: [testCaseSchema],
      default: [],
    },
    starterCode: {
      javascript: { type: String, default: '' },
      python: { type: String, default: '' },
      cpp: { type: String, default: '' },
    },
    timeLimit: {
      type: Number,
      default: 5000,  // milliseconds
    },
    memoryLimit: {
      type: Number,
      default: 128,   // MB
    },
  },
  {
    timestamps: true, // auto-adds createdAt and updatedAt
  }
);

const Problem = mongoose.model('Problem', problemSchema);

export default Problem;