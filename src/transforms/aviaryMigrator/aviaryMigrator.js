import { readFileSync } from "node:fs";

// Example command:
// yarn js-transforms aviaryMigrator './path/to/src/**/*.ts*' --options <path-to-config-file ex: ./Status.json>

// Example configuration file:
// NOTE: Props to add can be used to add any new required props with some default value
// {
//   "componentName": "Status",
//   "propsToRename": {
//     "isColor": "intention"
//   },
//   "propsToRemove": ["dotPlacement"],
//   "propsToAdd": {
//     "intention": "success"
//   }
// }

let needToCreateImportDeclaration = true;
let importDeclarationNode;
let parentNode;

/**
 * Type definitions for VSCode autocompletion!
 *
 * @typedef {Object} TransformParams
 * @property {*} ast - The resulting AST as parsed by babel
 * @property {import("ast-types/gen/builders").builders} builder - Recast builder for transforming the AST
 * @property {*} options - Options passed into the transform from the CLI (if any)
 */

/**
 * Given an ImportDeclaration, if it's an @aviary import, either remove specified componentName or the whole import declaration
 *
 * @param {import("ast-types/lib/node-path").NodePath<import("ast-types/gen/kinds").ImportDeclarationKind, any>} path
 * @param {string} componentName - The name of the component being converted
 * @returns
 */
const removeSpecifierOrImportDeclaration = (path, componentName) => {
  // Removes componentName specifier from @aviary
  // First condition is when just a single specifier exists within the importDeclaration
  if (
    path.node.source.value.startsWith("@aviary") &&
    path.node.specifiers.some(specifier => specifier?.imported?.name === componentName)
  ) {
    // just one specifier for the import declaration, we can remove the whole import declaration
    if (path.node.specifiers.length === 1) {
      return path.prune();
    }

    // More than one specifier is declared, we just remove componentName
    path.node.specifiers = path.node.specifiers.filter(
      specifier => specifier.imported.name !== componentName
    );
  }
};

/**
 * @param {import("ast-types/gen/builders").builders} builder - Recast builder for transforming the AST
 * @param {string} componentName - The name of the component to be imported
 */
const addImportDeclarationIfNeeded = (builder, componentName) => {
  // Add componentName to existing @fullscript/aviary-web import declaration
  if (importDeclarationNode) {
    // If componentName is already imported, don't add it again
    const hasImportedComponent = importDeclarationNode.specifiers.some(
      specifier => specifier?.imported?.name === componentName
    );

    if (!hasImportedComponent) {
      needToCreateImportDeclaration = false;
      path.node.specifiers.push(
        builder.importSpecifier(builder.identifier(newComponentName || componentName))
      );
    }
  }

  // Add import { componentName } from "@fullscript/aviary-web" if it doesn't exist
  if (needToCreateImportDeclaration) {
    parentNode.body.unshift(
      builder.importDeclaration(
        [builder.importSpecifier(builder.identifier(componentName))],
        builder.stringLiteral("@fullscript/aviary-web")
      )
    );
  }

  needToCreateImportDeclaration = false;
};

/**
 * Renames props that have been specified for to rename from the specified JSXElement
 *
 * @param {import("ast-types/lib/node-path").NodePath<import("ast-types/gen/kinds").JSXElementKind, any>} path
 * @param {string} componentName - The old component name
 * @param {string} [newComponentName] - The new component name if specified (optional)
 */
const renameComponent = (path, componentName, newComponentName) => {
  if (!newComponentName) return;

  if (componentName !== newComponentName) {
    path.node.openingElement.name.name = newComponentName;
    path.node.closingElement.name.name = newComponentName;
  }
};

/**
 * Renames props that have been specified for to rename from the specified JSXElement
 *
 * @param {import("ast-types/lib/node-path").NodePath<import("ast-types/gen/kinds").JSXElementKind, any>} path
 * @param {string[]} propsToRemove - Array of prop names to remove from the JSXElement
 */
const renamePropsToRename = (path, propsToRename) => {
  path.node.openingElement.attributes.forEach(attribute => {
    if (attribute?.name?.name && propsToRename?.[attribute.name.name]) {
      attribute.name.name = propsToRename[attribute.name.name];
    }

    // All new aviary components use customCss instead of the traditional css attribute
    if (attribute?.name?.name === "css") {
      attribute.name.name = "customCss";
    }
  });
};

/**
 * Removes props that have been specified for removal from the specified JSXElement
 *
 * @param {import("ast-types/lib/node-path").NodePath<import("ast-types/gen/kinds").JSXElementKind, any>} path
 * @param {string[]} propsToRemove - Array of prop names to remove from the JSXElement
 */
const removePropsToRemove = (path, propsToRemove) => {
  if (propsToRemove?.length > 0) {
    path.node.openingElement.attributes = path.node.openingElement.attributes.filter(attribute => {
      return !propsToRemove.includes(attribute?.name?.name);
    });
  }
};

/**
 * Adds props to the JSXElement that have been specified to add
 *
 * @param {import("ast-types/lib/node-path").NodePath<import("ast-types/gen/kinds").JSXElementKind, any>} path
 * @param {Record<string, string>} propsToAdd - Array of prop names to remove from the JSXElement
 * @param {import("ast-types/gen/builders").builders} builder - Recast builder for transforming the AST
 */
const addPropsToAdd = (path, propsToAdd, builder) => {
  const propsToAddNames = Object.keys(propsToAdd);

  if (propsToAddNames?.length > 0) {
    propsToAddNames.forEach(propName => {
      const hasPropAlready = path.node.openingElement.attributes.some(
        attribute => attribute?.name?.name === propName
      );

      if (!hasPropAlready) {
        path.node.openingElement.attributes.push(
          builder.jsxAttribute(
            builder.jsxIdentifier(propName),
            builder.jsxExpressionContainer(builder.stringLiteral(propsToAdd[propName]))
          )
        );
      }
    });
  }
};

/**
 * @param {TransformParams} param0
 * @returns {import("ast-types").Visitor}
 */
const transform = ({ builder, options }) => {
  const configPath = options[0];

  const { componentName, newComponentName, propsToRename, propsToRemove, propsToAdd } = JSON.parse(
    readFileSync(configPath, { encoding: "utf-8" })
  );

  return {
    visitProgram(path) {
      // Need to reset these global properties to initial state for each processed file
      needToCreateImportDeclaration = true;
      importDeclarationNode = null;
      parentNode = path.node;
    },
    visitImportDeclaration(path) {
      // If import declaration fo @fullscript/aviary-web is found, save it for later use
      if (path.node.source.value === "@fullscript/aviary-web") {
        importDeclarationNode = path.node;
      }

      removeSpecifierOrImportDeclaration(path, componentName);
    },
    visitJSXElement(path) {
      if (path.node.openingElement.name.name === componentName) {
        addImportDeclarationIfNeeded(builder, newComponentName || componentName);

        renameComponent(path, componentName, newComponentName);
        renamePropsToRename(path, propsToRename);
        removePropsToRemove(path, propsToRemove, builder);
        addPropsToAdd(path, propsToAdd, builder);
      }
    },
  };
};

export { transform };
