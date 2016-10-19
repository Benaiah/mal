/*global require, process*/

const util = require('util')

const prompt = "user> "

process.stdin.setEncoding('utf8')
process.stdout.write(prompt)
process.stdin.on('data', loop)

function READ (arg) { return arg }

function EVAL (arg) { return arg }

function PRINT (arg) { return arg }

function rep (arg) {
  return PRINT(
    EVAL(
      READ(arg)))
}

function loop (text) {
  if (text === "\x04") { process.exit() }
  else {
    process.stdout.write(rep(text));
    process.stdout.write(prompt)
  }
}
