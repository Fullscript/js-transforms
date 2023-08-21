import babelParser from "@babel/parser";
import { parse } from "recast";

const parseCode = code => {
  return parse(code, {
    parser: {
      parse: source => {
        return babelParser.parse(source, {
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

export { parseCode };