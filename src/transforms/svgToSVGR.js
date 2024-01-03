import { namedTypes as n } from "ast-types";

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
  const importReplacements = {};

  return {
    visitImportDeclaration(path) {
      const node = path.node;
      const source = node.source.value;

      // Check if the source ends with '.svg'
      if (source.endsWith(".svg")) {
        const sourceArray = source.split("/");
        const fileName = sourceArray.pop()

        // Generate the new import name
        const newImportName = fileName
          .replace(".svg", "")
          .split("-")
          .map(s => s.charAt(0).toUpperCase() + s.slice(1))
          .join("");

        const oldImportName = node.specifiers[0].local.name;

        // Remember the replacement
        importReplacements[oldImportName] = newImportName;


        // Change the import source
        node.source.value = sourceArray.join("/") + "/" + newImportName;

        // Change the import default specifier
        node.specifiers[0].local.name = newImportName;
      } else if (source.endsWith(".svg?url")) {
        // If the source ends with '.svg?url', just remove '?url'
        node.source.value = source.replace("?url", "");
      }

      return false;
    },
    visitExportNamedDeclaration(path) {
      const { node } = path;

      if (node.specifiers && node.specifiers.length > 0) {
        node.specifiers.forEach(specifier => {
          const oldExportName = specifier.exported.name;
          if (importReplacements.hasOwnProperty(oldExportName)) {
            const newImportName = importReplacements[oldExportName];

            // Insert const declaration before the export declaration
            const constDeclaration = builder.variableDeclaration("const", [
              builder.variableDeclarator(
                builder.identifier(oldExportName),
                builder.identifier(newImportName)
              ),
            ]);
            path.insertBefore(constDeclaration);

            // Change the local name to the old export name
            specifier.local.name = oldExportName;
          }
        });
      }

      return false;
    },
    visitJSXElement(path) {
      const { node } = path;

      // If this JSX element's name is one of the old import names
      if (
        n.JSXIdentifier.check(node.openingElement.name) &&
        importReplacements.hasOwnProperty(node.openingElement.name.name)
      ) {
        // Replace it with the new import name
        const newImportName = importReplacements[node.openingElement.name.name];
        node.openingElement.name = builder.jsxIdentifier(newImportName);
        if (node.closingElement) {
          node.closingElement.name = builder.jsxIdentifier(newImportName);
        }
      }

      return false;
    },
  };
};

export { transform };
