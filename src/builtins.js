import { BUILTINS } from "./keywords.js";
import { runtimeError } from "./errors.js";
import { MSG } from "./messages.js";
import { NativeFunction, isFunction, isDict, display, typeName, truthy, checkKey } from "./values.js";
import { letters, letterIndexOf } from "./text.js";

/**
 * The built-in functions, grouped by topic. Their names come from BUILTINS in keywords.js.
 * `call(fn, args, node)` lets built-ins like `badal` call a function the program passes in.
 * @returns {NativeFunction[]}
 */
export function createBuiltins({ random, input, call }) {
  const expectList = (name, value, node) => {
    if (!Array.isArray(value)) throw runtimeError(MSG.builtinArgType(name, "list", typeName(value)), node);
  };
  const expectNumber = (name, value, node) => {
    if (typeof value !== "number") throw runtimeError(MSG.builtinArgType(name, "sankhya", typeName(value)), node);
  };
  const expectInteger = (name, value, node) => {
    if (!Number.isInteger(value)) throw runtimeError(MSG.builtinArgType(name, "pura sankhya", display(value)), node);
  };
  const expectDict = (name, value, node) => {
    if (!isDict(value)) throw runtimeError(MSG.builtinArgType(name, "kosh", typeName(value)), node);
  };
  const expectFunction = (name, value, node) => {
    if (!isFunction(value)) throw runtimeError(MSG.builtinArgType(name, "kaam", typeName(value)), node);
  };
  const expectListOrString = (name, value, node) => {
    if (!Array.isArray(value) && typeof value !== "string") {
      throw runtimeError(MSG.builtinArgType(name, "list ya shabd", typeName(value)), node);
    }
  };
  const expectString = (name, value, node) => {
    if (typeof value !== "string") throw runtimeError(MSG.builtinArgType(name, "shabd", typeName(value)), node);
  };


  return [
    // ---- Any kind of value ----
    new NativeFunction(BUILTINS.LENGTH, 1, ([value], node) => {
      if (Array.isArray(value)) return value.length;
      if (typeof value === "string") return letters(value).length;
      if (isDict(value)) return value.size;
      throw runtimeError(MSG.builtinArgType(BUILTINS.LENGTH, "list, shabd ya kosh", typeName(value)), node);
    }),
    new NativeFunction(BUILTINS.TO_STRING, 1, ([value]) => display(value)),
    new NativeFunction(BUILTINS.TO_NUMBER, 1, ([value], node) => {
      if (typeof value === "number") return value;
      expectString(BUILTINS.TO_NUMBER, value, node);
      const number = value.trim() === "" ? NaN : Number(value);
      if (!Number.isFinite(number)) throw runtimeError(MSG.notANumber(value), node);
      return number;
    }),
    new NativeFunction(BUILTINS.TYPE, 1, ([value]) => typeName(value)),

    // ---- Numbers ----
    new NativeFunction(BUILTINS.ROUND, 1, ([value], node) => {
      expectNumber(BUILTINS.ROUND, value, node);
      return Math.round(value);
    }),
    new NativeFunction(BUILTINS.FLOOR, 1, ([value], node) => {
      expectNumber(BUILTINS.FLOOR, value, node);
      return Math.floor(value);
    }),
    new NativeFunction(BUILTINS.RANDOM, 2, ([low, high], node) => {
      expectInteger(BUILTINS.RANDOM, low, node);
      expectInteger(BUILTINS.RANDOM, high, node);
      if (low > high) throw runtimeError(MSG.badRange(BUILTINS.RANDOM, low, high), node);
      return low + Math.floor(random() * (high - low + 1));
    }),

    // ---- Text ----
    new NativeFunction(BUILTINS.UPPER, 1, ([text], node) => {
      expectString(BUILTINS.UPPER, text, node);
      return text.toUpperCase();
    }),
    new NativeFunction(BUILTINS.LOWER, 1, ([text], node) => {
      expectString(BUILTINS.LOWER, text, node);
      return text.toLowerCase();
    }),
    new NativeFunction(BUILTINS.TRIM, 1, ([text], node) => {
      expectString(BUILTINS.TRIM, text, node);
      return text.trim();
    }),
    new NativeFunction(BUILTINS.SPLIT, 2, ([text, separator], node) => {
      expectString(BUILTINS.SPLIT, text, node);
      expectString(BUILTINS.SPLIT, separator, node);
      return separator === "" ? letters(text) : text.split(separator);
    }),
    new NativeFunction(BUILTINS.JOIN, 2, ([list, separator], node) => {
      expectList(BUILTINS.JOIN, list, node);
      expectString(BUILTINS.JOIN, separator, node);
      return list.map((item) => display(item)).join(separator);
    }),
    // Every `old` becomes `replacement`.
    new NativeFunction(BUILTINS.REPLACE, 3, ([text, old, replacement], node) => {
      for (const value of [text, old, replacement]) expectString(BUILTINS.REPLACE, value, node);
      if (old === "") throw runtimeError(MSG.emptySearch(BUILTINS.REPLACE), node);
      return text.split(old).join(replacement);
    }),
    new NativeFunction(BUILTINS.STARTS_WITH, 2, ([text, start], node) => {
      expectString(BUILTINS.STARTS_WITH, text, node);
      expectString(BUILTINS.STARTS_WITH, start, node);
      return text.startsWith(start);
    }),
    new NativeFunction(BUILTINS.ENDS_WITH, 2, ([text, end], node) => {
      expectString(BUILTINS.ENDS_WITH, text, node);
      expectString(BUILTINS.ENDS_WITH, end, node);
      return text.endsWith(end);
    }),

    // ---- Lists ----
    new NativeFunction(BUILTINS.PUSH, 2, ([list, value], node) => {
      expectList(BUILTINS.PUSH, list, node);
      list.push(value);
      return list;
    }),
    new NativeFunction(BUILTINS.POP, 1, ([list], node) => {
      expectList(BUILTINS.POP, list, node);
      return list.length ? list.pop() : null;
    }),
    // A new sorted list; the original is left as it was.
    new NativeFunction(BUILTINS.SORT, 1, ([list], node) => {
      expectList(BUILTINS.SORT, list, node);
      const kind = typeof list[0];
      for (const item of list) {
        if ((typeof item !== "number" && typeof item !== "string") || typeof item !== kind) {
          throw runtimeError(MSG.cantSort(BUILTINS.SORT, typeName(list[0]), typeName(item)), node);
        }
      }
      return [...list].sort(kind === "number" ? (a, b) => a - b : (a, b) => (a < b ? -1 : a > b ? 1 : 0));
    }),
    new NativeFunction(BUILTINS.REVERSE, 1, ([value], node) => {
      expectListOrString(BUILTINS.REVERSE, value, node);
      return Array.isArray(value) ? [...value].reverse() : letters(value).reverse().join("");
    }),
    // Like JS slice: `end` is left out (optional), negative numbers count from the end,
    // and numbers past either end are clamped.
    new NativeFunction(BUILTINS.SLICE, 3, ([value, start, end], node) => {
      expectListOrString(BUILTINS.SLICE, value, node);
      expectInteger(BUILTINS.SLICE, start, node);
      if (end !== undefined) expectInteger(BUILTINS.SLICE, end, node);
      return Array.isArray(value) ? value.slice(start, end) : letters(value).slice(start, end).join("");
    }, 2),
    new NativeFunction(BUILTINS.FIND, 2, ([container, item], node) => {
      expectListOrString(BUILTINS.FIND, container, node);
      if (typeof container === "string") expectString(BUILTINS.FIND, item, node);
      return typeof container === "string" ? letterIndexOf(container, item) : container.indexOf(item);
    }),
    new NativeFunction(BUILTINS.SUM, 1, ([list], node) => {
      expectList(BUILTINS.SUM, list, node);
      let total = 0;
      for (const item of list) {
        if (typeof item !== "number") throw runtimeError(MSG.builtinArgType(BUILTINS.SUM, "sankhya ke list", `${typeName(item)} bhi`), node);
        total += item;
      }
      return total;
    }),

    // ---- Kosh (and `ba`, which also checks lists and strings) ----
    new NativeFunction(BUILTINS.KEYS, 1, ([dict], node) => {
      expectDict(BUILTINS.KEYS, dict, node);
      return [...dict.keys()];
    }),
    // A kosh has the key, a list has the item, or a string has the piece of text.
    new NativeFunction(BUILTINS.HAS, 2, ([container, item], node) => {
      if (isDict(container)) return container.has(checkKey(item, node));
      if (Array.isArray(container)) return container.includes(item);
      if (typeof container === "string") {
        expectString(BUILTINS.HAS, item, node);
        return container.includes(item);
      }
      throw runtimeError(MSG.builtinArgType(BUILTINS.HAS, "kosh, list ya shabd", typeName(container)), node);
    }),
    new NativeFunction(BUILTINS.REMOVE, 2, ([dict, key], node) => {
      expectDict(BUILTINS.REMOVE, dict, node);
      if (!dict.has(checkKey(key, node))) return null;
      const value = dict.get(key);
      dict.delete(key);
      return value;
    }),

    // ---- Functions that take a function ----
    // Call a function on each item: a new list of the results (map).
    new NativeFunction(BUILTINS.MAP, 2, ([list, fn], node) => {
      expectList(BUILTINS.MAP, list, node);
      expectFunction(BUILTINS.MAP, fn, node);
      return [...list].map((item) => call(fn, [item], node));
    }),
    // A new list of the items the function says sach to (filter).
    new NativeFunction(BUILTINS.FILTER, 2, ([list, fn], node) => {
      expectList(BUILTINS.FILTER, list, node);
      expectFunction(BUILTINS.FILTER, fn, node);
      return [...list].filter((item) => truthy(call(fn, [item], node)));
    }),

    // ---- Input ----
    // The question is optional. The answer is always text, or khaali when there is
    // nothing more to read (end of input, or Cancel in the playground).
    new NativeFunction(BUILTINS.INPUT, 1, ([question], node) => {
      if (!input) throw runtimeError(MSG.noInput(BUILTINS.INPUT), node);
      const answer = input(question === undefined ? "" : display(question));
      return answer === null || answer === undefined ? null : String(answer);
    }, 0),
  ];
}
