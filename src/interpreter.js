import { KEYWORDS, LOOP_WORDS, BUILTINS } from "./keywords.js";
import { BhojpuriError, runtimeError } from "./errors.js";
import { MSG } from "./messages.js";

// Signals returned (not thrown) by statements to unwind to the nearest loop or function.
const BREAK = Symbol("break");
const CONTINUE = Symbol("continue");

class ReturnSignal {
  constructor(value) {
    this.value = value;
  }
}

class Scope {
  constructor(parent = null) {
    this.parent = parent;
    this.vars = new Map();
    // At the interactive prompt, `maan la x = ...` may be typed again to start over.
    this.allowRedeclare = false;
  }

  declare(name, value, node) {
    if (this.vars.has(name) && !this.allowRedeclare) throw runtimeError(MSG.alreadyDeclared(name), node);
    this.vars.set(name, value);
  }

  owner(name, node) {
    for (let scope = this; scope; scope = scope.parent) {
      if (scope.vars.has(name)) return scope;
    }
    throw runtimeError(MSG.notDeclared(name), node);
  }

  get(name, node) {
    return this.owner(name, node).vars.get(name);
  }

  set(name, value, node) {
    this.owner(name, node).vars.set(name, value);
  }
}

/** A function defined with `kaam`; it closes over the scope it was defined in. */
class UserFunction {
  constructor(node, closure) {
    this.name = node.name;
    this.params = node.params;
    this.body = node.body;
    this.closure = closure;
  }
}

class NativeFunction {
  /** `arity` is how many arguments it takes; `minArity` is lower when the last ones are optional. */
  constructor(name, arity, impl, minArity = arity) {
    this.name = name;
    this.arity = arity;
    this.minArity = minArity;
    this.impl = impl;
  }
}

// V8/JavaScriptCore throw RangeError; Firefox throws InternalError ("too much recursion").
const isStackOverflow = (err) => err instanceof RangeError || err?.name === "InternalError";

const isFunction = (value) => value instanceof UserFunction || value instanceof NativeFunction;

// A dictionary (`kosh`) is a JS Map: it keeps keys in the order they were added,
// and 1 and "1" stay different keys.
const isDict = (value) => value instanceof Map;

/** How a value looks when printed or joined into a string. */
export function display(value, seen = new Set()) {
  if (value === null) return KEYWORDS.NULL;
  if (value === true) return KEYWORDS.TRUE;
  if (value === false) return KEYWORDS.FALSE;
  if (isFunction(value)) return `<${KEYWORDS.FUNCTION} ${value.name}>`;
  if (Array.isArray(value) || isDict(value)) {
    if (seen.has(value)) return Array.isArray(value) ? "[...]" : "{...}";
    seen.add(value);
    // Inside a list or kosh, strings keep their quotes so ["1"] and [1] look different.
    const inner = (item) => (typeof item === "string" ? JSON.stringify(item) : display(item, seen));
    const text = Array.isArray(value)
      ? `[${value.map(inner).join(", ")}]`
      : `{${[...value].map(([key, item]) => `${inner(key)}: ${inner(item)}`).join(", ")}}`;
    seen.delete(value);
    return text;
  }
  // Numbers are shown to 15 significant digits, so 0.1 + 0.2 shows as 0.3 rather than
  // 0.30000000000000004. Only the display is rounded; the value itself is unchanged.
  if (typeof value === "number" && !Number.isInteger(value)) return String(Number(value.toPrecision(15)));
  return String(value);
}

function typeName(value) {
  if (value === null) return KEYWORDS.NULL;
  if (typeof value === "boolean") return `${KEYWORDS.TRUE}/${KEYWORDS.FALSE}`;
  if (Array.isArray(value)) return "list";
  if (isDict(value)) return "kosh";
  if (isFunction(value)) return KEYWORDS.FUNCTION;
  return typeof value;
}

const truthy = (value) => value !== null && value !== false && value !== 0 && value !== "" && !Number.isNaN(value);

