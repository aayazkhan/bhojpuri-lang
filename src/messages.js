import { KEYWORDS as K, LOOP_WORDS as W } from "./keywords.js";

const q = (text) => `"${text}"`;

// All user-facing error text, in Bhojpuri-flavoured Hinglish. Types are named the way `kism` names
// them (sankhya, shabd, list, kosh, ...), and "only" is "sirf" so it isn't mistaken for `khaali`.
export const MSG = {
  syntaxLabel: "Likhai me galti",
  runtimeLabel: "Chalat samay galti",

  missingStart: () => `Program ${q(K.PROGRAM_START)} se shuru hoe ke chahi.`,
  missingEnd: () => `Program ${q(K.PROGRAM_END)} pe khatam hoe ke chahi.`,
  codeAfterEnd: () => `${q(K.PROGRAM_END)} ke baad kuchhu na likhe ke ba.`,
  expected: (want, got) => `Ihaan ${want} chahi rahe, lekin ${got} mil gail.`,
  unknownChar: (ch) => `${q(ch)} ka ha? Samajh me na aail.`,
  unterminatedString: () => `String band na bhail — aakhri quote lagawal bhula gail ka?`,
  unterminatedTemplateBrace: () => `${q("{")} band na bhail — ${q("}")} lagawal bhula gail ka? (Sidha ${q("{")} likhe khatir ${q("\\{")} likh.)`,
  emptyTemplateExpression: () => `${q("{ }")} ke bhitar kuchh likh, jaise ${q("{naam}")}.`,
  unterminatedComment: () => `Comment ${q("/*")} ke band kare khatir ${q("*/")} na mil paail.`,
  danglingElse: (kw) => `${q(kw)} se pahile ${q(K.IF)} hoe ke chahi.`,
  danglingCatch: (kw) => `${q(kw)} se pahile ${q(K.TRY)} { ... } hoe ke chahi.`,
  jumpOutsideLoop: (kw) => `${q(kw)} sirf ${q(K.WHILE)} ya ${q(K.FOR)} loop ke bhitar chal sakela.`,
  invalidAssignTarget: () => `Value sirf variable, list ke khana (a[0]) ya kosh ke chaabi (d["k"]) me rakhal ja sakela.`,
  returnOutsideFunction: (kw) => `${q(kw)} sirf ${q(K.FUNCTION)} ke bhitar chal sakela.`,
  duplicateParam: (name) => `${q(name)} naam duu baar likhal gail ba.`,

  // `hint` is a similar name that does exist, when the name looks like a typo.
  notDeclared: (name, hint) =>
    hint
      ? `${q(name)} naam ke koi variable na ba. Kahin ${q(hint)} ta na?`
      : `${q(name)} naam ke koi variable na ba. Pahile ${q(`${K.LET} ${name}`)} likh ke banaw.`,
  alreadyDeclared: (name) =>
    `${q(name)} pahile se banal ba. Nai value dewe khatir ${q(`${name} = ...`)} likh.`,
  divideByZero: () => `Zero se bhaag na dihal ja sakela.`,
  badOperands: (op, a, b) => `${q(op)} ${a} aur ${b} pe na chal sakela.`,
  badOperand: (op, a) => `${q(op)} ${a} pe na chal sakela.`,
  tooManyIterations: (n) =>
    `Loop ${n} baar se jyada chal gail. Kahin i loop kabhi khatam na hoi ka?`,
  tooDeep: () => `Kaam bahut gahiraai tak khud ke bolawat gail. Kahin recursion kabhi khatam na hoi ka?`,
  notAFunction: (type) => `${type} kaam na ha, ekra ke bolawal (call) na ja sakela.`,
  wrongArgCount: (name, expected, got) =>
    `${q(name)} ${expected} cheez maange la, lekin ${got} dihal gail.`,
  builtinArgType: (name, expected, got) => `${q(name)} ke ${expected} chahi, lekin ${got} mil gail.`,
  noInput: (name) => `Ihaan ${q(name)} ke jawab dewe wala koi na ba (input na mil sakela).`,
  mixedList: (name, a, b) => `${q(name)} ke sab sankhya ya sab shabd wala list chahi, lekin ${a} aur ${b} mil gail.`,
  emptyList: (name) => `${q(name)} khaali list pe na chal sakela.`,
  badDecimalPlaces: (name, got) => `${q(name)} me dashamlav ke baad 0 se 15 tak ke pura sankhya chahi, lekin ${got} mil gail.`,
  // An error thrown with `phenk da` that nobody caught: show the value itself.
  thrown: (text) => text,
  emptySearch: (name) => `${q(name)} ke khoje wala text khaali ("") na ho sakela.`,
  noFiles: (kw) => `Ihaan ${q(kw)} na chal sakela: dusra file padhe ke koi intazaam na ba. Terminal me ${q("bhojpuri")} se chalaw.`,
  fileNotFound: (path) => `${q(path)} file na mil paail.`,
  circularImport: (path) => `${q(path)} ghuma-phira ke khud ke le aawat ba. Duno file ek dusra ke na le aa sakela.`,
  importClash: (name, path) => `${q(name)} pahile se banal ba, aur ${q(path)} bhi ek ${q(name)} deta. Ek ke naam badal.`,
  notANumber: (text) => `${q(text)} sankhya na ha, ekra ke sankhya na banawal ja sakela.`,
  badRange: (name, a, b) => `${q(name)} ke pahila sankhya dusra se chhota ya barabar hoe ke chahi, lekin ${a} aur ${b} mil gail.`,
  loopBoundNotNumber: (word, got) => `${q(K.FOR)} loop me ${q(word)} ke baad sankhya chahi, lekin ${got} mil gail.`,
  zeroStep: () => `${q(W.STEP)} 0 na ho sakela, na ta loop kabhi aage na badhi.`,
  notIterable: (type) => `${q(K.FOR)} loop list, shabd ya kosh pe chal sakela, ${type} pe na.`,
  badKey: (type) => `Kosh ke chaabi shabd ya sankhya hoe ke chahi, lekin ${type} mil gail.`,
  missingKey: (key, hint) =>
    hint
      ? `Kosh me ${key} chaabi na ba. Kahin ${q(hint)} ta na?`
      : `Kosh me ${key} chaabi na ba. Pahile ${q("ba(kosh, chaabi)")} se jaanch l.`,
  notIndexable: (type) => `${type} me [ ] se index na lagawal ja sakela.`,
  badIndex: (got) => `Index pura sankhya (0, 1, 2 ...) hoe ke chahi, lekin ${got} mil gail.`,
  indexOutOfRange: (index, length) => `Index ${index} bahar ba — lambai sirf ${length} ba.`,
  stringImmutable: () => `String ke bhitar ke akshar badlal na ja sakela.`,

  things: {
    variableName: "variable ke naam",
    functionName: "kaam ke naam",
    fileName: `file ke naam (jaise ${q("ganit.bhoj")})`,
    value: "koi value",
    endOfFile: "file ke ant",
  },
  quote: q,
};
