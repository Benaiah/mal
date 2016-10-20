const util = require('util')
const types = require('./types.js')
const debug = require('./debug.js')

class Env {
  constructor (outer, data) {
    this.outer = outer
    this.data = (data === undefined) ? {} : data
  }

  set (key, val) {
    if (!types.is(key, types.SYMBOL) ) {
      throw {
        name: "NonSymbolLookupError",
        message: "Cannot lookup the non-symbol " + util.inspect(key)
      }
    }
    this.data[key.val] = val;
  }

  find (key) {
    if (!types.is(key, types.SYMBOL) ) {
      throw {
        name: "NonSymbolLookupError",
        message: "Cannot lookup the non-symbol " + util.inspect(key)
      }
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
      throw {
        name: "NonSymbolLookupError",
        message: "Cannot lookup the non-symbol " + util.inspect(key)
      }
    }
    debug("Env.get:", key)
    const env = this.find(key)
    const ret = env.data[key.val]
    debug("Env.get ->", ret)
    return ret
  }
}

module.exports = Env
