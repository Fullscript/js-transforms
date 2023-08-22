/**
 * Type definitions for VSCode autocompletion!
 *
 * @typedef {Object} TransformParams
 * @property {*} ast - The resulting AST as parsed by babel
 * @property {import("ast-types/gen/builders").builders} builder - Recast builder for transforming the AST
 * @property {*} options - Options passed into the transform from the CLI (if any)
 */

/**
 * Converts t("common:foobar") to t(l.common.foobar)
 *
 * @param {TransformParams} param0
 * @returns {import("ast-types").Visitor}
 */
const transform = ({ ast, builder, options }) => {
  let namespace = "";
  let addedLImport = false;
  const importPath = options[0];

  return {
    visitImportDeclaration: (path) => {
      const hasLSpecifier = path.node.specifiers.some((specifier) => {
        if (specifier.type === "ImportSpecifier") {
          return specifier.imported.name === "l";
        }

        return false;
      });

      const sourceIsLocales = path.node.source.value.includes("locales");

      if (hasLSpecifier && sourceIsLocales) {
        addedLImport = true;
      }

      return false;
    },
    visitCallExpression(path) {
      if (
        path.node.callee.name === "useTranslation" &&
        path.node.arguments.length !== 0
      ) {
        namespace = path.node.arguments[0].value;
        path.node.arguments = [];
      }

      if (path.node.callee.name === "t") {
        path.node.arguments = path.node.arguments.map((argument) => {
          if (argument.type === "StringLiteral") {
            if (namespace) {
              argument = builder.memberExpression(
                builder.memberExpression(
                  builder.identifier("l"),
                  builder.identifier(namespace)
                ),
                builder.identifier(argument.value.replace(":", "."))
              );
            } else {
              argument = builder.memberExpression(
                builder.identifier("l"),
                builder.identifier(argument.value.replaceAll(":", "."))
              );
            }

            if (!addedLImport) {
              addedLImport = true;
              ast.program.body.unshift(
                builder.importDeclaration(
                  [builder.importSpecifier(builder.identifier("l"))],
                  builder.literal(importPath)
                )
              );
            }
          }

          return argument;
        });
      }
    },
  };
};

export { transform };
