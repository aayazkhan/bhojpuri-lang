import { KEYWORDS, BUILTINS } from "./keywords.js";
import { runtimeError } from "./errors.js";
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
  }

  declare(name, value, node) {
    if (this.vars.has(name)) throw runtimeError(MSG.alreadyDeclared(name), node);
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
  constructor(name, arity, impl) {
    this.name = name;
    this.arity = arity;
    this.impl = impl;
  }
}

// V8/JavaScriptCore throw RangeError; Firefox throws InternalError ("too much recursion").
const isStackOverflow = (err) => err instanceof RangeError || err?.name === "InternalError";

const isFunction = (value) => value instanceof UserFunction || value instanceof NativeFunction;

/** How a value looks when printed or joined into a string. */
export function display(value, seen = new Set()) {
  if (value === null) return KEYWORDS.NULL;
  if (value === true) return KEYWORDS.TRUE;
  if (value === false) return KEYWORDS.FALSE;
  if (isFunction(value)) return `<${KEYWORDS.FUNCTION} ${value.name}>`;
  if (Array.isArray(value)) {
    if (seen.has(value)) return "[...]";
    seen.add(value);
    const items = value.map((item) => (typeof item === "string" ? JSON.stringify(item) : display(item, seen)));
    seen.delete(value);
    return `[${items.join(", ")}]`;
  }
  return String(value);
}

function typeName(value) {
  if (value === null) return KEYWORDS.NULL;
  if (typeof value === "boolean") return `${KEYWORDS.TRUE}/${KEYWORDS.FALSE}`;
  if (Array.isArray(value)) return "list";
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

function createGlobals() {
  const globals = new Scope();
  const expectList = (name, value, node) => {
    if (!Array.isArray(value)) throw runtimeError(MSG.builtinArgType(name, "list", typeName(value)), node);
  };

  const builtins = [
    new NativeFunction(BUILTINS.LENGTH, 1, ([value], node) => {
      if (Array.isArray(value) || typeof value === "string") return value.length;
      throw runtimeError(MSG.builtinArgType(BUILTINS.LENGTH, "list ya string", typeName(value)), node);
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
  ];
  for (const fn of builtins) globals.declare(fn.name, fn);
  return globals;
}

export class Interpreter {
  /**
   * @param {{ print?: (line: string) => void, maxLoopIterations?: number }} [options]
   *   print: where `bol ho` output goes (defaults to console.log).
   *   maxLoopIterations: guard against infinite loops, e.g. in the browser playground.
   */
  constructor({ print = console.log, maxLoopIterations = Infinity } = {}) {
    this.print = print;
    this.maxLoopIterations = maxLoopIterations;
  }

  run(program) {
    // The program gets its own scope so it can shadow built-in names.
    this.execAll(program.body, new Scope(createGlobals()));
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

      case "Function":
        scope.declare(node.name, new UserFunction(node, scope), node);
        return;

      case "Return":
        return new ReturnSignal(node.argument ? this.evaluate(node.argument, scope) : null);

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

  evaluate(node, scope) {
    switch (node.type) {
      case "Literal": return node.value;
      case "Identifier": return scope.get(node.name, node);
      case "ListLiteral": return node.elements.map((element) => this.evaluate(element, scope));
      case "Assignment": return this.assign(node, scope);

      case "Index": {
        const object = this.evaluate(node.object, scope);
        const index = checkIndex(object, this.evaluate(node.index, scope), node);
        return object[index];
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
    const index = checkIndex(object, this.evaluate(target.index, scope), target);
    const current = compound ? object[index] : undefined;
    const value = combine(current, this.evaluate(node.value, scope));
    object[index] = value;
    return value;
  }

  call(callee, args, node) {
    if (callee instanceof NativeFunction) {
      if (args.length !== callee.arity) throw runtimeError(MSG.wrongArgCount(callee.name, callee.arity, args.length), node);
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
