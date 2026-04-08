import { runCode } from './runner.js';

console.log('Testing runner...\n');

// Test 1 — Python correct output
console.log('Test 1: Python basic input/output');
const result1 = await runCode(
  'n = int(input())\nprint(n * 2)',
  'python',
  '5',
  5000,
  128
);
console.log('Output:', result1.output);
console.log('Exit code:', result1.exitCode);
console.log('Timed out:', result1.timedOut);
console.log('Expected: 10\n');

// Test 2 — Python infinite loop (TLE)
console.log('Test 2: Python infinite loop (should TLE)');
const result2 = await runCode(
  'while True: pass',
  'python',
  '',
  3000,
  128
);
console.log('Output:', result2.output);
console.log('Exit code:', result2.exitCode);
console.log('Timed out:', result2.timedOut);
console.log('Expected: timedOut = true\n');

// Test 3 — JavaScript
console.log('Test 3: JavaScript basic input/output');
const result3 = await runCode(
  `const lines = require('fs').readFileSync('/dev/stdin','utf8').trim();
console.log(parseInt(lines) * 2);`,
  'javascript',
  '7',
  5000,
  128
);
console.log('Output:', result3.output);
console.log('Exit code:', result3.exitCode);
console.log('Expected: 14\n');

// Test 4 — Python runtime error
console.log('Test 4: Python runtime error');
const result4 = await runCode(
  'print(1/0)',
  'python',
  '',
  5000,
  128
);
console.log('Output:', result4.output);
console.log('Exit code:', result4.exitCode);
console.log('Error:', result4.error);
console.log('Expected: exit code != 0\n');


console.log('Test 5: C++ basic input/output');
const result5 = await runCode(
  `#include<iostream>
using namespace std;
int main(){
  int n; cin>>n;
  cout<<n*2<<endl;
  return 0;
}`,
  'cpp',
  '6',
  10000,
  128
);
console.log('Output:', result5.output);
console.log('Exit code:', result5.exitCode);
console.log('Expected: 12\n');

console.log('Test 6: C++ compile error');
const result6 = await runCode(
  'this is not valid cpp code at all',
  'cpp',
  '',
  10000,
  128
);
console.log('Output:', result6.output);
console.log('Exit code:', result6.exitCode);
console.log('Error:', result6.error);
console.log('Expected: exit code != 0, error contains compiler message\n');

console.log('Test 7: Python memory bomb');
const result7 = await runCode(
  `x = []
while True:
    x.append(' ' * 10**6)`,
  'python',
  '',
  5000,
  16  // very small limit to trigger OOM quickly
);
console.log('Output:', result7.output);
console.log('Exit code:', result7.exitCode);
console.log('Timed out:', result7.timedOut);
console.log('Expected: exit code != 0\n');

console.log('Test 8: Python with no input needed');
const result8 = await runCode(
  'print("hello world")',
  'python',
  '',
  5000,
  128
);
console.log('Output:', result8.output);
console.log('Exit code:', result8.exitCode);
console.log('Expected: hello world\n');