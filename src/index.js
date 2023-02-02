import babelParser from "@babel/parser";
import { readFile, writeFile } from "fs";
import glob from "glob";
import { parse, print } from "recast";

const VALID_TRANSFORM_NAMES = [
  "createMockToObjectParams",
  "createFragmentToCreateMock",
];

const parseCode = (code) => {
  return parse(code, {
    parser: {
      parse: (source) => {
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

const [_1, _2, transformToRun, pathGlob, ...transformOptions] = process.argv;
const filePaths = glob.sync(pathGlob);

const validTransform = VALID_TRANSFORM_NAMES.find(
  (transformName) => transformName === transformToRun
);

if (!validTransform) {
  throw new Error(`${transformToRun} is not a valid transform name.`);
}

filePaths.forEach((filePath) => {
  readFile(filePath, "utf-8", async (err, code) => {
    if (err) {
      console.error(err);
      return;
    }

    const { transform } = await import(`./${transformToRun}.js`);

    transform(
      parseCode(code),
      (node) => {
        const transformedCode = print(node).code;

        writeFile(filePath, transformedCode, (writeError) => {
          console.log(writeError);
        });
      },
      transformOptions
    );
  });
});
