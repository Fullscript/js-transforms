import { visit, types } from "recast";

const builder = types.builders;

const transformer = ({ ast, transformToRun, filePath, options }) => {
  const visitMethods = transformToRun({ ast, builder, filePath, options });

  const visitMethodsWithTraverse = Object.keys(visitMethods).reduce((acc, methodName) => {
    // using function here for this binding
    acc[methodName] = function (path, ...args) {
      visitMethods[methodName](path, ...args);

      this.traverse(path);
    };

    return acc;
  }, {});

  visit(ast, visitMethodsWithTraverse);

  return ast;
};

export { transformer };