function binaryOp(op, a, b, node) {
  const numbers = typeof a === "number" && typeof b === "number";
  const strings = typeof a === "string" && typeof b === "string";

  switch (op) {
    case "==": return a === b;
    case "!=": return a !== b;
    case "+":
      if (numbers) return a + b;
      if (typeof a === "string" || typeof b === "string") return display(a) + display(b);
      break;
    case "-": if (numbers) return a - b; break;
    case "*": if (numbers) return a * b; break;
    case "/":
    case "%":
      if (numbers) {
        if (b === 0) throw runtimeError(MSG.divideByZero(), node);
        return op === "/" ? a / b : a % b;
      }
      break;
    case "<": if (numbers || strings) return a < b; break;
    case ">": if (numbers || strings) return a > b; break;
    case "<=": if (numbers || strings) return a <= b; break;
    case ">=": if (numbers || strings) return a >= b; break;
  }
  throw runtimeError(MSG.badOperands(op, typeName(a), typeName(b)), node);
}

/** Validate `object[index]` and return the index as a number. */
function checkIndex(object, index, node) {
  if (!Array.isArray(object) && typeof object !== "string") {
    throw runtimeError(MSG.notIndexable(typeName(object)), node);
  }
  if (!Number.isInteger(index)) throw runtimeError(MSG.badIndex(display(index)), node);
  if (index < 0 || index >= object.length) throw runtimeError(MSG.indexOutOfRange(index, object.length), node);
  return index;
}

// What `kism` returns for each kind of value.
function kindName(value) {
  if (typeof value === "number") return "sankhya";
  if (typeof value === "string") return "shabd";
  return typeName(value);
}

/** Validate a kosh key: only strings and numbers can be keys. */
function checkKey(key, node) {
  if (typeof key !== "string" && typeof key !== "number") throw runtimeError(MSG.badKey(typeName(key)), node);
  return key;
}

/** Read `dict[key]`, which must already exist. */
function getEntry(dict, key, node) {
  if (!dict.has(checkKey(key, node))) {
    throw runtimeError(MSG.missingKey(typeof key === "string" ? JSON.stringify(key) : String(key)), node);
  }
  return dict.get(key);
}

