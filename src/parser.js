import { syntaxError } from "./errors.js";
import { MSG } from "./messages.js";

/*
 * Grammar (recursive descent):
 *
 *   program    := PROGRAM_START statement* PROGRAM_END
 *   statement  := let | print | if | while | function | return
 *               | BREAK ";" | CONTINUE ";" | block | ";" | expr ";"
 *   let        := LET IDENT ("=" expr)? ("," IDENT ("=" expr)?)* ";"
 *   print      := PRINT expr ("," expr)* ";"
 *   if         := IF "(" expr ")" block (ELSE_IF "(" expr ")" block)* (ELSE block)?
 *   while      := WHILE "(" expr ")" block
 *   function   := FUNCTION IDENT "(" (IDENT ("," IDENT)*)? ")" block
 *   return     := RETURN expr? ";"
 *   block      := "{" statement* "}"
 *
 *   expr       := target ("=" | "+=" | "-=" | "*=" | "/=" | "%=") expr | or
 *   target     := IDENT | postfix "[" expr "]"
 *   or         := and ("||" and)*
 *   and        := equality ("&&" equality)*
 *   equality   := comparison (("==" | "!=") comparison)*
 *   comparison := additive (("<" | ">" | "<=" | ">=") additive)*
 *   additive   := term (("+" | "-") term)*
 *   term       := unary (("*" | "/" | "%") unary)*
 *   unary      := ("!" | "-" | "+") unary | postfix
 *   postfix    := primary ("(" args? ")" | "[" expr "]")*
 *   args       := expr ("," expr)*
 *   primary    := NUMBER | STRING | TRUE | FALSE | NULL | IDENT | "(" expr ")"
 *               | "[" (expr ("," expr)* ","?)? "]"
 */

const ASSIGNMENT_OPS = new Set(["=", "+=", "-=", "*=", "/=", "%="]);
const BINARY_LEVELS = [["||"], ["&&"], ["==", "!="], ["<", ">", "<=", ">="], ["+", "-"], ["*", "/", "%"]];
const LITERAL_KEYWORDS = { TRUE: true, FALSE: false, NULL: null };

const pos = (token) => ({ line: token.line, col: token.col });
const describe = (token) =>
  token.type === "eof" ? MSG.things.endOfFile : MSG.quote(token.text);

/**
 * @param {import("./tokenizer.js").Token[]} tokens
 */
