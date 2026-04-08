import { exec } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { promisify } from 'util';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

const LANGUAGE_CONFIG = {
  python: {
    image: 'python:3.11-slim',
    filename: 'solution.py',
    command: 'python3 /solution.py',
  },
  javascript: {
    image: 'node:18-alpine',
    filename: 'solution.js',
    command: 'node /solution.js',
  },
  cpp: {
    image: 'gcc:13',
    filename: 'solution.cpp',
    command: 'bash -c "g++ -o /solution /solution.cpp && /solution"',
  },
};

export const VERDICT = {
  ACCEPTED: 'Accepted',
  WRONG_ANSWER: 'Wrong Answer',
  TIME_LIMIT_EXCEEDED: 'Time Limit Exceeded',
  RUNTIME_ERROR: 'Runtime Error',
  COMPILE_ERROR: 'Compile Error',
  MEMORY_LIMIT_EXCEEDED: 'Memory Limit Exceeded',
};

export const checkDockerAvailable = async () => {
  try {
    await execAsync('docker info', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
};

export const runCode = async (code, language, input, timeLimit = 5000, memoryLimit = 128) => {
  const config = LANGUAGE_CONFIG[language];

  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const tmpFile = path.join(os.tmpdir(), `${uniqueId}-${config.filename}`);
  const tmpInput = path.join(os.tmpdir(), `${uniqueId}-input.txt`);
  const containerFile = `/${config.filename}`;
  const timeLimitSeconds = Math.ceil(timeLimit / 1000);

  try {
    await Promise.all([
      writeFile(tmpFile, code, 'utf8'),
      writeFile(tmpInput, input, 'utf8'),
    ]);

    const dockerCommand = [
      'docker run',
      '-i',
      '--rm',
      '--network none',
      `--memory="${memoryLimit}m"`,
      '--memory-swap="0"',
      '--cpus="0.5"',
      '--ulimit nproc=50',
      '--ulimit fsize=10000000',
      `-v "${tmpFile}:${containerFile}:ro"`,
      config.image,
      `timeout ${timeLimitSeconds} ${config.command}`,
    ].join(' ');

    const fullCommand = `${dockerCommand} < "${tmpInput}"`;

    const { stdout, stderr } = await execAsync(fullCommand, {
      timeout: (timeLimitSeconds + 2) * 1000,
      maxBuffer: 1024 * 1024,
    });

    return {
      output: stdout.trim(),
      exitCode: 0,
      error: stderr.trim() || null,
      timedOut: false,
    };

  } catch (err) {
    const exitCode = err.code || 1;
    const timedOut = exitCode === 124;

    return {
      output: (err.stdout || '').trim(),
      exitCode,
      error: (err.stderr || err.message || '').trim(),
      timedOut,
    };
  } finally {
    await Promise.allSettled([
      unlink(tmpFile),
      unlink(tmpInput),
    ]);
  }
};