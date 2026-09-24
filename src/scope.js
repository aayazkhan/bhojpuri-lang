import { runtimeError } from "./errors.js";
import { MSG } from "./messages.js";
import { closestName } from "./suggest.js";

/** Variables: each block, function call and program gets a Scope, linked to the one around it. */
export class Scope {
  constructor(parent = null) {
    this.parent = parent;
    this.vars = new Map();
    // At the interactive prompt, `maan la x = ...` may be typed again to start over.
    this.allowRedeclare = false;
  }

  declare(name, value, node) {
    if (this.vars.has(name) && !this.allowRedeclare) throw runtimeError(MSG.alreadyDeclared(name), node);
    this.vars.set(name, value);
  }

  owner(name, node) {
    for (let scope = this; scope; scope = scope.parent) {
      if (scope.vars.has(name)) return scope;
    }
    throw runtimeError(MSG.notDeclared(name, closestName(name, this.visibleNames())), node);
  }

  /** Every name that can be used from here, nearest scope first. */
  *visibleNames() {
    for (let scope = this; scope; scope = scope.parent) yield* scope.vars.keys();
  }

  get(name, node) {
    return this.owner(name, node).vars.get(name);
  }

  set(name, value, node) {
    this.owner(name, node).vars.set(name, value);
  }
}
