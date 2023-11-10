import glob from "glob";

// Relative to the directory where the command is run
const transforms = glob.sync("./src/transforms/**/*.js");

const AVAILABLE_TRANSFORMS = transforms
  .filter((transform) => !transform.endsWith("spec.js"))
  .map((transform) => {
    return transform
      .replace(/(\.\/src\/transforms\/|\.js)/gm, "")
      .split("/")
      .at(-1);
  });

export { AVAILABLE_TRANSFORMS };