function createGlobals({ random, input }) {
  const globals = new Scope();
  const expectList = (name, value, node) => {
    if (!Array.isArray(value)) throw runtimeError(MSG.builtinArgType(name, "list", typeName(value)), node);
  };
  const expectNumber = (name, value, node) => {
    if (typeof value !== "number") throw runtimeError(MSG.builtinArgType(name, "sankhya", typeName(value)), node);
  };
  const expectInteger = (name, value, node) => {
    if (!Number.isInteger(value)) throw runtimeError(MSG.builtinArgType(name, "pura sankhya", display(value)), node);
  };
  const expectDict = (name, value, node) => {
    if (!isDict(value)) throw runtimeError(MSG.builtinArgType(name, "kosh", typeName(value)), node);
  };
  const expectListOrString = (name, value, node) => {
    if (!Array.isArray(value) && typeof value !== "string") {
      throw runtimeError(MSG.builtinArgType(name, "list ya string", typeName(value)), node);
    }
  };
  const expectString = (name, value, node) => {
    if (typeof value !== "string") throw runtimeError(MSG.builtinArgType(name, "string", typeName(value)), node);
  };

  const builtins = [
    new NativeFunction(BUILTINS.LENGTH, 1, ([value], node) => {
      if (Array.isArray(value) || typeof value === "string") return value.length;
      if (isDict(value)) return value.size;
      throw runtimeError(MSG.builtinArgType(BUILTINS.LENGTH, "list, string ya kosh", typeName(value)), node);
    }),
    new NativeFunction(BUILTINS.PUSH, 2, ([list, value], node) => {
      expectList(BUILTINS.PUSH, list, node);
      list.push(value);
      return list;
    }),
    new NativeFunction(BUILTINS.POP, 1, ([list], node) => {
      expectList(BUILTINS.POP, list, node);
      return list.length ? list.pop() : null;
    }),
    new NativeFunction(BUILTINS.TO_NUMBER, 1, ([value], node) => {
      if (typeof value === "number") return value;
      expectString(BUILTINS.TO_NUMBER, value, node);
      const number = value.trim() === "" ? NaN : Number(value);
      if (!Number.isFinite(number)) throw runtimeError(MSG.notANumber(value), node);
      return number;
    }),
    new NativeFunction(BUILTINS.TO_STRING, 1, ([value]) => display(value)),
    new NativeFunction(BUILTINS.TYPE, 1, ([value]) => kindName(value)),
    new NativeFunction(BUILTINS.ROUND, 1, ([value], node) => {
      expectNumber(BUILTINS.ROUND, value, node);
      return Math.round(value);
    }),
    new NativeFunction(BUILTINS.FLOOR, 1, ([value], node) => {
      expectNumber(BUILTINS.FLOOR, value, node);
      return Math.floor(value);
    }),
    new NativeFunction(BUILTINS.RANDOM, 2, ([low, high], node) => {
      expectInteger(BUILTINS.RANDOM, low, node);
      expectInteger(BUILTINS.RANDOM, high, node);
      if (low > high) throw runtimeError(MSG.badRange(BUILTINS.RANDOM, low, high), node);
      return low + Math.floor(random() * (high - low + 1));
    }),
    new NativeFunction(BUILTINS.UPPER, 1, ([text], node) => {
      expectString(BUILTINS.UPPER, text, node);
      return text.toUpperCase();
    }),
    new NativeFunction(BUILTINS.LOWER, 1, ([text], node) => {
      expectString(BUILTINS.LOWER, text, node);
      return text.toLowerCase();
    }),
    new NativeFunction(BUILTINS.SPLIT, 2, ([text, separator], node) => {
      expectString(BUILTINS.SPLIT, text, node);
      expectString(BUILTINS.SPLIT, separator, node);
      return text.split(separator);
    }),
    new NativeFunction(BUILTINS.JOIN, 2, ([list, separator], node) => {
      expectList(BUILTINS.JOIN, list, node);
      expectString(BUILTINS.JOIN, separator, node);
      return list.map((item) => display(item)).join(separator);
    }),
    // A new sorted list; the original is left as it was.
    new NativeFunction(BUILTINS.SORT, 1, ([list], node) => {
      expectList(BUILTINS.SORT, list, node);
      const kind = typeof list[0];
      for (const item of list) {
        if ((typeof item !== "number" && typeof item !== "string") || typeof item !== kind) {
          throw runtimeError(MSG.cantSort(BUILTINS.SORT, typeName(list[0]), typeName(item)), node);
        }
      }
      return [...list].sort(kind === "number" ? (a, b) => a - b : (a, b) => (a < b ? -1 : a > b ? 1 : 0));
    }),
    new NativeFunction(BUILTINS.REVERSE, 1, ([value], node) => {
      expectListOrString(BUILTINS.REVERSE, value, node);
      return Array.isArray(value) ? [...value].reverse() : value.split("").reverse().join("");
    }),
    // Like JS slice: `end` is left out (optional), negative numbers count from the end,
    // and numbers past either end are clamped.
    new NativeFunction(BUILTINS.SLICE, 3, ([value, start, end], node) => {
      expectListOrString(BUILTINS.SLICE, value, node);
      expectInteger(BUILTINS.SLICE, start, node);
      if (end !== undefined) expectInteger(BUILTINS.SLICE, end, node);
      return value.slice(start, end);
    }, 2),
    new NativeFunction(BUILTINS.FIND, 2, ([container, item], node) => {
      expectListOrString(BUILTINS.FIND, container, node);
      if (typeof container === "string") expectString(BUILTINS.FIND, item, node);
      return container.indexOf(item);
    }),
    new NativeFunction(BUILTINS.SUM, 1, ([list], node) => {
      expectList(BUILTINS.SUM, list, node);
      let total = 0;
      for (const item of list) {
        if (typeof item !== "number") throw runtimeError(MSG.builtinArgType(BUILTINS.SUM, "sankhya ke list", `${typeName(item)} bhi`), node);
        total += item;
      }
      return total;
    }),
    // The question is optional. The answer is always text, or khaali when there is
    // nothing more to read (end of input, or Cancel in the playground).
    new NativeFunction(BUILTINS.INPUT, 1, ([question], node) => {
      if (!input) throw runtimeError(MSG.noInput(BUILTINS.INPUT), node);
      const answer = input(question === undefined ? "" : display(question));
      return answer === null || answer === undefined ? null : String(answer);
    }, 0),
    new NativeFunction(BUILTINS.KEYS, 1, ([dict], node) => {
      expectDict(BUILTINS.KEYS, dict, node);
      return [...dict.keys()];
    }),
    // A kosh has the key, a list has the item, or a string has the piece of text.
    new NativeFunction(BUILTINS.HAS, 2, ([container, item], node) => {
      if (isDict(container)) return container.has(checkKey(item, node));
      if (Array.isArray(container)) return container.includes(item);
      if (typeof container === "string") {
        expectString(BUILTINS.HAS, item, node);
        return container.includes(item);
      }
      throw runtimeError(MSG.builtinArgType(BUILTINS.HAS, "kosh, list ya string", typeName(container)), node);
    }),
    new NativeFunction(BUILTINS.REMOVE, 2, ([dict, key], node) => {
      expectDict(BUILTINS.REMOVE, dict, node);
      if (!dict.has(checkKey(key, node))) return null;
      const value = dict.get(key);
      dict.delete(key);
      return value;
    }),
  ];
  for (const fn of builtins) globals.declare(fn.name, fn);
  return globals;
}

