import { KEYWORDS } from "./keywords.js";
import { runtimeError } from "./errors.js";
import { MSG } from "./messages.js";
import { closestName } from "./suggest.js";

// The kinds of value a program works with, how they're shown, and the rules for indexes and keys.
// Numbers, strings, sach/jhooth and khaali are plain JS values; a list is an array; a kosh is a Map.

/** A function defined with `kaam`; it closes over the scope it was defined in. */
export class UserFunction {
  constructor(node, closure) {
    this.name = node.name;
    this.params = node.params;
    this.body = node.body;
    this.closure = closure;
  }
}

export class NativeFunction {
  /** `arity` is how many arguments it takes; `minArity` is lower when the last ones are optional. */
  constructor(name, arity, impl, minArity = arity) {
    this.name = name;
    this.arity = arity;
    this.minArity = minArity;
    this.impl = impl;
  }
}

export const isFunction = (value) => value instanceof UserFunction || value instanceof NativeFunction;

// A dictionary (`kosh`) is a JS Map: it keeps keys in the order they were added,
// and 1 and "1" stay different keys.
export const isDict = (value) => value instanceof Map;

/** How a value looks when printed or joined into a string. */
export function display(value, seen = new Set()) {
  if (value === null) return KEYWORDS.NULL;
  if (value === true) return KEYWORDS.TRUE;
  if (value === false) return KEYWORDS.FALSE;
  if (isFunction(value)) return value.name ? `<${KEYWORDS.FUNCTION} ${value.name}>` : `<${KEYWORDS.FUNCTION}>`;
  if (Array.isArray(value) || isDict(value)) {
    if (seen.has(value)) return Array.isArray(value) ? "[...]" : "{...}";
    seen.add(value);
    // Inside a list or kosh, strings keep their quotes so ["1"] and [1] look different.
    const inner = (item) => (typeof item === "string" ? JSON.stringify(item) : display(item, seen));
    const text = Array.isArray(value)
      ? `[${value.map(inner).join(", ")}]`
      : `{${[...value].map(([key, item]) => `${inner(key)}: ${inner(item)}`).join(", ")}}`;
    seen.delete(value);
    return text;
  }
  // Numbers are shown to 15 significant digits, so 0.1 + 0.2 shows as 0.3 rather than
  // 0.30000000000000004. Only the display is rounded; the value itself is unchanged.
  if (typeof value === "number" && !Number.isInteger(value)) return String(Number(value.toPrecision(15)));
  return String(value);
}

/**
 * The name of a value's type, as `kism` returns it and as error messages say it:
 * sankhya, shabd, sach/jhooth, khaali, list, kosh or kaam.
 */
export function typeName(value) {
  if (typeof value === "number") return "sankhya";
  if (typeof value === "string") return "shabd";
  if (value === null) return KEYWORDS.NULL;
  if (typeof value === "boolean") return `${KEYWORDS.TRUE}/${KEYWORDS.FALSE}`;
  if (Array.isArray(value)) return "list";
  if (isDict(value)) return "kosh";
  if (isFunction(value)) return KEYWORDS.FUNCTION;
  return typeof value;
}

export const truthy = (value) => value !== null && value !== false && value !== 0 && value !== "" && !Number.isNaN(value);

/** Validate `object[index]` and return the index as a number. */
export function checkIndex(object, index, node) {
  if (!Array.isArray(object) && typeof object !== "string") {
    throw runtimeError(MSG.notIndexable(typeName(object)), node);
  }
  if (!Number.isInteger(index)) throw runtimeError(MSG.badIndex(display(index)), node);
  if (index < 0 || index >= object.length) throw runtimeError(MSG.indexOutOfRange(index, object.length), node);
  return index;
}


/** Validate a kosh key: only strings and numbers can be keys. */
export function checkKey(key, node) {
  if (typeof key !== "string" && typeof key !== "number") throw runtimeError(MSG.badKey(typeName(key)), node);
  return key;
}

/** Read `dict[key]`, which must already exist. */
export function getEntry(dict, key, node) {
  if (!dict.has(checkKey(key, node))) {
    const hint = typeof key === "string" ? closestName(key, [...dict.keys()].filter((k) => typeof k === "string")) : null;
    throw runtimeError(MSG.missingKey(typeof key === "string" ? JSON.stringify(key) : String(key), hint), node);
  }
  return dict.get(key);
}
