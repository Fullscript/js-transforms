import babelParser from "@babel/parser";
import { readFile, writeFile } from "fs";
import glob from "glob";
import { parse, print } from "recast";

// Comment out which one you want to use/run
import { transformer } from "./createMockToObjectParams.js";

const parseCode = code => {
  return parse(code, {
    parser: {
      parse: source => {
        return babelParser.parse(source, {
          // sourceFilename: options.fileName,
          allowAwaitOutsideFunction: true,
          allowImportExportEverywhere: true,
          allowReturnOutsideFunction: true,
          allowSuperOutsideMethod: true,
          allowUndeclaredExports: true,
          tokens: true,
          plugins: [
            "typescript",
            "jsx",
            "asyncDoExpressions",
            "asyncGenerators",
            "bigInt",
            "classPrivateMethods",
            "classPrivateProperties",
            "classProperties",
            "classStaticBlock",
            "decimal",
            // decoratorSyntax === "new" ? "decorators" : "decorators-legacy",
            "doExpressions",
            "dynamicImport",
            "exportDefaultFrom",
            "exportNamespaceFrom",
            "functionBind",
            "functionSent",
            "importAssertions",
            "importMeta",
            "logicalAssignment",
            "moduleBlocks",
            "moduleStringNames",
            "nullishCoalescingOperator",
            "numericSeparator",
            "objectRestSpread",
            "optionalCatchBinding",
            "optionalChaining",
            "partialApplication",
            "privateIn",
            "throwExpressions",
            "topLevelAwait",
          ],
        });
      },
    },
  });
};

// eslint-disable-next-line no-undef
const filePaths = glob.sync(process.argv[2]);

filePaths.forEach(filePath => {
  readFile(filePath, "utf-8", (err, code) => {
    if (err) {
      console.error(err);
      return;
    }

    transformer(parseCode(code), node => {
      const transformedCode = print(node).code;
      
      if (process.argv[3] === "--dry-run") {
        console.log(transformedCode);
      } else {
        writeFile(filePath, transformedCode, writeError => {
          console.log(writeError);
        });
      }
    });
  });
});
