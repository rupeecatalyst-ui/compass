/**
 * BAT-only preload: allow Node scripts to import server-only modules.
 * Does not change application runtime — scripts must opt in via --import.
 */
import Module from "node:module";

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "server-only") {
    return {};
  }
  return originalLoad.apply(this, arguments);
};
