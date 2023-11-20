import glob from "glob";

import { __dirname } from "./dirname.js";

// Relative to the directory where the command is run
const transforms = glob.sync(`${__dirname}/transforms/**/*.js`);

const AVAILABLE_TRANSFORMS = transforms
  .filter(transform => !transform.endsWith("spec.js"))
  .map(transform => {
    return transform
      .replace(/(\.\/src\/transforms\/|\.js)/gm, "")
      .split("/")
      .at(-1);
  });

export { AVAILABLE_TRANSFORMS };
