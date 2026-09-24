import { run, BhojpuriError, formatError } from "../src/index.js";

// The "Sikh" (learn) lessons: each has an explanation, an example to open in the editor,
// and an exercise whose output is checked. `input` answers `poochh` during the check.

const program = (body) => `ka ho bhaiya\n${body.replace(/^\n|\n$/g, "")}\nchalat bani bhaiya\n`;

export const LESSONS = [
  {
    title: "Pranam duniya",
    body: `<p>Every program starts with <code>ka ho bhaiya</code> and ends with <code>chalat bani bhaiya</code>.
      <code>bol ho</code> prints, and every statement ends with <code>;</code>.</p>
      <p>Give <code>bol ho</code> several values separated by commas and it prints them with spaces between.</p>`,
    example: program(`
  bol ho "Pranam duniya!";
  bol ho "Ek", "do", 3;`),
    exercise: {
      task: `Print <code>Hum Bhojpuri me code likhat bani</code>.`,
      expected: ["Hum Bhojpuri me code likhat bani"],
      solution: program(`
  bol ho "Hum Bhojpuri me code likhat bani";`),
    },
  },
  {
    title: "Variables: maan la",
    body: `<p><code>maan la</code> makes a variable. Give it a new value with <code>=</code>, or change it with
      <code>+=</code>, <code>-=</code>, <code>*=</code> and <code>/=</code>.</p>`,
    example: program(`
  maan la naam = "Sita";
  maan la umar = 20;
  umar += 1;
  bol ho naam, umar;`),
    exercise: {
      task: `Make a variable <code>paisa</code> with <code>100</code>, take away <code>30</code>, then double it,
        and print it. (The answer is <code>140</code>.)`,
      expected: ["140"],
      solution: program(`
  maan la paisa = 100;
  paisa -= 30;
  paisa *= 2;
  bol ho paisa;`),
    },
  },
  {
    title: "Maths and text",
    body: `<p>Maths works as usual: <code>+ - * / %</code> (<code>%</code> is the remainder). <code>+</code> also
      joins text.</p>
      <p>A string written with <b>backticks</b> can put values straight into the text: whatever is inside
      <code>{ }</code> is worked out and written in.</p>`,
    example: program(`
  maan la naam = "Ramu", umar = 24;
  bol ho 7 * 6, 17 % 5, "umar: " + umar;
  bol ho \`Pranam {naam}, agila saal {umar + 1} ke ho jaiba\`;`),
    exercise: {
      task: `With <code>maan la a = 12, b = 30;</code>, use a backtick string to print
        <code>12 + 30 = 42</code> (work out the 42 with <code>{a + b}</code>).`,
      expected: ["12 + 30 = 42"],
      solution: program(`
  maan la a = 12, b = 30;
  bol ho \`{a} + {b} = {a + b}\`;`),
    },
  },
  {
    title: "Conditions: jadi",
    body: `<p><code>jadi</code> (if) runs a block when its condition is true. <code>na ta jadi</code> (else if)
      and <code>na ta</code> (else) handle the other cases.</p>
      <p>Compare with <code>== != &lt; &gt; &lt;= &gt;=</code>, and combine with <code>&amp;&amp;</code> (and),
      <code>||</code> (or) and <code>!</code> (not).</p>`,
    example: program(`
  maan la marks = 72;
  jadi (marks >= 80) {
    bol ho "Bahut badhiya";
  } na ta jadi (marks >= 40) {
    bol ho "Pass";
  } na ta {
    bol ho "Phir se koshish kar";
  }`),
    exercise: {
      task: `With <code>maan la n = 15;</code>, print <code>teen se bhaag</code> if <code>n</code> divides by 3
        (<code>n % 3 == 0</code>), otherwise print <code>na</code>.`,
      expected: ["teen se bhaag"],
      solution: program(`
  maan la n = 15;
  jadi (n % 3 == 0) {
    bol ho "teen se bhaag";
  } na ta {
    bol ho "na";
  }`),
    },
  },
  {
    title: "Loops: jab le",
    body: `<p><code>jab le</code> (while) repeats a block as long as its condition is true.
      <code>bas kara</code> stops the loop, and <code>aage badha</code> skips to the next round.</p>
      <p>Don't forget to change the variable, or the loop never ends.</p>`,
    example: program(`
  maan la i = 1;
  jab le (i <= 3) {
    bol ho "Round", i;
    i += 1;
  }`),
    exercise: {
      task: `Use <code>jab le</code> to count down from 5 to 1, one number per line.`,
      expected: ["5", "4", "3", "2", "1"],
      solution: program(`
  maan la i = 5;
  jab le (i >= 1) {
    bol ho i;
    i -= 1;
  }`),
    },
  },
  {
    title: "Loops: har",
    body: `<p><code>har i = 1 se 10 tak { }</code> counts from 1 to 10, both included. <code>kadam</code> sets
      the step: <code>har i = 10 se 0 tak kadam -2</code>.</p>
      <p><code>har x list me { }</code> visits each item of a list (or letter of a string).</p>`,
    example: program(`
  har i = 1 se 5 tak {
    bol ho i, "x 7 =", i * 7;
  }
  har phal ["aam", "kela"] me {
    bol ho phal;
  }`),
    exercise: {
      task: `Print the even numbers from 2 to 10, one per line, using <code>kadam</code>.`,
      expected: ["2", "4", "6", "8", "10"],
      solution: program(`
  har i = 2 se 10 tak kadam 2 {
    bol ho i;
  }`),
    },
  },
  {
    title: "Functions: kaam",
    body: `<p><code>kaam naam(a, b) { }</code> makes a function, and <code>lauta da</code> (return) gives back
      its answer. Call it with <code>naam(1, 2)</code>.</p>`,
    example: program(`
  kaam jodo(a, b) {
    lauta da a + b;
  }
  bol ho jodo(2, 3), jodo(10, 20);`),
    exercise: {
      task: `Write <code>kaam varg(n)</code> that gives back <code>n * n</code>, then print <code>varg(7)</code>.`,
      expected: ["49"],
      solution: program(`
  kaam varg(n) {
    lauta da n * n;
  }
  bol ho varg(7);`),
    },
  },
  {
    title: "Lists",
    body: `<p>A list holds several values: <code>[10, 20, 30]</code>. Indexes start at 0, so <code>l[0]</code>
      is the first item.</p>
      <p><code>daal(l, x)</code> adds to the end, <code>nikaal(l)</code> takes the last one off, and
      <code>lambai(l)</code> is the length.</p>`,
    example: program(`
  maan la saaman = ["aalu", "pyaaz"];
  daal(saaman, "sattu");
  bol ho saaman[0], lambai(saaman);
  bol ho saaman;`),
    exercise: {
      task: `Start with <code>maan la ank = [4, 8, 15];</code>, add <code>16</code> and <code>23</code> with
        <code>daal</code>, then print the list's length and its last item (<code>5 23</code>).`,
      expected: ["5 23"],
      solution: program(`
  maan la ank = [4, 8, 15];
  daal(ank, 16);
  daal(ank, 23);
  bol ho lambai(ank), ank[lambai(ank) - 1];`),
    },
  },
  {
    title: "Kosh (dictionaries)",
    body: `<p>A <code>kosh</code> stores values under keys: <code>{ "aam": 30, "kela": 10 }</code>. Read with
      <code>d["aam"]</code>, and add or change with <code>d["seb"] = 50</code>.</p>
      <p><code>ba(d, key)</code> checks whether a key exists, and <code>har k d me</code> loops over the keys.</p>`,
    example: program(`
  maan la daam = { "aam": 30, "kela": 10 };
  daam["seb"] = 50;
  har k daam me {
    bol ho k, daam[k];
  }`),
    exercise: {
      task: `With <code>maan la daam = { "aam": 30, "kela": 10, "seb": 50 };</code>, add up all the prices with a
        <code>har</code> loop and print the total (<code>90</code>).`,
      expected: ["90"],
      solution: program(`
  maan la daam = { "aam": 30, "kela": 10, "seb": 50 };
  maan la kul_daam = 0;
  har k daam me {
    kul_daam += daam[k];
  }
  bol ho kul_daam;`),
    },
  },
  {
    title: "Handy built-ins",
    body: `<p>Built-ins do common jobs: <code>chhaant</code> sorts, <code>kul</code> adds up,
      <code>khoj</code> finds, <code>jod</code> joins, <code>bada</code> makes capitals, and more (see the list
      below).</p>
      <p><code>kaam(x) { ... }</code> without a name makes a function on the spot. <code>badal(list, kaam)</code>
      applies it to every item, and <code>chhaan(list, kaam)</code> keeps the items it says <code>sach</code> to.</p>`,
    example: program(`
  maan la ank = [5, 3, 8, 1];
  bol ho chhaant(ank), kul(ank), khoj(ank, 8);
  bol ho badal(ank, kaam(x) { lauta da x * 10 });
  bol ho chhaan(ank, kaam(x) { lauta da x > 4 });`),
    exercise: {
      task: `From <code>maan la ank = [5, 3, 8, 1];</code>, print the numbers sorted and doubled:
        <code>[2, 6, 10, 16]</code>.`,
      expected: ["[2, 6, 10, 16]"],
      solution: program(`
  maan la ank = [5, 3, 8, 1];
  bol ho badal(chhaant(ank), kaam(x) { lauta da x * 2 });`),
    },
  },
  {
    title: "Asking: poochh",
    body: `<p><code>poochh("Question? ")</code> asks the person running the program and gives back their answer
      as text. Use <code>sankhya(...)</code> to turn the answer into a number.</p>
      <p>In the playground, a question box opens. For the check below, the answer is <code>Ramu</code>.</p>`,
    example: program(`
  maan la naam = poochh("Tohar naam ka ba? ");
  bol ho \`Pranam {naam}!\`;
  maan la umar = sankhya(poochh("Umar? "));
  bol ho \`Agila saal {umar + 1}\`;`),
    exercise: {
      task: `Ask for a name with <code>poochh</code> and print <code>Pranam &lt;naam&gt;, swagat ba!</code>
        (with the answer <code>Ramu</code>: <code>Pranam Ramu, swagat ba!</code>).`,
      input: ["Ramu"],
      expected: ["Pranam Ramu, swagat ba!"],
      solution: program(`
  maan la naam = poochh("Naam? ");
  bol ho \`Pranam {naam}, swagat ba!\`;`),
    },
  },
  {
    title: "Catching errors: koshish kara",
    body: `<p>When something goes wrong, the program stops with an error. <code>koshish kara { }</code> (try)
      runs a block, and if it fails, <code>galti pe (g) { }</code> (catch) runs instead, with the error message
      in <code>g</code>.</p>
      <p><code>phenk da</code> raises your own error.</p>`,
    example: program(`
  koshish kara {
    bol ho sankhya("das");
  } galti pe (g) {
    bol ho "Galti:", g;
  }
  bol ho "Program chalat rahal.";`),
    exercise: {
      task: `Inside <code>koshish kara</code>, <code>phenk da "paisa kam ba";</code>. Catch it and print
        <code>Pakdail: paisa kam ba</code>.`,
      expected: ["Pakdail: paisa kam ba"],
      solution: program(`
  koshish kara {
    phenk da "paisa kam ba";
  } galti pe (g) {
    bol ho "Pakdail:", g;
  }`),
    },
  },
];

/**
 * Run code for a lesson's exercise and compare what it printed with what's expected.
 * Trailing spaces on each line don't matter.
 * @returns {{ ok: boolean, output: string[], error: string | null }}
 */
export function checkExercise(code, exercise) {
  const output = [];
  const answers = [...(exercise.input ?? [])];
  let error = null;
  try {
    run(code, {
      print: (line) => output.push(line),
      input: () => (answers.length ? answers.shift() : null),
      maxLoopIterations: 100_000,
    });
  } catch (err) {
    error = err instanceof BhojpuriError ? formatError(err, code) : String(err);
  }
  const tidy = (lines) => lines.map((line) => line.replace(/\s+$/, ""));
  const ok = !error && JSON.stringify(tidy(output)) === JSON.stringify(tidy(exercise.expected));
  return { ok, output, error };
}
