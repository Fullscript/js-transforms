import { visit, types } from "recast";

const b = types.builders;

const transform = (ast, callback) => {
  visit(ast, {
    visitCallExpression(path) {
      if (path.node.callee.name === "createMock" && path.node.arguments?.[0]?.type === "StringLiteral") {
        const typeName = path.node.arguments[0];
        const overrides = path.node.arguments?.[1];

        const createMockObjectParam = b.objectExpression([
          b.objectProperty(b.identifier("typeName"), typeName),
        ]);

        if (overrides) {
          createMockObjectParam.properties.push(b.objectProperty(b.identifier("overrides"), overrides));
        }

        path.node.arguments = [createMockObjectParam];
      }

      this.traverse(path);
    },
  });

  callback(ast);
};

export { transform };