/**
 * @typedef {{
 *   print?: (line: string) => void,
 *   maxLoopIterations?: number,
 *   random?: () => number,
 *   input?: (question: string) => string | null,
 * }} InterpreterOptions
 *   print: where `bol ho` output goes (defaults to console.log).
 *   maxLoopIterations: guard against infinite loops, e.g. in the browser playground.
 *   random: source of numbers in [0, 1) for `sanyog` (defaults to Math.random; handy for tests).
 *   input: answers `poochh`. It gets the question ("" if none) and returns the answer, or null
 *     when there is nothing more to read. Without it, `poochh` is a runtime error.
 */

export class Interpreter {
  /** @param {InterpreterOptions} [options] */
  constructor({ print = console.log, maxLoopIterations = Infinity, random = Math.random, input = null } = {}) {
    this.print = print;
    this.maxLoopIterations = maxLoopIterations;
    this.random = random;
    this.input = input;
  }

  run(program) {
    // The program gets its own scope so it can shadow built-in names.
    this.execAll(program.body, this.programScope());
  }

  programScope() {
    return new Scope(createGlobals({ random: this.random, input: this.input }));
  }

  /** A scope for the interactive prompt: it lasts between inputs, and names can be declared again. */
  sessionScope() {
    const scope = this.programScope();
    scope.allowRedeclare = true;
    return scope;
  }

  /**
   * Run statements from the prompt in `scope`. Returns the value of the last statement when it
   * is an expression other than an assignment (like `2 + 3` or `naam`), and undefined otherwise.
   */
  runInteractive(statements, scope) {
    let result;
    for (const statement of statements) {
      result = undefined;
      if (statement.type === "ExpressionStatement" && statement.expression.type !== "Assignment") {
        result = this.evaluate(statement.expression, scope);
      } else {
        this.exec(statement, scope);
      }
    }
    return result;
  }

  execAll(statements, scope) {
    for (const statement of statements) {
      const signal = this.exec(statement, scope);
      if (signal) return signal;
    }
  }

