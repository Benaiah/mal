/*global require, process*/

const util = require('util')
const readStr = require('./reader.js')
const printStr = require('./printer.js')
const types = require('./types.js')
const debug = require('./debug.js')
const Env = require('./env.js')

const arg = (a) => Array.prototype.slice.call(a)

const prompt = "user> "

const replEnvironment = new Env(types.nil(), {
  '+': (...args) =>
    types.integer(Math.floor( args.reduce( (a, b) => a.val + b.val ) )),
  '-': (...args) =>
    types.integer(Math.floor( args.reduce( (a, b) => a.val - b.val ) )),
  '*': (...args) =>
    types.integer(Math.floor( args.reduce( (a, b) => a.val * b.val ) )),
  '/': (...args) =>
    types.integer(Math.floor( args.reduce( (a, b) => a.val / b.val ) ))
})

const loop = (text) => {
  if (text === "\x04") { process.exit() }
  else {
    process.stdout.write(rep(text));
    process.stdout.write(prompt)
  }
}

const rep = (arg) => {
  try {
    debug(replEnvironment)
    return PRINT(
      EVAL(
        READ(arg),
        replEnvironment
      )
    )
  } catch (e) {
    console.log(e.name + ":", e.message)
    return ""
  }
}

const READ = (arg) => {
  return readStr("[" + arg + "]")
}

const PRINT = (arg) => {
  const output = printStr(arg)
  const unwrappedOutput = (output.length > 1)
        ? output.slice(1, -1)
        : output
  return unwrappedOutput.trim() + "\n"
}

const evalAST = (ast, replEnv) => {
  switch (ast.type) {
  case types.SYMBOL:  return replEnv.get(ast)
  case types.LIST:    return types.list(  ast.val.map( (val) => EVAL(val, replEnv) ))
  case types.VECTOR:  return types.vector(ast.val.map( (val) => EVAL(val, replEnv) ))
  case types.HASHMAP: return types.hashmap(
    ((hashmap) => {
     return Object.keys(ast.val)
        .reduce((result, key) => {
          result[key] = EVAL(hashmap[key], replEnv)
          return result
        }, {})
    })(ast.val)
  )
  default: return ast
  }
}

const EVAL = (ast, replEnv) => {
  if ( !types.is(ast, types.LIST) ) {
    const ret = evalAST( ast, replEnv )
    return ret
  } else if ( ast.val.length === 0 ) {
    debug("Empty list.")
    return ast
  } else {
    let result
    switch (ast.val[0].val) {
    case "def!":
      const [_, key, val] = ast.val
      const evalledVal = EVAL( val, replEnv)
      replEnv.set(key, evalledVal)
      debug("EVAL:", ast, replEnv)
      debug("EVAL ->", result)
      return evalledVal

    case "let*":
      debug("EVAL:", ast, replEnv)
      let bindingList = ast.val[1].val
      let newEnv = new Env(replEnv, {})
      debug("EVAL - newEnv(no entries):", newEnv)
      bindingList.forEach( (binding, i) => {
        if (i % 2 !== 0) { return }
        debug(`EVAL - setting newEnv[${ binding.val }] to`,
              bindingList[i + 1])
        newEnv.set(binding, EVAL(bindingList[i + 1], newEnv))
      })
      debug("EVAL - newEnv:", newEnv)
      result = EVAL( ast.val[2], newEnv)
      debug("EVAL ->", result)
      return result

    default:
      const evaledList = evalAST(ast, replEnv)
      debug("EVAL:", ast, replEnv)
      debug("EVAL - evaledList:", evaledList)
      result = ((fn, args) => {
        return fn.apply(undefined, args)
      })(evaledList.val[0], evaledList.val.slice(1))
      debug("EVAL ->", result)
      return result
    }
  }
}

process.stdin.setEncoding('utf8')
process.stdout.write(prompt)
process.stdin.on('data', loop)
