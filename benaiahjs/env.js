const util = require('util')
const types = require('./types.js')
const debug = require('./debug.js')

const nonSymbolBindingError = (it) => { return {
  name: "NonSymbolBindingError",
  message: "Cannot bind the non-symbol " + util.inspect(it)
} }

const nonSymbolLookupError = (it) => { return {
  name: "NonSymbolBindingError",
  message: "Cannot bind the non-symbol " + util.inspect(it)
} }

class Env {
  constructor (outer, binds=[], exprs=[]) {
    debug("new Env:", outer, binds, exprs)
    this.outer = outer
    this.data = binds.reduce((result, bind, i) => {
      // Short circuit if the rest arg has already been bound
      if (result.restArgBound) { return result }

      if (!types.is(bind, types.SYMBOL) ) {
        throw nonSymbolBindingError(bind)
      }

      if (bind.val === "&") {
        result.restArgBound = true
        const restArg = binds[i+1]
        const restExprs = exprs.slice(i)

        if (restArg === undefined) { throw {
          name: "UnnamedRestArgError",
          message: "Tried to bind the rest arg of an environment"
            + " without a following symbol to bind the rest arguments to."
        } }

        debug("new Env - rest arg:", restArg, restExprs)
        result.data[restArg.val] = types.list(restExprs)
        return result
      } else {
        const expr = exprs[i]
        debug("new Env - regular arg:", bind.val, expr)
        result.data[bind.val] = expr
        return result
      }
    }, { restArgBound: false, data: {} }).data
    debug("new Env ->", this)
  }

  set (key, val) {
    if (!types.is(key, types.SYMBOL) ) {
      throw nonSymbolBindingError(key)
    }
    this.data[key.val] = val;
  }

  find (key) {
    if (!types.is(key, types.SYMBOL) ) {
      throw nonSymbolLookupError(key)
    }
    if (this.data[key.val] !== undefined) {
      return this
    } else {
      if (this.outer !== types.nil()) {
        return this.outer.find(key)
      } else {
        throw {
          name: "SymbolNotFoundError",
          message: "There was no variable value for the symbol '"
            + key.val + "'."
        }
      }
    }
  }

  get (key) {
    if (!types.is(key, types.SYMBOL) ) {
      throw nonSymbolLookupError(key)
    }
    debug("Env.get:", key)
    const env = this.find(key)
    const ret = env.data[key.val]
    debug("Env.get ->", ret)
    return ret
  }
}

const bind = (obj, makeSymbolsOfKeys=true) =>
      Object.keys(obj).reduce((result, key, i) => {
        const k = makeSymbolsOfKeys
              ? types.symbol(key)
              : key
        result[0][i] = k
        result[1][i] = obj[key]
        return result
      }, [[], []])

module.exports = {Env, bind}
