// Type constants
const types = {
  LIST: "LIST",
  FUNCTION: "FUNCTION",
  VECTOR: "VECTOR",
  HASHMAP: "HASHMAP",
  INTEGER: "INTEGER",
  SYMBOL: "SYMBOL",
  KEYWORD: "KEYWORD",
  STRING: "STRING",
  NIL: "NIL",
  BOOL: "BOOL",
  COMMENT: "COMMENT"
}

const nil = {
  type: types.NIL,
  val: []
}

const bools = {
  t: {
    type: types.BOOL,
    val: true
  },
  f: {
    type: types.BOOL,
    val: false
  }
}

// Construction functions, for convenience
const constructors = {
  list:    (val) => { return { type: types.LIST, val: val } },
  fn:      (val) => { return { type: types.FUNCTION, val: val } },
  vector:  (val) => { return { type: types.VECTOR,   val: val } },
  hashmap: (val) => { return { type: types.HASHMAP,  val: val } },
  integer: (val) => { return { type: types.INTEGER,  val: val } },
  symbol:  (val) => { return { type: types.SYMBOL,   val: val } },
  keyword: (val) => { return { type: types.KEYWORD,  val: val } },
  string:  (val) => { return { type: types.STRING,   val: val } },
  comment: (val) => { return { type: types.COMMENT,  val: val } },
  nil:     ()    => { return nil },
  t:       ()    => { return bools.t },
  f:       ()    => { return bools.f },
  bool:    (val) => { return (val === true) ? bools.t : bools.f }
}

const is = (element, type) => element.type === type

module.exports = Object.assign({}, types, constructors, { is: is })
