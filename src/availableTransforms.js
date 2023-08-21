import glob from "glob";

// Relative to the directory where the command is run
const transforms = glob.sync("./src/transforms/*.js");

const AVAILABLE_TRANSFORMS = transforms.map((transform) =>
  transform.replace(/(\.\/src\/transforms\/|\.js)/gm, "")
);

export { AVAILABLE_TRANSFORMS };
