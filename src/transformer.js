import { visit, types } from "recast";

const builder = types.builders;

const transformer = ({ ast, transformToRun, onTransformed, options }) => {
  const visitMethods = transformToRun({ builder, options });

  const visitMethodsWithTraverse = Object.keys(visitMethods).reduce(
    (acc, methodName) => {
      acc[methodName] = function (path, ...args) {
        visitMethods[methodName](path, ...args);

        this.traverse(path);
      };

      return acc;
    },
    {}
  );

  visit(ast, visitMethodsWithTraverse);

  onTransformed(ast);
};

export { transformer };
