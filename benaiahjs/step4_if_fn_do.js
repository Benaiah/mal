/*global require, process*/

const util = require('util')
const readStr = require('./reader.js')
const printStr = require('./printer.js')
const types = require('./types.js')
const debug = require('./debug.js')
const { Env, bind } = require('./env.js')

const arg = (a) => Array.prototype.slice.call(a)

const prompt = "user> "

const checkArgumentsType = (args, typeList, fnName, typeName) => {
  args.forEach( (arg) => {
    if ( !typeList.reduce(
      ((result, type) => result || types.is(arg, type)), false) ) {
      throw {
        name: "InvalidArgumentTypeError",
        message: `Tried to call ${fnName} on the non-${typeName}: '${util.inspect(arg)}`
      }
    }
  })
}

// Compare vectors or lists by calling isEqual on each item.
const areSequencesEqual = (vl1, vl2) => {
  debug("compareSequences:", vl1, vl2)
  const result = vl1.val.length === vl2.val.length &&
        (vl1.val.reduce( (result, el, i) => {
          debug(`compareSequences - items[${i}]:`, el, vl2.val[i])
          const ret = types.bool(
            result && isEqual([el, vl2.val[i]]).val).val
          debug(`compareSequences - items[${i}] ->`, ret)
          return ret
        }, true ))
  debug("compareSequences ->", result)
  return result
}

const isEqual = (args) => {
  const [arg1, arg2] = args
  debug("=:", arg1, arg2)

  const argsSameType = (arg1.type === arg2.type)

  if (argsSameType) {
    debug(`= - args same type: ${arg1.type}: ${arg1.val}, ${arg2.val}`)
    const areArgsEqual = ((arg1, arg2) => {
        switch (arg1.type) {
        case types.INTEGER:
        case types.STRING:
        case types.SYMBOL:
        case types.KEYWORD:
          debug("=: - int/string comp")
          return arg1.val === arg2.val
        case types.LIST:
        case types.VECTOR:
          debug("= - list/vector comp")
          return areSequencesEqual(arg1, arg2)
        case types.NIL:
          debug("= - nil comp")
          return true
        default:
          debug("= - defaulting to false")
          return false
        }
      })(arg1, arg2)

    debug("= - areArgsEqual", areArgsEqual)
    const result = types.bool(areArgsEqual)
    debug("= ->", result)
    return result
  } else {
    // Handle the cases in which it's possible to compare two
    // different types and get 'true'. This is necessary because, for example
    debug(`= - args different types: ${args[0].type} and ${args[1].type}`)

    // matchArgTypes takes an array where even elements (starting at
    // and including 0) are two-element arrays of types, and odd
    // elements are functions that take the arguments in the same
    // order as the keys. For example:
    //
    // [ [types.LIST, types.NIL], (l, n) => { l.val.length === 0 } ]
    //
    // as a matches object would run the given function whenever
    // one of the args is a list and the other is nil, and pass them
    // in the order <list arg>, <nil arg>.
    const matchArgTypes = (matches, arg1, arg2) => {
      const ret = matches.reduce((result, match, i) => {
        // Short circuit if match is an odd element, those aren't type
        // tests
        if (i % 2 !== 0) { return result }

        debug(`matchArgTypes[${i/2}]:`, result, match, arg1, arg2)

        // Short circuit if we've already found a matching test
        if (result !== undefined) { return result }

        if (types.is(arg1, match[0]) && types.is(arg2, match[1])) {
          const result = matches[i+1](arg1, arg2)
          debug(`matchArgTypes[${i/2}] ->`, result)
          return result
        } else if (types.is(arg2, match[0]) && types.is(arg1, match[1])) {
          const result = matches[i+1](arg2, arg1)
          debug(`matchArgTypes[${i/2}] ->`, result)
          return result
        }

        return result
      }, undefined)
      debug("matchArgTypes ->", ret)
      return ret
    }

    const processedOtherTypeTests = matchArgTypes([
      [types.LIST, types.VECTOR], (l, v) => areSequencesEqual(l, v)
    ], arg1, arg2)

    const result = (processedOtherTypeTests !== undefined)
          ? types.bool(processedOtherTypeTests)
          : types.f()
    debug(`= ->`, result)
    return result
  }
}

