import { KEYWORDS } from "./keywords.js";
import { runtimeError } from "./errors.js";
import { MSG } from "./messages.js";

// Signals returned (not thrown) by statements to unwind to the nearest loop.
const BREAK = Symbol("break");
const CONTINUE = Symbol("continue");

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

/** How a value looks when printed or joined into a string. */
export function display(value) {
  if (value === null) return KEYWORDS.NULL;
  if (value === true) return KEYWORDS.TRUE;
  if (value === false) return KEYWORDS.FALSE;
  return String(value);
}

function typeName(value) {
  if (value === null) return KEYWORDS.NULL;
  if (typeof value === "boolean") return `${KEYWORDS.TRUE}/${KEYWORDS.FALSE}`;
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
    this.execAll(program.body, new Scope());
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
          if (this.exec(node.body, scope) === BREAK) break;
        }
        return;
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

  evaluate(node, scope) {
    switch (node.type) {
      case "Literal": return node.value;
      case "Identifier": return scope.get(node.name, node);

      case "Assignment": {
        const current = node.operator === "=" ? undefined : scope.get(node.name, node);
        let value = this.evaluate(node.value, scope);
        if (node.operator !== "=") value = binaryOp(node.operator.slice(0, -1), current, value, node);
        scope.set(node.name, value, node);
        return value;
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
}
