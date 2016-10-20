/*global require, process*/

const util = require('util')
const readStr = require('./reader.js')
const printStr = require('./printer.js')

const prompt = "user> "

const previousCommands = []

const loop = (text) => {
  if (text === "\x04") { process.exit() }
  else {
    process.stdout.write(rep(text));
    process.stdout.write(prompt)
  }
}

const rep = (arg) => {
  try {
    return PRINT( EVAL( READ(arg) ) )
  } catch (e) {
    console.log(e.name + ":", e.message)
    return ""
  }
}

const READ = (arg) => {
  return readStr("(" + arg + ")")
}

const PRINT = (arg) => {
  const output = printStr(arg)
  const unwrappedOutput = (output.length > 1)
        ? output.slice(1, -1)
        : output
  return unwrappedOutput.trim() + "\n"
}

const EVAL = (arg) => { return arg }

process.stdin.setEncoding('utf8')
process.stdout.write(prompt)
process.stdin.on('data', loop)