const printFunctions = (() => {
  const prStr = (args) => {
    debug("pr-str:", args)
    const printed = args.map((arg) => printStr(arg, true)).join(" ")
    debug("pr-str - printed:", printed)
    const ret = types.string(printed)
    debug("pr-str ->", ret)
    return ret
  }

  const prn = (args) => {
    const printed = args.map((arg) => printStr(arg, true)).join(" ")
    console.log(printed)
    return types.nil()
  }

  const str = (args) => {
    return args.reduce((result, arg) => {
      return types.string(result.val + printStr(arg, false))
    }, types.string(""))
  }

  const println = (args) => {
    const printed = args.map((arg) => printStr(arg, false)).join(" ")
    console.log(printed)
    return types.nil()
  }

  return { prStr, prn, str, println }
})()

const defaultBindings = bind({
  '+': types.fn(
    (args) =>
      types.integer(
        Math.floor( args.reduce( (a, b) => a.val + b.val ) ))),
  '-': types.fn(
    (args) =>
      types.integer(
        Math.floor( args.reduce( (a, b) => a.val - b.val ) ))),
  '*': types.fn(
    (args) =>
      types.integer(
        Math.floor( args.reduce( (a, b) => a.val * b.val ) ))),
  '/': types.fn(
    (args) =>
      types.integer(
        Math.floor( args.reduce( (a, b) => a.val / b.val ) ))),
  '=': types.fn(isEqual),
  '<': types.fn((args) => args.reduce(
    (a, b) => { return types.bool(a.val < b.val ) })),
  '>': types.fn((args) => args.reduce(
    (a, b) => { return types.bool(a.val > b.val ) })),
  '<=': types.fn((args) => args.reduce(
    (a, b) => { return types.bool(a.val <= b.val ) })),
  '>=': types.fn((args) => args.reduce(
    (a, b) => { return types.bool(a.val >= b.val ) })),
  'list': types.fn((args) => types.list(args)),
  'list?': types.fn((args) => args.reduce(
    (result, arg) => {
      debug("list?:", arg)
      const ret = types.bool(result.val && types.is(arg, types.LIST))
      debug("list? ->", ret)
      return ret
    }, types.t())),
  'empty?': types.fn((args) => args.reduce(
    (result, arg) => {
      checkArgumentsType([arg], [types.VECTOR, types.LIST, types.NIL], 'empty?', 'list')
      return types.bool( result.val && arg.val.length === 0)
    }, types.t())),
  'count': types.fn((args) => {
    debug("count:", args)
    const result = args.reduce(
      (result, arg) => {
        checkArgumentsType([arg], [types.VECTOR, types.LIST, types.NIL], 'count', 'list/vector')
        return types.integer(result.val + arg.val.length)
      }, types.integer(0))
    debug("count ->", result)
    return result
  }),
  'str': types.fn(printFunctions.str),
  'pr-str': types.fn(printFunctions.prStr),
  'prn': types.fn(printFunctions.prn),
  'println': types.fn(printFunctions.println)
})

const environment = new Env(types.nil(), defaultBindings[0], defaultBindings[1])

const loop = (text) => {
  if (text === "\x04") { process.exit() }
  else {
    process.stdout.write(rep(text));
    process.stdout.write(prompt)
  }
}

