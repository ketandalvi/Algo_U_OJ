import mongoose from 'mongoose';

const testCaseSchema = new mongoose.Schema({
  input: {
    type: String,
    required: [true, 'Test case input is required'],
    minlength: [1, 'Test case input cannot be empty'],
    maxlength: [10000, 'Test case input must not exceed 10000 characters'],
  },
  expectedOutput: {
    type: String,
    required: [true, 'Test case expected output is required'],
    minlength: [1, 'Test case expected output cannot be empty'],
    maxlength: [10000, 'Test case expected output must not exceed 10000 characters'],
  },
});

const problemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Problem title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title must not exceed 200 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Problem slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [2, 'Slug must be at least 2 characters'],
      maxlength: [100, 'Slug must not exceed 100 characters'],
      match: [
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Slug can only contain lowercase letters, numbers and hyphens',
      ],
    },
    description: {
      type: String,
      required: [true, 'Problem description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [50000, 'Description must not exceed 50000 characters'],
    },
    difficulty: {
      type: String,
      enum: {
        values: ['Easy', 'Medium', 'Hard'],
        message: 'Difficulty must be Easy, Medium or Hard',
      },
      required: [true, 'Difficulty is required'],
    },
    tags: {
      type: [
        {
          type: String,
          trim: true,
          lowercase: true,
          minlength: [1, 'Each tag must be at least 1 character'],
          maxlength: [50, 'Each tag must not exceed 50 characters'],
        },
      ],
      default: [],
      validate: {
        validator: function (value) {
          return value.length <= 20;
        },
        message: 'Problem must not have more than 20 tags',
      },
    },
    testCases: {
      type: [testCaseSchema],
      default: [],
      validate: [
        {
          validator: function (value) {
            return value.length > 0;
          },
          message: 'Problem must have at least one test case',
        },
        {
          validator: function (value) {
            return value.length <= 500;
          },
          message: 'Problem must not have more than 500 test cases',
        },
      ],
    },
    starterCode: {
      javascript: {
        type: String,
        default: '',
        maxlength: [30000, 'JavaScript starter code must not exceed 30000 characters'],
      },
      python: {
        type: String,
        default: '',
        maxlength: [30000, 'Python starter code must not exceed 30000 characters'],
      },
      cpp: {
        type: String,
        default: '',
        maxlength: [30000, 'C++ starter code must not exceed 30000 characters'],
      },
    },
    timeLimit: {
      type: Number,
      default: 5000,
      min: [1000, 'Time limit must be at least 1000ms'],
      max: [15000, 'Time limit must not exceed 15000ms'],
      validate: {
        validator: function (value) {
          return Number.isFinite(value);
        },
        message: 'Time limit must be a valid finite number (not NaN or Infinity)',
      },
    },
    memoryLimit: {
      type: Number,
      default: 128,
      min: [16, 'Memory limit must be at least 16MB'],
      max: [512, 'Memory limit must not exceed 512MB'],
      validate: {
        validator: function (value) {
          return Number.isFinite(value);
        },
        message: 'Memory limit must be a valid finite number (not NaN or Infinity)',
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Problem creator is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'published', 'archived'],
        message: 'Status must be draft, published or archived',
      },
      default: 'draft',
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for frequently queried fields
problemSchema.index({ status: 1 });
problemSchema.index({ createdBy: 1 });

const Problem = mongoose.model('Problem', problemSchema);

export default Problem;