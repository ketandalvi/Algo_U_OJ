import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem',
      required: [true, 'Problem is required'],
    },
    code: {
      type: String,
      required: [true, 'Code is required'],
      maxlength: [100000, 'Code must not exceed 100000 characters'],
    },
    language: {
      type: String,
      enum: {
        values: ['python', 'javascript', 'cpp'],
        message: 'Language must be python, javascript or cpp',
      },
      required: [true, 'Language is required'],
    },
    verdict: {
      type: String,
      enum: {
        values: [
          'Accepted',
          'Wrong Answer',
          'Time Limit Exceeded',
          'Memory Limit Exceeded',
          'Runtime Error',
          'Compile Error',
          'Pending',
        ],
        message: 'Invalid verdict',
      },
      default: 'Pending',
    },
    runtime: {
      type: Number,
      default: null,
    },
    passedCount: {
      type: Number,
      default: 0,
    },
    totalCount: {
      type: Number,
      default: 0,
    },
    errorMessage: {
      type: String,
      default: null,
      maxlength: [5000, 'Error message must not exceed 5000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
submissionSchema.index({ userId: 1, createdAt: -1 });
submissionSchema.index({ problemId: 1, userId: 1 });
submissionSchema.index({ userId: 1, problemId: 1, verdict: 1 });

const Submission = mongoose.model('Submission', submissionSchema);

export default Submission;