const rep = (arg) => {
  try {
    debug(environment)
    return PRINT(
      EVAL(
        READ(arg),
        environment
      )
    )
  } catch (e) {
    console.error(e.name + ":", e.message)
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

const evalAST = (ast, env) => {
  switch (ast.type) {
  case types.SYMBOL:  return env.get(ast)
  case types.LIST:    return types.list(  ast.val.map( (val) => EVAL(val, env) ))
  case types.VECTOR:  return types.vector(ast.val.map( (val) => EVAL(val, env) ))
  case types.HASHMAP: return types.hashmap(
    ((hashmap) => {
     return Object.keys(ast.val)
        .reduce((result, key) => {
          result[key] = EVAL(hashmap[key], env)
          return result
        }, {})
    })(ast.val)
  )
  default: return ast
  }
}

const EVALSpecialForms = [
  {
    name: "def!",
    fn: (ast, env) => {
      const [_, key, val] = ast.val
      const evalledVal = EVAL( val, env )
      env.set(key, evalledVal)
      debug("EVAL SF def!:", ast, env)
      debug("EVAL SF def! ->", evalledVal)
      return evalledVal
    }
  },
  {
    name: "let*",
    fn: (ast, env) => {
      debug("EVAL SF let*:", ast, env)
      let bindingList = ast.val[1].val
      let newEnv = new Env(env)
      debug("EVAL SF let* - newEnv(no entries):", newEnv)
      bindingList.forEach( (binding, i) => {
        if (i % 2 !== 0) { return }
        debug(`EVAL SF let* - setting newEnv[${ binding.val }] to`,
              bindingList[i + 1])
        newEnv.set(binding, EVAL(bindingList[i + 1], newEnv))
      })
      debug("EVAL SF let* - newEnv:", newEnv)
      const result = EVAL( ast.val[2], newEnv )
      debug("EVAL SF let* ->", result)
      return result
    }
  },
  {
    name: "do",
    fn: (ast, env) => {
      debug("EVAL SF do:", ast, env)
      let forms = ast.val.slice(1)
      debug("EVAL SF do - forms:", forms)
      const result = forms.reduce( (result, form, i) => {
        debug("EVAL SF do - form[" + i + "]:", form)
        const ret = EVAL( form, env )
        debug("EVAL SF do - form ->", result)
        return ret
      }, types.nil() )
      debug("EVAL SF do:", result)
      return result
    }
  },
  {
    name: "if",
    fn: (ast, env) => {
      debug("EVAL SF if:", ast, env)
      const [_, condition, t, e] = ast.val
      const then = (t === undefined) ? types.nil() : t
      const els = (e === undefined) ? types.nil() : e
      debug("EVAL SF condition:", condition)
      debug("EVAL SF then:", then)
      debug("EVAL SF else:", els)
      const conditionResult = EVAL( evalAST( condition, env ), env )
      debug("EVAL SF if - conditionResult:", conditionResult)

      if ( !types.is(conditionResult, types.NIL) &&
           !(types.is(conditionResult, types.BOOL) &&
             conditionResult.val === types.f().val)) {

        // Yes path, conditionResult is not nil or false
        const result = EVAL( then, env )
        debug("EVAL SF if(true) ->", result)
        return result

      } else {
        // No path, conditionResult is nil or false
        const result = EVAL( els, env )
        debug("EVAL SF if(false) ->", result)
        return result
      }
    }
  },
  {
    name: "fn*",
    fn: (ast, outerEnv) => {
      const [_, argList, form] = ast.val

      // Make sure the argList is a vector
      if (!types.is(argList, types.VECTOR) &&
          !types.is(argList, types.LIST)) { throw {
          name: "BadArgListError",
          message: "Attempted to create a function with the non-vector"
              + " and non-list arglist: '" + util.inspect(argList) + "'"
      } }

      // Make sure the elements of the argList are symbols
      argList.val.forEach( (argName) => {
        if (!types.is(argName, types.SYMBOL)) { throw {
          name: "NonSymbolArgNameError",
          message: "Attempted to create a function with the non-symbol "
            + "arg name: '" + util.inspect(argName) + "'"
        } }
      })

      debug("EVAL SF fn*:", argList, form)
      const result = types.fn(
        (args, callEnv) => {
          debug("FN EVAL:", argList, args, outerEnv, callEnv)
          const newEnv = new Env(outerEnv, argList.val, args)
          debug("FN EVAL - newEnv:", newEnv)
          const result = EVAL( form, newEnv )
          debug("FN EVAL ->", result)
          return result
        })
      debug("EVAL SF fn* ->", result)
      return result
    }
  }
]

const EVAL = (ast, env) => {
  if ( !types.is(ast, types.LIST) ) {
    const ret = evalAST( ast, env )
    return ret
  } else if ( ast.val.length === 0 ) {
    debug("Empty list.")
    return ast
  } else {

    const checkedForSpecialForms = EVALSpecialForms.reduce(
      (result, form) => {
        if (result.produced === undefined &&
            ast.val[0].val === form.name) {
          return {
            isSpecialForm: true,
            produced: form.fn(ast, env)
          }
        } else {
          return result
        }
      },
      {
        isSpecialForm: false,
        produced: undefined
      })

    if (!checkedForSpecialForms.isSpecialForm) {
      const evaledList = evalAST(ast, env)
      debug("EVAL:", ast, env)
      debug("EVAL - evaledList:", evaledList)
      const [fn, ...args] = evaledList.val
      debug("EVAL - fn:", fn)
      debug("EVAL - args:", args)
      if ( types.is(fn, types.FUNCTION) ) {
        const result = fn.val(args, env)
        debug("EVAL ->", result)
        return result
      } else {
        throw {
          name: "CalledNonFunctionError",
          message: "EVAL tried to call the non-function: '"
            + util.inspect(fn) + "'"
        }
      }
    } else {
      debug("EVAL ->", checkedForSpecialForms.produced)
      return checkedForSpecialForms.produced
    }
  }
}

// MAL code to run on startup. Includes some additional function definitions.
const startupMAL = `
(def! not (fn* (a) (if a false true)))
`

rep(startupMAL)

process.stdin.setEncoding('utf8')
process.stdout.write(prompt)
process.stdin.on('data', loop)