export function parse(tokens) {
  return new Parser(tokens).parseProgram();
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.i = 0;
    this.loopDepth = 0;
    this.functionDepth = 0;
  }

  // ---- token helpers ----

  peek() {
    return this.tokens[this.i];
  }

  next() {
    const token = this.tokens[this.i];
    if (token.type !== "eof") this.i++;
    return token;
  }

  isKeyword(id) {
    const t = this.peek();
    return t.type === "keyword" && t.value === id;
  }

  isPunct(p) {
    const t = this.peek();
    return t.type === "punct" && t.value === p;
  }

  expectPunct(p) {
    if (!this.isPunct(p)) throw this.unexpected(MSG.quote(p));
    return this.next();
  }

  unexpected(want) {
    const t = this.peek();
    return syntaxError(MSG.expected(want, describe(t)), t);
  }

  // ---- statements ----

  parseProgram() {
    const first = this.peek();
    if (!this.isKeyword("PROGRAM_START")) throw syntaxError(MSG.missingStart(), first);
    this.next();

    const body = [];
    while (!this.isKeyword("PROGRAM_END")) {
      if (this.peek().type === "eof") throw syntaxError(MSG.missingEnd(), this.peek());
      body.push(this.parseStatement());
    }
    this.next();

    if (this.peek().type !== "eof") throw syntaxError(MSG.codeAfterEnd(), this.peek());
    return { type: "Program", body, ...pos(first) };
  }

  parseStatement() {
    const t = this.peek();

    if (t.type === "keyword") {
      switch (t.value) {
        case "LET": return this.parseLet();
        case "PRINT": return this.parsePrint();
        case "IF": return this.parseIf();
        case "WHILE": return this.parseWhile();
        case "FUNCTION": return this.parseFunction();
        case "RETURN": return this.parseReturn();
        case "BREAK":
        case "CONTINUE": return this.parseJump();
        case "ELSE":
        case "ELSE_IF": throw syntaxError(MSG.danglingElse(t.text), t);
      }
    }

    if (this.isPunct("{")) return this.parseBlock();

    if (this.isPunct(";")) {
      this.next();
      return { type: "Empty", ...pos(t) };
    }

    const expression = this.parseExpression();
    this.expectPunct(";");
    return { type: "ExpressionStatement", expression, ...pos(t) };
  }

  parseLet() {
    const start = this.next();
    const declarations = [];
    do {
      const id = this.peek();
      if (id.type !== "identifier") throw this.unexpected(MSG.things.variableName);
      this.next();
      let init = null;
      if (this.isPunct("=")) {
        this.next();
        init = this.parseExpression();
      }
      declarations.push({ name: id.value, init, ...pos(id) });
    } while (this.isPunct(",") && this.next());
    this.expectPunct(";");
    return { type: "Let", declarations, ...pos(start) };
  }

  parsePrint() {
    const start = this.next();
    const args = this.parseList();
    this.expectPunct(";");
    return { type: "Print", args, ...pos(start) };
  }

  // Handles both IF and ELSE_IF: an else-if chain becomes nested If nodes.
  parseIf() {
    const start = this.next();
    const test = this.parseCondition();
    const consequent = this.parseBlock();
    let alternate = null;
    if (this.isKeyword("ELSE_IF")) {
      alternate = this.parseIf();
    } else if (this.isKeyword("ELSE")) {
      this.next();
      alternate = this.parseBlock();
    }
    return { type: "If", test, consequent, alternate, ...pos(start) };
  }

  parseWhile() {
    const start = this.next();
    const test = this.parseCondition();
    this.loopDepth++;
    try {
      const body = this.parseBlock();
      return { type: "While", test, body, ...pos(start) };
    } finally {
      this.loopDepth--;
    }
  }

  parseFunction() {
    const start = this.next();
    const name = this.peek();
    if (name.type !== "identifier") throw this.unexpected(MSG.things.functionName);
    this.next();

    this.expectPunct("(");
    const params = [];
    if (!this.isPunct(")")) {
      do {
        const param = this.peek();
        if (param.type !== "identifier") throw this.unexpected(MSG.things.variableName);
        if (params.includes(param.value)) throw syntaxError(MSG.duplicateParam(param.value), param);
        this.next();
        params.push(param.value);
      } while (this.isPunct(",") && this.next());
    }
    this.expectPunct(")");

    // A loop outside the function doesn't make `bas kara` valid inside it.
    const outerLoopDepth = this.loopDepth;
    this.loopDepth = 0;
    this.functionDepth++;
    try {
      const body = this.parseBlock();
      return { type: "Function", name: name.value, params, body, ...pos(start) };
    } finally {
      this.loopDepth = outerLoopDepth;
      this.functionDepth--;
    }
  }

  parseReturn() {
    const t = this.next();
    if (this.functionDepth === 0) throw syntaxError(MSG.returnOutsideFunction(t.text), t);
    const argument = this.isPunct(";") ? null : this.parseExpression();
    this.expectPunct(";");
    return { type: "Return", argument, ...pos(t) };
  }

  parseJump() {
    const t = this.next();
    if (this.loopDepth === 0) throw syntaxError(MSG.jumpOutsideLoop(t.text), t);
    this.expectPunct(";");
    return { type: t.value === "BREAK" ? "Break" : "Continue", ...pos(t) };
  }

  parseCondition() {
    this.expectPunct("(");
    const test = this.parseExpression();
    this.expectPunct(")");
    return test;
  }

  parseBlock() {
    const start = this.expectPunct("{");
    const body = [];
    while (!this.isPunct("}")) {
      if (this.peek().type === "eof" || this.isKeyword("PROGRAM_END")) throw this.unexpected(MSG.quote("}"));
      body.push(this.parseStatement());
    }
    this.next();
    return { type: "Block", body, ...pos(start) };
  }

  // ---- expressions ----

  parseExpression() {
    const left = this.parseBinary(0);
    const t = this.peek();
    if (t.type === "punct" && ASSIGNMENT_OPS.has(t.value)) {
      if (left.type !== "Identifier" && left.type !== "Index") throw syntaxError(MSG.invalidAssignTarget(), t);
      this.next();
      const value = this.parseExpression();
      return { type: "Assignment", operator: t.value, target: left, value, ...pos(left) };
    }
    return left;
  }

  parseBinary(level) {
    if (level === BINARY_LEVELS.length) return this.parseUnary();
    const ops = BINARY_LEVELS[level];
    let left = this.parseBinary(level + 1);
    while (this.peek().type === "punct" && ops.includes(this.peek().value)) {
      const op = this.next();
      const right = this.parseBinary(level + 1);
      const type = op.value === "&&" || op.value === "||" ? "Logical" : "Binary";
      left = { type, operator: op.value, left, right, ...pos(op) };
    }
    return left;
  }

  parseUnary() {
    const t = this.peek();
    if (t.type === "punct" && (t.value === "!" || t.value === "-" || t.value === "+")) {
      this.next();
      return { type: "Unary", operator: t.value, argument: this.parseUnary(), ...pos(t) };
    }
    return this.parsePostfix();
  }

  parsePostfix() {
    let expr = this.parsePrimary();
    for (;;) {
      const t = this.peek();
      if (this.isPunct("(")) {
        this.next();
        const args = this.isPunct(")") ? [] : this.parseList();
        this.expectPunct(")");
        expr = { type: "Call", callee: expr, args, ...pos(t) };
      } else if (this.isPunct("[")) {
        this.next();
        const index = this.parseExpression();
        this.expectPunct("]");
        expr = { type: "Index", object: expr, index, ...pos(t) };
      } else {
        return expr;
      }
    }
  }

  /** One or more comma-separated expressions. */
  parseList() {
    const items = [this.parseExpression()];
    while (this.isPunct(",")) {
      this.next();
      items.push(this.parseExpression());
    }
    return items;
  }

  parsePrimary() {
    const t = this.peek();

    if (t.type === "number" || t.type === "string") {
      this.next();
      return { type: "Literal", value: t.value, ...pos(t) };
    }

    if (t.type === "keyword" && t.value in LITERAL_KEYWORDS) {
      this.next();
      return { type: "Literal", value: LITERAL_KEYWORDS[t.value], ...pos(t) };
    }

    if (t.type === "identifier") {
      this.next();
      return { type: "Identifier", name: t.value, ...pos(t) };
    }

    if (this.isPunct("(")) {
      this.next();
      const expression = this.parseExpression();
      this.expectPunct(")");
      return expression;
    }

    if (this.isPunct("[")) {
      this.next();
      const elements = [];
      while (!this.isPunct("]")) {
        elements.push(this.parseExpression());
        if (!this.isPunct(",")) break;
        this.next(); // a trailing comma is fine
      }
      this.expectPunct("]");
      return { type: "ListLiteral", elements, ...pos(t) };
    }

    throw this.unexpected(MSG.things.value);
  }
}
