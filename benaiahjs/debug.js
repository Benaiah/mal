// Toggle this to toggle debugging
const DEBUG = (process.env.DEBUG !== undefined &&
               (process.env.DEBUG.toLowerCase === "true" ||
                process.env.DEBUG === "1"))
const debug = DEBUG ? console.log.bind(console) : () => {};

module.exports = debug

