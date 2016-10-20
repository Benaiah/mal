/*global module, require*/

const util = require('util')
const types = require('./types.js')
const debug = require('./DEBUG.js')

const Reader = class {
  constructor (tokens) {
    this.tokens = tokens
    this.position = 0
  }

  // returns the token at the current position and advances the
  // position by 1
  next () {
    const token = this.peek()
    this.position += 1
    return token
  }

  peek () {
    if (this.position > this.tokens.length - 1) {
      throw {
        name: "NoMoreInputError",
        message: "Reader has passed the end of the input. There are"
          + " probably unbalanced parens present in the input."
      }
    }
    return this.tokens[this.position]
  }
}

const tokenizer = (str) => {
  const tokenRegex =
        /[\s,]*(~@|[\[\]{}()'`~^@]|"(?:\\.|[^\\"])*"|;.*|[^\s\[\]{}('"`,;)]*)/g
  const tokens = str.match(tokenRegex)
        .map((str) => str.replace(/,/g, ' ').trim())
        .filter((str) => (str !== ''))
  return tokens
}

const defaultReaderMacros = [
  {
    name: 'quote',
    test: (token) => /^'$/.test(token),
    transform: (token, reader) =>
      types.list([types.symbol("quote"), readForm(reader)])
  },
  {
    name: 'quasiquote',
    test: (token) => /^\`$/.test(token),
    transform: (token, reader) =>
      types.list([types.symbol("quasiquote"), readForm(reader)])
  },
  {
    name: 'splice-unquote',
    test: (token) => /^~@$/.test(token),
    transform: (token, reader) =>
      types.list([types.symbol("splice-unquote"), readForm(reader)])
  },
  {
    name: 'unquote',
    test: (token) => /^~$/.test(token),
    transform: (token, reader) =>
      types.list([types.symbol("unquote"), readForm(reader)])
  },
  {
    name: 'deref',
    test: (token) => /^@$/.test(token),
    transform: (token, reader) =>
      types.list([types.symbol("deref"), readForm(reader)])
  },
  {
    name: 'with-meta',
    test: (token) => /^\^$/.test(token),
    transform: (token, reader) => {
      const firstForm = readForm(reader)
      const secondForm = readForm(reader)
      return types.list([types.symbol("with-meta"), secondForm, firstForm])
    }
  }
]

const applyReaderMacros = (readerMacros, token, reader) => {
  return readerMacros.reduce((result, macro) => {
    let tested = macro.test(result)
    if (tested) {
      debug("applyReaderMacros >", macro.name)
      let transformed = macro.transform(result, reader)
      debug("  ", result, "->", transformed)
      return transformed
    } else {
      return result
    }
  }, token)
}

const readAtom = (reader) => {
  const tests = [
    {
      type: types.INTEGER,
      test: (token) => /^-?\d+$/.test(token),
      val: (token) => parseInt(token, 10)
    },
    {
      type: types.STRING,
      test: (token) => /^\".*?\"$/.test(token),
      val: (token) => token.slice(1, -1)
    },
    {
      type: types.KEYWORD,
      test: (token) => /^:[^\d][^\s]*$/.test(token),
      val: (token) => token
    },
    {
      type: types.BOOL,
      test: (token) => /^true$/.test(token),
      val: (token) => types.t()
    },
    {
      type: types.BOOL,
      test: (token) => /^false$/.test(token),
      val: (token) => types.f()
    },
    {
      type: types.NIL,
      test: (token) => /^nil$/.test(token),
      val: (token) => types.nil()
    },
    {
      type: types.SYMBOL,
      test: (token) => /^[^\d][^\s]*$/.test(token),
      val: (token) => token
    },
    {
      type: types.COMMENT,
      test: (token) => /^;[^\n]*$/.test(token),
      val: (token) => token
    }
  ]

  // Get the token and advance the list
  let token = reader.next()
  debug("readAtom:", token)

  let transformed = applyReaderMacros(defaultReaderMacros, token, reader)
  debug("readAtom (transformed):", transformed)

  let atom = tests.reduce((result, t) => {
    if (result !== token) { return result }

    let tested = t.test(result)

    return tested ? { type: t.type, val: t.val(result) } : result
  }, transformed)

  if (atom === token) { throw 'Could not parse token: "' + token + '"' }
  else {
    debug("readAtom ->", atom)
    return atom
  }
}

const getSetReader = (type, start, end, after = (arg) => arg) => {
  return {
    start: start,
    read: (reader) => {
      debug("readSet" + start + "" + end + ":", reader)
      let reading = true
      let ret = {
        type: type,
        val: []
      }

      let noInputHandler = (e) => {
        if (e.name === "NoMoreInputError") {
          throw {
            name: "UnbalancedParensError",
            message: "Expected '" + end + "', got EOF"
          }
        } else {
          throw { name: "wtf", message: "wtf" }
        }
      }

      let next = () => {
        try { return reader.next() }
        catch (e) { return noInputHandler(e) }
      }

      let peek = () => {
        try { return reader.peek() }
        catch (e) { return noInputHandler(e) }
      }

      let token = next()

      while (reading) {
        // Stop reading if we've reached the end of the list
        let token = peek()
        reading = (token === end) ? false : true;

        if (reading) {
          ret.val.push(readForm(reader))
        } else {
          next()
        }
      }

      debug("readSet" + start + end + " ->", ret)
      return after(ret)
    }
  }
}

const setTypes = [
  getSetReader(types.LIST, "(", ")"),
  getSetReader(types.VECTOR, "[", "]"),
  getSetReader(
    types.HASHMAP, "{", "}",
    (list) => types.hashmap(
      list.val.reduce((result, element, i, lst) => {
        // Skip values, we process them along with the keys
        if (i % 2 === 1) { return result }

        // Keys must be keywords or strings
        if (!(element.type === types.KEYWORD || element.type === types.STRING)) {
          throw {
            name: "BadHashmapKeyError",
            message: "Hashmap key was of type '" + element.type + "'."
          }
        }

        // Every key must have a value
        if (lst[i + 1] === undefined) {
          throw {
            name: "UnbalancedHashmapError",
            message: "Hashmap did not have a value for each key. Key"
              + " without value was '" + element.val + "'."
          }
        }

        const keyString = element.type + ":" + element.val

        result[keyString] = lst[i + 1]
        return result
      }, {})
    )
  )
]

const readForm = (reader) => {
  debug("readForm:", reader)

  const nextToken = reader.peek()

  // Find out if this token starts a known set
  const setReader = setTypes.reduce((result, set) => {
    if (result !== false) { return result }
    if (set.start === nextToken) { return set.read }
    return result
  }, false);

  const ret = (setReader !== false)
    ? setReader(reader)
    : readAtom(reader)

  debug("readForm ->", ret)
  return ret
}

const readStr = (str) => {
  const reader = new Reader(tokenizer(str));
  debug("readStr:", reader)
  let form = readForm(reader)
  return form
}

module.exports = readStr
