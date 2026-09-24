// Every Bhojpuri keyword lives here. Change a value to rename a keyword —
// the tokenizer, error messages, CLI and playground all read from this table.
// Multi-word keywords are allowed; the words may be separated by any spaces/tabs.
export const KEYWORDS = Object.freeze({
  PROGRAM_START: "ka ho bhaiya",
  PROGRAM_END: "chalat bani bhaiya",
  LET: "maan la",
  PRINT: "bol ho",
  IF: "jadi",
  ELSE_IF: "na ta jadi",
  ELSE: "na ta",
  WHILE: "jab le",
  BREAK: "bas kara",
  CONTINUE: "aage badha",
  FUNCTION: "kaam",
  RETURN: "lauta da",
  TRUE: "sach",
  FALSE: "jhooth",
  NULL: "khaali",
});

// What each keyword means, for the README, CLI help and playground cheat sheet.
export const KEYWORD_MEANINGS = Object.freeze({
  PROGRAM_START: "start of program",
  PROGRAM_END: "end of program",
  LET: "declare a variable (let)",
  PRINT: "print (console.log)",
  IF: "if",
  ELSE_IF: "else if",
  ELSE: "else",
  WHILE: "while loop",
  BREAK: "break",
  CONTINUE: "continue",
  FUNCTION: "define a function",
  RETURN: "return",
  TRUE: "true",
  FALSE: "false",
  NULL: "null",
});

// Built-in functions. These are ordinary names, not keywords, so a program may
// shadow them with its own variables.
export const BUILTINS = Object.freeze({
  LENGTH: "lambai",
  PUSH: "daal",
  POP: "nikaal",
});

export const BUILTIN_MEANINGS = Object.freeze({
  LENGTH: "length of a list or string",
  PUSH: "add an item to the end of a list",
  POP: "remove and return the last item of a list",
});
