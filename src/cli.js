import { sync } from "glob";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { AVAILABLE_TRANSFORMS } from "./availableTransforms.js";

const yargsInstance = yargs(hideBin(process.argv))
  .usage("Fullscript's JS transforms!\n\nUsage: <transformName> [options]")
  .demandCommand(2)
  .positional("transformName", {
    desc: "transform to run",
    type: "string",
    choices: AVAILABLE_TRANSFORMS,
  })
  .option("options", {
    alias: "o",
    describe: "Options passed to the transform",
    array: true,
  })
  .option("verbose", {
    describe: "Output extra debugging info",
    boolean: true,
  })
  .option("dry-run", {
    alias: "d",
    describe: "Log output to console without writing to files",
    boolean: true,
  })
  .help("h")
  .alias("h", "help")
  .alias("version", "v");

const args = yargsInstance.argv;

const positionalArgs = args._;

const transformToRun = positionalArgs[0];
const filePaths = sync(positionalArgs[1]);
const dryRun = args.dryRun;
const options = args.options;
const verbose = args.verbose;

export { transformToRun, filePaths, dryRun, options, verbose };
