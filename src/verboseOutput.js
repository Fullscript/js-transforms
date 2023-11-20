import { verbose } from "./cli.js";

/**
 * Output log if verbose mode is enabled
 *
 * @param {string} log
 */
const verboseOutput = log => {
  if (verbose) {
    console.log(log);
  }
};

export { verboseOutput };
