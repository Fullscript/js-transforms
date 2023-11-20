import { readFileSync, writeFile } from "fs";
import glob from "glob";
import { print } from "recast";

import { parseCode } from "./parser.js";
import { AVAILABLE_TRANSFORMS } from "./availableTransforms.js";
import { validTransformName } from "./validTransformName.js";
import { dryRun, filePaths, transformToRun, options, verbose } from "./cli.js";
import { dryRunOutput } from "./dryRunOutput.js";
import { verboseOutput } from "./verboseOutput.js";
import { transformer } from "./transformer.js";

if (!validTransformName(transformToRun)) {
  console.log(
    `\n${transformToRun} is not a valid transform name. Available transforms are:\n${AVAILABLE_TRANSFORMS.map(
      availableTransform => `- ${availableTransform}`
    ).join("\n")}\n`
  );

  process.exit(1);
}

const transformPath = glob.sync(`./src/transforms/**/${transformToRun}.js`)[0];
const { transform } = await import(transformPath.replace("./src", "."));

filePaths.forEach(filePath => {
  verboseOutput(`reading: ${filePath}`);
  const code = readFileSync(filePath, { encoding: "utf-8", flag: "r" });

  verboseOutput(`parsing: ${filePath}`);
  const ast = parseCode(code);

  verboseOutput(`transforming: ${filePath}`);
  const node = transformer({
    ast,
    transformToRun: transform,
    options,
  });

  verboseOutput("printing code changes");
  const transformedCode = print(node).code;

  verboseOutput(`Writing to: ${filePath}`);
  if (dryRun) {
    dryRunOutput(transformedCode, filePath);
  } else {
    writeFile(filePath, transformedCode, writeError => {
      if (writeError) {
        throw writeError();
      }
    });
  }
});
