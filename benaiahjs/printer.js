/*global module, require*/

const debug = require('./debug.js')
const types = require('./types.js')

const escapeOutput = (str) => str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')

const printStr = (element, readable = true) => {
  const recur = (element) => printStr(element, readable)
  debug("printStr: ", element, readable)
  switch (element.type) {
  case types.FUNCTION:
    return "#<function>"
  case types.INTEGER:
    return element.val.toString()
  case types.BOOL:
    return element.val ? "true" : "false"
  case types.NIL:
    return "nil"
  case types.SYMBOL:
  case types.KEYWORD:
    return element.val
  case types.STRING:
    return (readable
       ? (('"' + escapeOutput(element.val) + '"'))
       : element.val)
  case types.COMMENT:
    return ""
  case types.LIST:
    return ("(" + element.val.map(recur).join(" ") + ")")
  case types.VECTOR:
    return ("[" + element.val.map(recur).join(" ") + "]")
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
