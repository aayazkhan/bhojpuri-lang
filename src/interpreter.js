import { KEYWORDS, LOOP_WORDS } from "./keywords.js";
import { BhojpuriError, runtimeError } from "./errors.js";
import { MSG } from "./messages.js";
import { tokenize } from "./tokenizer.js";
import { parse } from "./parser.js";
import { Scope } from "./scope.js";
import { createBuiltins } from "./builtins.js";
import {
  UserFunction, NativeFunction, isDict, display, typeName, truthy, checkIndex, checkKey, getEntry,
} from "./values.js";

// Runs a parsed program: statements, expressions, calls and `le aaw`. The values it works
// with are in values.js, variables in scope.js and the built-in functions in builtins.js.

// Marks a file that is still running, to catch files that bring each other in.
const LOADING = Symbol("loading");

// Signals returned (not thrown) by statements to unwind to the nearest loop or function.
const BREAK = Symbol("break");
const CONTINUE = Symbol("continue");

class ReturnSignal {
  constructor(value) {
    this.value = value;
  }
}

// V8/JavaScriptCore throw RangeError; Firefox throws InternalError ("too much recursion").
const isStackOverflow = (err) => err instanceof RangeError || err?.name === "InternalError";

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

/**
 * @typedef {{
 *   print?: (line: string) => void,
 *   maxLoopIterations?: number,
 *   random?: () => number,
 *   input?: (question: string) => string | null,
 *   loadFile?: (path: string, from: string | null) => { id: string, name: string, source: string } | null,
 *   file?: string,
 * }} InterpreterOptions
 *   print: where `bol ho` output goes (defaults to console.log).
 *   maxLoopIterations: guard against infinite loops, e.g. in the browser playground.
 *   random: source of numbers in [0, 1) for `sanyog` (defaults to Math.random; handy for tests).
 *   input: answers `poochh`. It gets the question ("" if none) and returns the answer, or null
 *     when there is nothing more to read. Without it, `poochh` is a runtime error.
 *   loadFile: finds a file for `le aaw`. It gets the path as written and the `id` of the file that
 *     asks for it (`file` for the main program), and returns the file's `id` (e.g. its full path,
 *     used to run each file once), a `name` for error messages and its `source`, or null if there's
 *     no such file. Without it, `le aaw` is a runtime error.
 *   file: the `id` of the main program, so `le aaw` paths can be relative to it.
 */

export class Interpreter {
  /** @param {InterpreterOptions} [options] */
  constructor({
    print = console.log, maxLoopIterations = Infinity, random = Math.random, input = null, loadFile = null, file = null,
  } = {}) {
    this.print = print;
    this.maxLoopIterations = maxLoopIterations;
    this.random = random;
    this.input = input;
    this.loadFile = loadFile;
    this.currentFile = file;
    this.files = new Map(); // id -> the names a file defines, or LOADING while it runs
  }

  run(program) {
    // The main program counts as running, so a file that brings it back in is a loop.
    if (this.currentFile) this.files.set(this.currentFile, LOADING);
    // The program gets its own scope so it can shadow built-in names.
    this.execAll(program.body, this.programScope());
  }

  programScope() {
    const call = (fn, args, node) => this.call(fn, args, node);
    const globals = new Scope();
    for (const fn of createBuiltins({ random: this.random, input: this.input, call })) globals.declare(fn.name, fn);
    return new Scope(globals);
  }

  /**
   * Run the file named by `le aaw` (once, however often it's brought in) and return the names
   * it defines at its top level.
   */
  importFile(node) {
    if (!this.loadFile) throw runtimeError(MSG.noFiles(KEYWORDS.IMPORT), node);
    const file = this.loadFile(node.path, this.currentFile);
    if (!file) throw runtimeError(MSG.fileNotFound(node.path), node);

    const known = this.files.get(file.id);
    if (known === LOADING) throw runtimeError(MSG.circularImport(node.path), node);
    if (known) return known;

    this.files.set(file.id, LOADING);
    const outerFile = this.currentFile;
    this.currentFile = file.id;
    try {
      // Tokens from this file remember it, so errors from its code name it, even when one of its
      // functions fails much later.
      const tokens = tokenize(file.source, { file: { name: file.name, source: file.source } });
      const scope = this.programScope();
      this.execAll(parse(tokens).body, scope);
      const names = new Map(scope.vars);
      this.files.set(file.id, names);
      return names;
    } catch (err) {
      this.files.delete(file.id);
      throw err;
    } finally {
      this.currentFile = outerFile;
    }
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

      case "Import":
        for (const [name, value] of this.importFile(node)) {
          if (scope.vars.has(name) && scope.vars.get(name) !== value && !scope.allowRedeclare) {
            throw runtimeError(MSG.importClash(name, node.path), node);
          }
          scope.vars.set(name, value);
        }
        return;

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

      case "FunctionExpression": return new UserFunction(node, scope);

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
      throw runtimeError(MSG.wrongArgCount(callee.name ?? KEYWORDS.FUNCTION, callee.params.length, args.length), node);
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
