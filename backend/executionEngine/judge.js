import { runCode, VERDICT } from './runner.js';

/**
 * Normalises output for comparison
 * Trims whitespace and normalises line endings
 */
const normaliseOutput = (str) => {
  return str
    .trim()
    .replace(/\r\n/g, '\n')   // Windows line endings → Unix
    .replace(/\r/g, '\n')     // Old Mac line endings → Unix
    .split('\n')
    .map(line => line.trimEnd()) // remove trailing spaces from each line
    .join('\n');
};

/**
 * Detects if an error is a compile error (C++ specific)
 * Compile errors come from g++ and contain specific patterns
 */
const isCompileError = (language, error) => {
  if (language !== 'cpp') return false;
  if (!error) return false;

  // g++ error messages always contain the filename and 'error:'
  return error.includes('error:') || error.includes('undefined reference');
};

/**
 * Judges a single submission against all test cases
 * Returns { verdict, passedCount, totalCount, error, output }
 */
export const judge = async (code, language, testCases, timeLimit, memoryLimit) => {
  const totalCount = testCases.length;

  // Run against each test case
  for (let i = 0; i < testCases.length; i++) {
    const { input, expectedOutput } = testCases[i];

    let result;
    try {
      result = await runCode(code, language, input, timeLimit, memoryLimit);
    } catch (err) {
      // runCode itself threw — infrastructure error
      return {
        verdict: VERDICT.RUNTIME_ERROR,
        passedCount: i,
        totalCount,
        error: err.message,
        output: '',
      };
    }

    // 1. Compile error — only possible for C++
    if (isCompileError(language, result.error)) {
      return {
        verdict: VERDICT.COMPILE_ERROR,
        passedCount: 0,
        totalCount,
        error: result.error,
        output: '',
      };
    }

    // 2. Time limit exceeded
    if (result.timedOut) {
      return {
        verdict: VERDICT.TIME_LIMIT_EXCEEDED,
        passedCount: i,
        totalCount,
        error: null,
        output: '',
      };
    }

    // 3. Memory limit exceeded
    if (result.exitCode === 137) {
      return {
        verdict: VERDICT.MEMORY_LIMIT_EXCEEDED,
        passedCount: i,
        totalCount,
        error: null,
        output: '',
      };
    }

    // 4. Runtime error
    if (result.exitCode !== 0) {
      return {
        verdict: VERDICT.RUNTIME_ERROR,
        passedCount: i,
        totalCount,
        error: result.error,
        output: result.output,
      };
    }

    // 5. Wrong answer
    const actual = normaliseOutput(result.output);
    const expected = normaliseOutput(expectedOutput);

    if (actual !== expected) {
      return {
        verdict: VERDICT.WRONG_ANSWER,
        passedCount: i,
        totalCount,
        error: null,
        output: result.output,
      };
    }

    // This test case passed — continue to next
  }

  // All test cases passed
  return {
    verdict: VERDICT.ACCEPTED,
    passedCount: totalCount,
    totalCount,
    error: null,
    output: '',
  };
};