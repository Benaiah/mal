const types = {
  // Type constants
  LIST: "LIST",
  VECTOR: "VECTOR",
  HASHMAP: "HASHMAP",
  INTEGER: "INTEGER",
  SYMBOL: "SYMBOL",
  KEYWORD: "KEYWORD",
  STRING: "STRING",
  COMMENT: "COMMENT"
}

// Construction functions, for convenience
const constructors = {
  list:    (val) => { return { type: types.LIST,    val: val} },
  vector:  (val) => { return { type: types.VECTOR,  val: val} },
  hashmap: (val) => { return { type: types.HASHMAP, val: val} },
  integer: (val) => { return { type: types.INTEGER, val: val} },
  symbol:  (val) => { return { type: types.SYMBOL,  val: val} },
  keyword: (val) => { return { type: types.KEYWORD, val: val} },
  string:  (val) => { return { type: types.STRING,  val: val} },
  comment: (val) => { return { type: types.COMMENT, val: val} }
}

const is = (element, type) => element.type === type

module.exports = Object.assign({}, types, constructors, { is: is })
