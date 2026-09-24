import { KEYWORDS as K } from "./keywords.js";

const q = (text) => `"${text}"`;

// All user-facing error text, in Bhojpuri-flavoured Hinglish.
export const MSG = {
  syntaxLabel: "Likhai me galti",
  runtimeLabel: "Chalat samay galti",

  missingStart: () => `Program ${q(K.PROGRAM_START)} se shuru hoe ke chahi.`,
  missingEnd: () => `Program ${q(K.PROGRAM_END)} pe khatam hoe ke chahi.`,
  codeAfterEnd: () => `${q(K.PROGRAM_END)} ke baad kuchhu na likhe ke ba.`,
  expected: (want, got) => `Ihaan ${want} chahi rahe, lekin ${got} mil gail.`,
  unknownChar: (ch) => `${q(ch)} ka ha? Samajh me na aail.`,
  unterminatedString: () => `String band na bhail — aakhri quote lagawal bhula gail ka?`,
  unterminatedComment: () => `Comment ${q("/*")} ke band kare khatir ${q("*/")} na mil paail.`,
  danglingElse: (kw) => `${q(kw)} se pahile ${q(K.IF)} hoe ke chahi.`,
  jumpOutsideLoop: (kw) => `${q(kw)} khali ${q(K.WHILE)} loop ke bhitar chal sakela.`,
  invalidAssignTarget: () => `Value khali variable me rakhal ja sakela.`,

  notDeclared: (name) =>
    `${q(name)} naam ke koi variable na ba. Pahile ${q(`${K.LET} ${name}`)} likh ke banaw.`,
  alreadyDeclared: (name) =>
    `${q(name)} pahile se banal ba. Nai value dewe khatir ${q(`${name} = ...`)} likh.`,
  divideByZero: () => `Zero se bhaag na dihal ja sakela.`,
  badOperands: (op, a, b) => `${q(op)} ${a} aur ${b} pe na chal sakela.`,
  badOperand: (op, a) => `${q(op)} ${a} pe na chal sakela.`,
  tooManyIterations: (n) =>
    `Loop ${n} baar se jyada chal gail. Kahin i loop kabhi khatam na hoi ka?`,

  things: {
    variableName: "variable ke naam",
    value: "koi value",
    endOfFile: "file ke ant",
  },
  quote: q,
};
