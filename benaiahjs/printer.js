/*global module, require*/

const debug = require('./debug.js')
const types = require('./types.js')

const printStr = (element) => {
  debug("printStr: ", element)
  switch (element.type) {
  case types.INTEGER:
    return element.val.toString()
  case types.SYMBOL:
  case types.KEYWORD:
    return element.val
  case types.STRING:
    return '"' + element.val + '"'
  case types.COMMENT:
    return ""
  case types.LIST:
    return ("(" + element.val.map(printStr).join(" ") + ")")
  case types.VECTOR:
    return ("[" + element.val.map(printStr).join(" ") + "]")
  case types.HASHMAP:
    return ("{" + Object.keys(element.val).map((key) => {
      let pieces = key.split(/:(.+)?/)
      let keyAST = {
        type: pieces[0],
        val: pieces[1]
      }
      return printStr(keyAST) + " " + printStr(element.val[key])
    }).join(" ") + "}")
  }

  throw 'Could not print data structure of type "' + element.type + '"'
}

module.exports = printStr
