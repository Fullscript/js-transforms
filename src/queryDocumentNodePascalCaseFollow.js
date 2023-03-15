import { readFileSync } from "fs";
import { visit, types } from "recast";

const b = types.builders;

const transformedNames = JSON.parse(readFileSync("./tmp/queryDocumentNodePascalCase.json"));

const transform = (ast, callback) => {
  visit(ast, {
    visitIdentifier(path) {
      if (!transformedNames[path.node.name]) return false;
      path.node.name = transformedNames[path.node.name];

      this.traverse(path);
    },
  });

  callback(ast, transformedNames);
};

export { transform };
