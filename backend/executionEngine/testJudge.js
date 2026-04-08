import { judge } from './judge.js';
import { VERDICT } from './runner.js';

console.log('Testing judge...\n');

// Test 1 — All test cases pass → Accepted
console.log('Test 1: All test cases pass → Accepted');
const result1 = await judge(
  'n = int(input())\nprint(n * 2)',
  'python',
  [
    { input: '5', expectedOutput: '10' },
    { input: '3', expectedOutput: '6' },
    { input: '0', expectedOutput: '0' },
  ],
  5000,
  128
);
console.log('Verdict:', result1.verdict);
console.log('Passed:', result1.passedCount, '/', result1.totalCount);
console.log('Expected:', VERDICT.ACCEPTED, '\n');

// Test 2 — Wrong answer on second test case
console.log('Test 2: Wrong answer on second test case');
const result2 = await judge(
  'n = int(input())\nprint(n * 3)',  // wrong — multiplies by 3 not 2
  'python',
  [
    { input: '5', expectedOutput: '10' },
    { input: '3', expectedOutput: '6' },
  ],
  5000,
  128
);
console.log('Verdict:', result2.verdict);
console.log('Passed:', result2.passedCount, '/', result2.totalCount);
console.log('Expected:', VERDICT.WRONG_ANSWER, '\n');

// Test 3 — TLE
console.log('Test 3: Time limit exceeded');
const result3 = await judge(
  'while True: pass',
  'python',
  [{ input: '', expectedOutput: '' }],
  3000,
  128
);
console.log('Verdict:', result3.verdict);
console.log('Passed:', result3.passedCount, '/', result3.totalCount);
console.log('Expected:', VERDICT.TIME_LIMIT_EXCEEDED, '\n');

// Test 4 — Runtime error
console.log('Test 4: Runtime error');
const result4 = await judge(
  'print(1/0)',
  'python',
  [{ input: '', expectedOutput: '0' }],
  5000,
  128
);
console.log('Verdict:', result4.verdict);
console.log('Passed:', result4.passedCount, '/', result4.totalCount);
console.log('Expected:', VERDICT.RUNTIME_ERROR, '\n');

// Test 5 — C++ accepted
console.log('Test 5: C++ accepted');
const result5 = await judge(
  `#include<iostream>
using namespace std;
int main(){
  int n; cin>>n;
  cout<<n*2<<endl;
  return 0;
}`,
  'cpp',
  [
    { input: '5', expectedOutput: '10' },
    { input: '7', expectedOutput: '14' },
  ],
  10000,
  128
);
console.log('Verdict:', result5.verdict);
console.log('Passed:', result5.passedCount, '/', result5.totalCount);
console.log('Expected:', VERDICT.ACCEPTED, '\n');

// Test 6 — C++ compile error
console.log('Test 6: C++ compile error');
const result6 = await judge(
  'this is not valid cpp',
  'cpp',
  [{ input: '5', expectedOutput: '10' }],
  10000,
  128
);
console.log('Verdict:', result6.verdict);
console.log('Passed:', result6.passedCount, '/', result6.totalCount);
console.log('Expected:', VERDICT.COMPILE_ERROR, '\n');

// Test 7 — Whitespace normalisation (trailing spaces/newlines)
console.log('Test 7: Whitespace normalisation');
const result7 = await judge(
  'print("hello")',
  'python',
  [{ input: '', expectedOutput: 'hello\n' }],   // expected has trailing newline
  5000,
  128
);
console.log('Verdict:', result7.verdict);
console.log('Passed:', result7.passedCount, '/', result7.totalCount);
console.log('Expected:', VERDICT.ACCEPTED, '\n');

// Test 8 — JavaScript accepted
console.log('Test 8: JavaScript accepted');
const result8 = await judge(
  `const n = parseInt(require('fs').readFileSync('/dev/stdin','utf8').trim());
console.log(n * 2);`,
  'javascript',
  [
    { input: '4', expectedOutput: '8' },
    { input: '10', expectedOutput: '20' },
  ],
  5000,
  128
);
console.log('Verdict:', result8.verdict);
console.log('Passed:', result8.passedCount, '/', result8.totalCount);
console.log('Expected:', VERDICT.ACCEPTED, '\n');

console.log('All judge tests complete!');

console.log('Test 9: Memory limit exceeded');
const result9 = await judge(
  `x = []
while True:
    x.append(' ' * 10**6)`,
  'python',
  [{ input: '', expectedOutput: '' }],
  5000,
  16
);
console.log('Verdict:', result9.verdict);
console.log('Passed:', result9.passedCount, '/', result9.totalCount);
console.log('Expected:', VERDICT.MEMORY_LIMIT_EXCEEDED, '\n');

console.log('Test 10: Passes 2 of 3 test cases');
const result10 = await judge(
  'n = int(input())\nprint(n * 2)',
  'python',
  [
    { input: '5', expectedOutput: '10' },
    { input: '3', expectedOutput: '6' },
    { input: '4', expectedOutput: '999' }, // wrong expected to force WA
  ],
  5000,
  128
);
console.log('Verdict:', result10.verdict);
console.log('Passed:', result10.passedCount, '/', result10.totalCount);
console.log('Expected: Wrong Answer, 2/3\n');