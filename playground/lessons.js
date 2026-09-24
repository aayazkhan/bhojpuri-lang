import { run, BhojpuriError, formatError } from "../src/index.js";

// The "Sikh" (learn) lessons: each has an explanation, an example to open in the editor,
// and an exercise whose output is checked. `input` answers `poochh` during the check.
//
// Text comes in two languages: `bho` (Bhojpuri in Roman letters, shown by default) and `en`
// (English). To improve the Bhojpuri wording, edit the `bho` strings; the tests check that both
// languages ask for the same code in each exercise.

const program = (body) => `ka ho bhaiya\n${body.replace(/^\n|\n$/g, "")}\nchalat bani bhaiya\n`;

export const LESSONS = [
  {
    title: { bho: "Pranam duniya", en: "Hello world" },
    body: {
      bho: `<p>Har program <code>ka ho bhaiya</code> se shuru hola aur <code>chalat bani bhaiya</code> pe khatam
        hola. <code>bol ho</code> screen pe likh ke dekhawela, aur har line ke ant me <code>;</code> lagela.</p>
        <p><code>bol ho</code> ke comma laga ke kai go cheez de sakela: sab ek line me, beech me space ke saath
        chhapi.</p>`,
      en: `<p>Every program starts with <code>ka ho bhaiya</code> and ends with <code>chalat bani bhaiya</code>.
        <code>bol ho</code> prints, and every statement ends with <code>;</code>.</p>
        <p>Give <code>bol ho</code> several values separated by commas and it prints them with spaces between.</p>`,
    },
    example: program(`
  bol ho "Pranam duniya!";
  bol ho "Ek", "do", 3;`),
    exercise: {
      task: {
        bho: `<code>Hum Bhojpuri me code likhat bani</code> chhaap ke dekhaw.`,
        en: `Print <code>Hum Bhojpuri me code likhat bani</code>.`,
      },
      expected: ["Hum Bhojpuri me code likhat bani"],
      solution: program(`
  bol ho "Hum Bhojpuri me code likhat bani";`),
    },
  },
  {
    title: { bho: "Variable: maan la", en: "Variables: maan la" },
    body: {
      bho: `<p><code>maan la</code> se variable banela: ek dabba, jeme koi maan (value) rakhal jaala. Nai value
        <code>=</code> se dihal jaala, aur <code>+=</code>, <code>-=</code>, <code>*=</code>, <code>/=</code> se
        badlal jaala.</p>`,
      en: `<p><code>maan la</code> makes a variable. Give it a new value with <code>=</code>, or change it with
        <code>+=</code>, <code>-=</code>, <code>*=</code> and <code>/=</code>.</p>`,
    },
    example: program(`
  maan la naam = "Sita";
  maan la umar = 20;
  umar += 1;
  bol ho naam, umar;`),
    exercise: {
      task: {
        bho: `<code>paisa</code> naam ke variable bana, ose <code>100</code> rakh, <code>30</code> ghata, phir
          dugna kar ke chhaap. (Jawab <code>140</code> aai.)`,
        en: `Make a variable <code>paisa</code> with <code>100</code>, take away <code>30</code>, then double it,
          and print it. (The answer is <code>140</code>.)`,
      },
      expected: ["140"],
      solution: program(`
  maan la paisa = 100;
  paisa -= 30;
  paisa *= 2;
  bol ho paisa;`),
    },
  },
  {
    title: { bho: "Hisaab aur text", en: "Maths and text" },
    body: {
      bho: `<p>Hisaab waisahi chalela: <code>+ - * / %</code> (<code>%</code> se bhaag ke baad bachal sankhya
        milela). <code>+</code> se text bhi jodal jaala.</p>
        <p><b>Backtick</b> wala string me <code>{ }</code> ke bhitar jaun likhab, uhe hisaab ho ke text me aa
        jaai.</p>`,
      en: `<p>Maths works as usual: <code>+ - * / %</code> (<code>%</code> is the remainder). <code>+</code> also
        joins text.</p>
        <p>A string written with <b>backticks</b> can put values straight into the text: whatever is inside
        <code>{ }</code> is worked out and written in.</p>`,
    },
    example: program(`
  maan la naam = "Ramu", umar = 24;
  bol ho 7 * 6, 17 % 5, "umar: " + umar;
  bol ho \`Pranam {naam}, agila saal {umar + 1} ke ho jaiba\`;`),
    exercise: {
      task: {
        bho: `<code>maan la a = 12, b = 30;</code> le ke, backtick string se <code>12 + 30 = 42</code> chhaap
          (42 ke <code>{a + b}</code> se nikaal).`,
        en: `With <code>maan la a = 12, b = 30;</code>, use a backtick string to print
          <code>12 + 30 = 42</code> (work out the 42 with <code>{a + b}</code>).`,
      },
      expected: ["12 + 30 = 42"],
      solution: program(`
  maan la a = 12, b = 30;
  bol ho \`{a} + {b} = {a + b}\`;`),
    },
  },
  {
    title: { bho: "Shart: jadi", en: "Conditions: jadi" },
    body: {
      bho: `<p><code>jadi</code> (agar) ke bhitar wala block tabe chalela jab shart sach hoe. Dusra halat
        khatir <code>na ta jadi</code> (na ta agar) aur <code>na ta</code> (nahi ta) ba.</p>
        <p>Tulna <code>== != &lt; &gt; &lt;= &gt;=</code> se hola, aur <code>&amp;&amp;</code> (aur),
        <code>||</code> (ya) aur <code>!</code> (ulta) se shart jodal jaala.</p>`,
      en: `<p><code>jadi</code> (if) runs a block when its condition is true. <code>na ta jadi</code> (else if)
        and <code>na ta</code> (else) handle the other cases.</p>
        <p>Compare with <code>== != &lt; &gt; &lt;= &gt;=</code>, and combine with <code>&amp;&amp;</code> (and),
        <code>||</code> (or) and <code>!</code> (not).</p>`,
    },
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
      task: {
        bho: `<code>maan la n = 15;</code> le ke: agar <code>n</code> 3 se pura bhaag hoe
          (<code>n % 3 == 0</code>) ta <code>teen se bhaag</code> chhaap, na ta <code>na</code>.`,
        en: `With <code>maan la n = 15;</code>, print <code>teen se bhaag</code> if <code>n</code> divides by 3
          (<code>n % 3 == 0</code>), otherwise print <code>na</code>.`,
      },
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
    title: { bho: "Loop: jab le", en: "Loops: jab le" },
    body: {
      bho: `<p><code>jab le</code> block ke baar-baar chalawela, jab le shart sach rahe. <code>bas kara</code>
        loop rok dela, aur <code>aage badha</code> agila chakkar pe kood jaala.</p>
        <p>Variable badalal mat bhula, na ta loop kabhi khatam na hoi.</p>`,
      en: `<p><code>jab le</code> (while) repeats a block as long as its condition is true.
        <code>bas kara</code> stops the loop, and <code>aage badha</code> skips to the next round.</p>
        <p>Don't forget to change the variable, or the loop never ends.</p>`,
    },
    example: program(`
  maan la i = 1;
  jab le (i <= 3) {
    bol ho "Round", i;
    i += 1;
  }`),
    exercise: {
      task: {
        bho: `<code>jab le</code> se 5 se 1 tak ulta gin, har sankhya alag line me.`,
        en: `Use <code>jab le</code> to count down from 5 to 1, one number per line.`,
      },
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
    title: { bho: "Loop: har", en: "Loops: har" },
    body: {
      bho: `<p><code>har i = 1 se 10 tak { }</code> 1 se 10 tak ginela, duno sankhya shaamil. <code>kadam</code>
        se tay hola ki ek baar me kitna badhe: <code>har i = 10 se 0 tak kadam -2</code>.</p>
        <p><code>har x list me { }</code> list ke har cheez (ya string ke har akshar) pe chalela.</p>`,
      en: `<p><code>har i = 1 se 10 tak { }</code> counts from 1 to 10, both included. <code>kadam</code> sets
        the step: <code>har i = 10 se 0 tak kadam -2</code>.</p>
        <p><code>har x list me { }</code> visits each item of a list (or letter of a string).</p>`,
    },
    example: program(`
  har i = 1 se 5 tak {
    bol ho i, "x 7 =", i * 7;
  }
  har phal ["aam", "kela"] me {
    bol ho phal;
  }`),
    exercise: {
      task: {
        bho: `<code>kadam</code> se 2 se 10 tak ke jor (even) sankhya chhaap, har ek alag line me.`,
        en: `Print the even numbers from 2 to 10, one per line, using <code>kadam</code>.`,
      },
      expected: ["2", "4", "6", "8", "10"],
      solution: program(`
  har i = 2 se 10 tak kadam 2 {
    bol ho i;
  }`),
    },
  },
  {
    title: { bho: "Aapan kaam: kaam", en: "Functions: kaam" },
    body: {
      bho: `<p><code>kaam naam(a, b) { }</code> se aapan kaam (function) banela, aur <code>lauta da</code> jawab
        waapas dela. Bolawe khatir <code>naam(1, 2)</code> likh.</p>`,
      en: `<p><code>kaam naam(a, b) { }</code> makes a function, and <code>lauta da</code> (return) gives back
        its answer. Call it with <code>naam(1, 2)</code>.</p>`,
    },
    example: program(`
  kaam jodo(a, b) {
    lauta da a + b;
  }
  bol ho jodo(2, 3), jodo(10, 20);`),
    exercise: {
      task: {
        bho: `<code>kaam varg(n)</code> likh jaun <code>n * n</code> lautawe, phir <code>varg(7)</code> chhaap.`,
        en: `Write <code>kaam varg(n)</code> that gives back <code>n * n</code>, then print <code>varg(7)</code>.`,
      },
      expected: ["49"],
      solution: program(`
  kaam varg(n) {
    lauta da n * n;
  }
  bol ho varg(7);`),
    },
  },
  {
    title: { bho: "List", en: "Lists" },
    body: {
      bho: `<p>List me kai go maan ek saath rahela: <code>[10, 20, 30]</code>. Ginti 0 se shuru hola, ta
        <code>l[0]</code> pahila cheez ha.</p>
        <p><code>daal(l, x)</code> ant me jodela, <code>nikaal(l)</code> aakhri wala nikaalela, aur
        <code>lambai(l)</code> se lambai milela.</p>`,
      en: `<p>A list holds several values: <code>[10, 20, 30]</code>. Indexes start at 0, so <code>l[0]</code>
        is the first item.</p>
        <p><code>daal(l, x)</code> adds to the end, <code>nikaal(l)</code> takes the last one off, and
        <code>lambai(l)</code> is the length.</p>`,
    },
    example: program(`
  maan la saaman = ["aalu", "pyaaz"];
  daal(saaman, "sattu");
  bol ho saaman[0], lambai(saaman);
  bol ho saaman;`),
    exercise: {
      task: {
        bho: `<code>maan la ank = [4, 8, 15];</code> se shuru kar, <code>daal</code> se <code>16</code> aur
          <code>23</code> jod, phir list ke lambai aur aakhri cheez chhaap (<code>5 23</code>).`,
        en: `Start with <code>maan la ank = [4, 8, 15];</code>, add <code>16</code> and <code>23</code> with
          <code>daal</code>, then print the list's length and its last item (<code>5 23</code>).`,
      },
      expected: ["5 23"],
      solution: program(`
  maan la ank = [4, 8, 15];
  daal(ank, 16);
  daal(ank, 23);
  bol ho lambai(ank), ank[lambai(ank) - 1];`),
    },
  },
  {
    title: { bho: "Kosh", en: "Kosh (dictionaries)" },
    body: {
      bho: `<p><code>kosh</code> me maan chaabi (key) ke saath rakhal jaala: <code>{ "aam": 30, "kela": 10 }</code>.
        <code>d["aam"]</code> se padh, aur <code>d["seb"] = 50</code> se jod ya badal.</p>
        <p><code>ba(d, chaabi)</code> batawela ki chaabi ba ki na, aur <code>har k d me</code> sab chaabi pe
        ghumela.</p>`,
      en: `<p>A <code>kosh</code> stores values under keys: <code>{ "aam": 30, "kela": 10 }</code>. Read with
        <code>d["aam"]</code>, and add or change with <code>d["seb"] = 50</code>.</p>
        <p><code>ba(d, key)</code> checks whether a key exists, and <code>har k d me</code> loops over the keys.</p>`,
    },
    example: program(`
  maan la daam = { "aam": 30, "kela": 10 };
  daam["seb"] = 50;
  har k daam me {
    bol ho k, daam[k];
  }`),
    exercise: {
      task: {
        bho: `<code>maan la daam = { "aam": 30, "kela": 10, "seb": 50 };</code> le ke, <code>har</code> loop se
          sab daam jod ke kul chhaap (<code>90</code>).`,
        en: `With <code>maan la daam = { "aam": 30, "kela": 10, "seb": 50 };</code>, add up all the prices with a
          <code>har</code> loop and print the total (<code>90</code>).`,
      },
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
    title: { bho: "Kaam ke built-in", en: "Handy built-ins" },
    body: {
      bho: `<p>Built-in kaam roj ke kaam kar dela: <code>chhaant</code> kram me lagawela, <code>kul</code> jodela,
        <code>khoj</code> khojela, <code>jod</code> text jodela, <code>bada</code> capital banawela, aur bahut
        kuchh (neeche ke list dekh).</p>
        <p><code>kaam(x) { ... }</code> bina naam ke turant ek kaam banawela. <code>badal(list, kaam)</code> ose
        har cheez pe lagawela, aur <code>chhaan(list, kaam)</code> uhe cheez rakhela jekra khatir kaam
        <code>sach</code> kahe.</p>`,
      en: `<p>Built-ins do common jobs: <code>chhaant</code> sorts, <code>kul</code> adds up,
        <code>khoj</code> finds, <code>jod</code> joins, <code>bada</code> makes capitals, and more (see the list
        below).</p>
        <p><code>kaam(x) { ... }</code> without a name makes a function on the spot. <code>badal(list, kaam)</code>
        applies it to every item, and <code>chhaan(list, kaam)</code> keeps the items it says <code>sach</code> to.</p>`,
    },
    example: program(`
  maan la ank = [5, 3, 8, 1];
  bol ho chhaant(ank), kul(ank), khoj(ank, 8);
  bol ho badal(ank, kaam(x) { lauta da x * 10 });
  bol ho chhaan(ank, kaam(x) { lauta da x > 4 });`),
    exercise: {
      task: {
        bho: `<code>maan la ank = [5, 3, 8, 1];</code> ke sankhya kram me laga ke, dugna kar ke chhaap:
          <code>[2, 6, 10, 16]</code>.`,
        en: `From <code>maan la ank = [5, 3, 8, 1];</code>, print the numbers sorted and doubled:
          <code>[2, 6, 10, 16]</code>.`,
      },
      expected: ["[2, 6, 10, 16]"],
      solution: program(`
  maan la ank = [5, 3, 8, 1];
  bol ho badal(chhaant(ank), kaam(x) { lauta da x * 2 });`),
    },
  },
  {
    title: { bho: "Sawal: poochh", en: "Asking: poochh" },
    body: {
      bho: `<p><code>poochh("Sawal? ")</code> program chalawe wala se poochhela aur jawab text ke roop me dela.
        Sankhya chahi ta <code>sankhya(...)</code> laga.</p>
        <p>Playground me ek sawal wala dabba khulela. Neeche wala jaanch me jawab <code>Ramu</code> maanal
        jaai.</p>`,
      en: `<p><code>poochh("Question? ")</code> asks the person running the program and gives back their answer
        as text. Use <code>sankhya(...)</code> to turn the answer into a number.</p>
        <p>In the playground, a question box opens. For the check below, the answer is <code>Ramu</code>.</p>`,
    },
    example: program(`
  maan la naam = poochh("Tohar naam ka ba? ");
  bol ho \`Pranam {naam}!\`;
  maan la umar = sankhya(poochh("Umar? "));
  bol ho \`Agila saal {umar + 1}\`;`),
    exercise: {
      task: {
        bho: `<code>poochh</code> se naam poochh aur <code>Pranam &lt;naam&gt;, swagat ba!</code> chhaap (jawab
          <code>Ramu</code> hoe ta: <code>Pranam Ramu, swagat ba!</code>).`,
        en: `Ask for a name with <code>poochh</code> and print <code>Pranam &lt;naam&gt;, swagat ba!</code>
          (with the answer <code>Ramu</code>: <code>Pranam Ramu, swagat ba!</code>).`,
      },
      input: ["Ramu"],
      expected: ["Pranam Ramu, swagat ba!"],
      solution: program(`
  maan la naam = poochh("Naam? ");
  bol ho \`Pranam {naam}, swagat ba!\`;`),
    },
  },
  {
    title: { bho: "Galti pakad: koshish kara", en: "Catching errors: koshish kara" },
    body: {
      bho: `<p>Kuchh galat hoe ta program galti deke ruk jaala. <code>koshish kara { }</code> block chalawela, aur
        agar u fail hoe ta <code>galti pe (g) { }</code> chalela, aur <code>g</code> me galti ke sandesh
        rahela.</p>
        <p><code>phenk da</code> se aapan galti phenkal jaala.</p>`,
      en: `<p>When something goes wrong, the program stops with an error. <code>koshish kara { }</code> (try)
        runs a block, and if it fails, <code>galti pe (g) { }</code> (catch) runs instead, with the error message
        in <code>g</code>.</p>
        <p><code>phenk da</code> raises your own error.</p>`,
    },
    example: program(`
  koshish kara {
    bol ho sankhya("das");
  } galti pe (g) {
    bol ho "Galti:", g;
  }
  bol ho "Program chalat rahal.";`),
    exercise: {
      task: {
        bho: `<code>koshish kara</code> ke bhitar <code>phenk da "paisa kam ba";</code> likh. Ose pakad ke
          <code>Pakdail: paisa kam ba</code> chhaap.`,
        en: `Inside <code>koshish kara</code>, <code>phenk da "paisa kam ba";</code>. Catch it and print
          <code>Pakdail: paisa kam ba</code>.`,
      },
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

export const LANGUAGES = { bho: "Bhojpuri", en: "English" };

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