  exec(node, scope) {
    switch (node.type) {
      case "Let":
        for (const decl of node.declarations) {
          scope.declare(decl.name, decl.init ? this.evaluate(decl.init, scope) : null, decl);
        }
        return;

      case "Print":
        this.print(node.args.map((arg) => display(this.evaluate(arg, scope))).join(" "));
        return;

      case "If":
        if (truthy(this.evaluate(node.test, scope))) return this.exec(node.consequent, scope);
        if (node.alternate) return this.exec(node.alternate, scope);
        return;

      case "While": {
        let iterations = 0;
        while (truthy(this.evaluate(node.test, scope))) {
          if (++iterations > this.maxLoopIterations) {
            throw runtimeError(MSG.tooManyIterations(this.maxLoopIterations), node);
          }
          const signal = this.exec(node.body, scope);
          if (signal === BREAK) break;
          if (signal instanceof ReturnSignal) return signal;
        }
        return;
      }

      case "ForRange": return this.runFor(node, this.rangeValues(node, scope), scope);
      case "ForEach": return this.runFor(node, this.eachValues(node, scope), scope);

      case "Function":
        scope.declare(node.name, new UserFunction(node, scope), node);
        return;

      case "Return":
        return new ReturnSignal(node.argument ? this.evaluate(node.argument, scope) : null);

      case "Try":
        try {
          return this.exec(node.body, scope);
        } catch (err) {
          // Only runtime errors can be caught; anything else is a bug in the interpreter.
          if (!(err instanceof BhojpuriError) || err.kind !== "RuntimeError") throw err;
          const handlerScope = new Scope(scope);
          if (node.param) {
            handlerScope.declare(node.param, Object.hasOwn(err, "value") ? err.value : err.message, node);
          }
          return this.exec(node.handler, handlerScope);
        }

      case "Throw": {
        const value = this.evaluate(node.argument, scope);
        const err = runtimeError(MSG.thrown(display(value)), node);
        err.value = value; // what `galti pe (g)` receives, unchanged
        throw err;
      }

      case "Break": return BREAK;
      case "Continue": return CONTINUE;
      case "Block": return this.execAll(node.body, new Scope(scope));
      case "Empty": return;

      case "ExpressionStatement":
        this.evaluate(node.expression, scope);
        return;

      default:
        throw new Error(`Unknown statement type: ${node.type}`);
    }
  }

  /** Run a `har` loop body once per value, each time with a fresh loop variable. */
  runFor(node, values, scope) {
    let iterations = 0;
    for (const value of values) {
      if (++iterations > this.maxLoopIterations) {
        throw runtimeError(MSG.tooManyIterations(this.maxLoopIterations), node);
      }
      const loopScope = new Scope(scope);
      loopScope.declare(node.name, value, node);
      const signal = this.exec(node.body, loopScope);
      if (signal === BREAK) break;
      if (signal instanceof ReturnSignal) return signal;
    }
  }

  // The bounds are read once, before the loop starts. Values are computed as
  // from + k * step so that fractional steps don't pile up rounding errors. With a
  // fractional start or step, each value is rounded to 15 significant digits so
  // 3 * 0.1 comes out as 0.3 (not 0.30000000000000004) and the end stays inclusive.
  *rangeValues(node, scope) {
    const bound = (expr, word) => {
      const value = this.evaluate(expr, scope);
      if (typeof value !== "number") throw runtimeError(MSG.loopBoundNotNumber(word, typeName(value)), expr);
      return value;
    };
    const from = bound(node.from, LOOP_WORDS.FROM);
    const to = bound(node.to, LOOP_WORDS.TO);
    const step = node.step ? bound(node.step, LOOP_WORDS.STEP) : 1;
    if (step === 0) throw runtimeError(MSG.zeroStep(), node.step);

    const whole = Number.isInteger(from) && Number.isInteger(step);
    for (let k = 0; ; k++) {
      const value = whole ? from + k * step : Number((from + k * step).toPrecision(15));
      if (step > 0 ? value > to : value < to) return;
      yield value;
    }
  }

  // Loops over a copy (of a kosh's keys), so adding to or removing from the list
  // inside the loop doesn't change which items are visited.
  eachValues(node, scope) {
    const value = this.evaluate(node.iterable, scope);
    if (Array.isArray(value)) return [...value];
    if (typeof value === "string") return value.split("");
    if (isDict(value)) return [...value.keys()];
    throw runtimeError(MSG.notIterable(typeName(value)), node.iterable);
  }

