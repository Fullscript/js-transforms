/**
 * Type definitions for VSCode autocompletion!
 *
 * @typedef {Object} TransformParams
 * @property {*} ast - The resulting AST as parsed by babel
 * @property {import("ast-types/gen/builders").builders} builder - Recast builder for transforming the AST
 * @property {*} options - Options passed into the transform from the CLI (if any)
 */

/**
 * @param {TransformParams} param0
 * @returns {import("ast-types").Visitor}
 */

const transform = ({ builder }) => {
  const reactHookPrefix = new RegExp("use\\w+");
  return {
    visitExportNamedDeclaration(path) {
      const includesHook = path.node.specifiers.some(specifier => {
        if (reactHookPrefix.test(specifier.local.name)) return true;
      });

      if (includesHook) {
        const newDeclarations = path.node.specifiers.map((_, index) => {
            const newDeclaration = builder.exportNamedDeclaration(path.node.declaration, [
              ...path.node.specifiers,
            ]);
          if (index === 0) {
            newDeclaration.comments = [
              builder.commentBlock("eslint-disable @fullscript/gql-no-manual-hook-declaration"),
            ];
            return newDeclaration;
          }
        });
        path.replace.apply(path, newDeclarations);
      }
    },
  };
};

export { transform };

