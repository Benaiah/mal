/*global require, process*/

const util = require('util')
const readStr = require('./reader.js')
const printStr = require('./printer.js')
const types = require('./types.js')
const debug = require('./debug.js')

const arg = (a) => Array.prototype.slice.call(a)

const prompt = "user> "

const replEnvironment = {
  '+': (...args) =>
    types.integer(Math.floor( args.reduce( (a, b) => a.val + b.val ) )),
  '-': (...args) =>
    types.integer(Math.floor( args.reduce( (a, b) => a.val - b.val ) )),
  '*': (...args) =>
    types.integer(Math.floor( args.reduce( (a, b) => a.val * b.val ) )),
  '/': (...args) =>
    types.integer(Math.floor( args.reduce( (a, b) => a.val / b.val ) ))
}

const lookupSymbol = (ast, replEnv) => {
  if (!types.is(ast, types.SYMBOL) ) {
    throw {
      name: "NonSymbolLookupError",
      message: "Cannot lookup the non-symbol " + util.inspect(ast)
    }
  }

  debug("lookupSymbol:", replEnv, ast, replEnv[ast.val])

  return replEnv[ast.val]
}

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
    debug(e.name + ":", e.message)
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
  case types.SYMBOL:  return lookupSymbol(ast, replEnv)
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
    const evaledList = evalAST(ast, replEnv)
    debug("Evaled list:", evaledList)
    debug("  ", evaledList.val[0].toString())
    debug("  ", evaledList.val.slice(1))
    const result = evaledList.val[0].apply(undefined, evaledList.val.slice(1))
    debug("  ->", result)
    return result
  }
}

process.stdin.setEncoding('utf8')
process.stdout.write(prompt)
process.stdin.on('data', loop)
