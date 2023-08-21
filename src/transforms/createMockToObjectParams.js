/**
 * Type definitions for VSCode autocompletion!
 *
 * @typedef {Object} TransformParams
 * @property {import("ast-types/gen/builders").builders} builder - Recast builder for transforming the AST
 * @property {*} options - Options passed into the transform from the CLI (if any)
 */

/**
 * @param {TransformParams} param0
 * @returns {import("ast-types").Visitor}
 */
const transform = ({ builder }) => {
  return {
    visitCallExpression(path) {
      if (
        path.node.callee.name === "createMock" &&
        path.node.arguments?.[0]?.type === "StringLiteral"
      ) {
        const typeName = path.node.arguments[0];
        const overrides = path.node.arguments?.[1];

        const createMockObjectParam = builder.objectExpression([
          builder.objectProperty(builder.identifier("typeName"), typeName),
        ]);

        if (overrides) {
          createMockObjectParam.properties.push(
            builder.objectProperty(builder.identifier("overrides"), overrides)
          );
        }

        path.node.arguments = [createMockObjectParam];
      }
    },
  };
};

export { transform };
