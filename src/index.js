import { readFile, writeFile } from "fs";
import { print } from "recast";

import { parseCode } from "./parser.js";
import { validTransformName } from "./validTransformName.js";
import { dryRun, filePaths, transformToRun, options } from "./cli.js";
import { dryRunOutput } from "./dryRunOutput.js";
import { transformer } from "./transformer.js";

if (!validTransformName(transformToRun)) {
  throw new Error(`${transformToRun} is not a valid transform name.`);
}

const { transform } = await import(`./transforms/${transformToRun}.js`);

filePaths.forEach((filePath) => {
  readFile(filePath, "utf-8", (err, code) => {
    if (err) {
      throw err;
    }

    transformer({
      ast: parseCode(code),
      transformToRun: transform,
      onTransformed: (node) => {
        const transformedCode = print(node).code;

        if (dryRun) {
          dryRunOutput(transformedCode, filePath);
        } else {
          writeFile(filePath, transformedCode, (writeError) => {
            if (writeError) {
              throw writeError();
            }
          });
        }
      },
      options,
    });
  });
});