  evaluate(node, scope) {
    switch (node.type) {
      case "Literal": return node.value;
      case "Identifier": return scope.get(node.name, node);
      case "ListLiteral": return node.elements.map((element) => this.evaluate(element, scope));

      case "Template":
        return node.parts.map((part) => (typeof part === "string" ? part : display(this.evaluate(part, scope)))).join("");

      case "DictLiteral": {
        const dict = new Map();
        for (const entry of node.entries) {
          const key = checkKey(this.evaluate(entry.key, scope), entry.key);
          dict.set(key, this.evaluate(entry.value, scope));
        }
        return dict;
      }
      case "Assignment": return this.assign(node, scope);

      case "Index": {
        const object = this.evaluate(node.object, scope);
        const index = this.evaluate(node.index, scope);
        if (isDict(object)) return getEntry(object, index, node);
        return object[checkIndex(object, index, node)];
      }

      case "Call": {
        const callee = this.evaluate(node.callee, scope);
        const args = node.args.map((arg) => this.evaluate(arg, scope));
        return this.call(callee, args, node);
      }

      case "Logical": {
        const left = this.evaluate(node.left, scope);
        if (node.operator === "&&") return truthy(left) ? this.evaluate(node.right, scope) : left;
        return truthy(left) ? left : this.evaluate(node.right, scope);
      }

      case "Binary":
        return binaryOp(node.operator, this.evaluate(node.left, scope), this.evaluate(node.right, scope), node);

      case "Unary": {
        const value = this.evaluate(node.argument, scope);
        if (node.operator === "!") return !truthy(value);
        if (typeof value !== "number") throw runtimeError(MSG.badOperand(node.operator, typeName(value)), node);
        return node.operator === "-" ? -value : value;
      }

      default:
        throw new Error(`Unknown expression type: ${node.type}`);
    }
  }

  assign(node, scope) {
    const { target, operator } = node;
    const compound = operator !== "=";
    const combine = (current, value) => (compound ? binaryOp(operator.slice(0, -1), current, value, node) : value);

    if (target.type === "Identifier") {
      const current = compound ? scope.get(target.name, target) : undefined;
      const value = combine(current, this.evaluate(node.value, scope));
      scope.set(target.name, value, target);
      return value;
    }

    // Index target: evaluate the list and index before the right-hand side, like JS.
    const object = this.evaluate(target.object, scope);
    if (typeof object === "string") throw runtimeError(MSG.stringImmutable(), target);

    if (isDict(object)) {
      // `d[k] = v` adds or replaces a key; `d[k] += v` needs the key to exist already.
      const key = checkKey(this.evaluate(target.index, scope), target);
      const current = compound ? getEntry(object, key, target) : undefined;
      const value = combine(current, this.evaluate(node.value, scope));
      object.set(key, value);
      return value;
    }

    const index = checkIndex(object, this.evaluate(target.index, scope), target);
    const current = compound ? object[index] : undefined;
    const value = combine(current, this.evaluate(node.value, scope));
    object[index] = value;
    return value;
  }

  call(callee, args, node) {
    if (callee instanceof NativeFunction) {
      if (args.length < callee.minArity || args.length > callee.arity) {
        const expected = callee.minArity === callee.arity ? callee.arity : `${callee.minArity} ya ${callee.arity}`;
        throw runtimeError(MSG.wrongArgCount(callee.name, expected, args.length), node);
      }
      return callee.impl(args, node);
    }

    if (!(callee instanceof UserFunction)) throw runtimeError(MSG.notAFunction(typeName(callee)), node);
    if (args.length !== callee.params.length) {
      throw runtimeError(MSG.wrongArgCount(callee.name, callee.params.length, args.length), node);
    }

    const scope = new Scope(callee.closure);
    callee.params.forEach((param, i) => scope.declare(param, args[i], node));

    try {
      const signal = this.execAll(callee.body.body, scope);
      return signal instanceof ReturnSignal ? signal.value : null;
    } catch (err) {
      // How deep recursion can go depends on the JS engine, so rather than guess a
      // limit we translate the engine's own stack overflow into a Bhojpuri error.
      if (isStackOverflow(err)) throw runtimeError(MSG.tooDeep(), node);
      throw err;
    }
  }
}
