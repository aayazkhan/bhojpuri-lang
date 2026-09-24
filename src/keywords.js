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
  TRUE: "true",
  FALSE: "false",
  NULL: "null",
});
