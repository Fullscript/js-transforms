import { readFileSync } from "node:fs";

// Example command:
// yarn js-transforms aviaryMigrator './path/to/src/**/*.ts*' --options <path-to-config-file ex: ./Status.json>

// Example configuration file:
// NOTE: Props to add can be used to add any new required props with some default value
// {
//   "importSource": "@aviary",
//   "newImportSource": "@fullscript/aviary-web",
//   "componentName": "Status",
//   "newComponentName": "ComponentToRenameTo",
//   "propsToRename": {
//     "isColor": "intention",
//     "css": "customCss"
//   },
//   "propsToRemove": ["dotPlacement"],
//   "propsToAdd": {
//     "intention": "success"
//   }
// }

let needToCreateImportDeclaration;
let alreadyRemovedDeclaration;
let importDeclarationPath;
let newImportDeclarationPath;
let parentPath;

/**
 * Type definitions for VSCode autocompletion!
 *
 * @typedef {Object} TransformParams
 * @property {*} ast - The resulting AST as parsed by babel
 * @property {import("ast-types/gen/builders").builders} builder - Recast builder for transforming the AST
 * @property {*} options - Options passed into the transform from the CLI (if any)
 */

/**
 * Given an ImportDeclaration, if it's a importSource import, either remove specified componentName or the whole import declaration
 *
 * @param {import("ast-types/lib/node-path").NodePath<import("ast-types/gen/kinds").ImportDeclarationKind, any>} path
 * @param {string} componentName - The name of the component being converted
 * @param {string} importSource - The old import path for the component being converted
 * @returns
 */
const removeSpecifierOrImportDeclaration = (componentName, importSource) => {
  // Removes componentName specifier from importSource
  // First condition is when just a single specifier exists within the importDeclaration
  if (
    !alreadyRemovedDeclaration &&
    importDeclarationPath.node.source.value.startsWith(importSource) &&
    importDeclarationPath.node.specifiers.some(
      specifier => specifier?.imported?.name === componentName
    )
  ) {
    // just one specifier for the import declaration, we can remove the whole import declaration
    if (importDeclarationPath.node.specifiers.length === 1) {
      alreadyRemovedDeclaration = true;
      importDeclarationPath.prune();
    } else {
      // More than one specifier is declared, we just remove componentName
      importDeclarationPath.node.specifiers = importDeclarationPath.node.specifiers.filter(
        specifier => specifier.imported.name !== componentName
      );
    }
  }
};

/**
 * @param {import("ast-types/gen/builders").builders} builder - Recast builder for transforming the AST
 * @param {string} componentName - The name of the component to be imported
 * @param {string} newImportSource - The new import path for the component being converted
 */
const addImportDeclarationIfNeeded = (builder, componentName, newImportSource) => {
  // Add import { componentName } from "<newImportSource>" if it doesn't exist
  if (needToCreateImportDeclaration && !newImportDeclarationPath) {
    parentPath.node.body.unshift(
      builder.importDeclaration(
        [builder.importSpecifier(builder.identifier(componentName))],
        builder.stringLiteral(newImportSource)
      )
    );

    needToCreateImportDeclaration = false;
    return;
  }

  // Add componentName to existing newImportSource import declaration
  // If componentName is already imported, don't add it again
  const hasImportedComponent = newImportDeclarationPath?.node?.specifiers?.some(
    specifier => specifier?.imported?.name === componentName
  );

  if (!hasImportedComponent) {
    needToCreateImportDeclaration = false;
    newImportDeclarationPath?.node?.specifiers?.push(
      builder.importSpecifier(builder.identifier(componentName))
    );
  }
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

    // Not all components have closing elements
    // Ex: <Component />
    if (path.node.closingElement?.name?.name) {
      path.node.closingElement.name.name = newComponentName;
    }
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
 * Checks to see if the specified path is for the component that we intend to modify
 *
 * @param {import("ast-types/lib/node-path").NodePath<import("ast-types/gen/kinds").JSXElementKind, any>} path
 * @params {string} componentName - the component name that we want to modify
 * @returns {boolean} - true if we should modify the passed component, false otherwise
 */
const isComponentToModify = (path, componentName) => {
  // If importDeclarationPath is NOT set
  // then we are not importing the specified component from the specified importSource
  // this avoids the transform from modifying other components that are named the same from different imports
  return importDeclarationPath && path.node.openingElement.name.name === componentName;
};

/**
 * @param {TransformParams} param0
 * @returns {import("ast-types").Visitor}
 */
const transform = ({ builder, options }) => {
  const configPath = options[0];

  const {
    componentName,
    newComponentName,
    propsToRename = {},
    propsToRemove = [],
    propsToAdd = {},
    importSource,
    newImportSource,
  } = JSON.parse(readFileSync(configPath, { encoding: "utf-8" }));

  if (!componentName) {
    throw new Error(
      `componentName is required in ${configPath}, please specify the component you want to migrate.`
    );
  }

  if (!importSource) {
    throw new Error(
      `importSource is required in ${configPath}, please specify the existing import path for ${componentName}.`
    );
  }

  return {
    visitProgram(path) {
      // Need to reset these global properties to initial state for each processed file
      needToCreateImportDeclaration = true;
      importDeclarationPath = null;
      newImportDeclarationPath = null;
      alreadyRemovedDeclaration = false;
      parentPath = path;
    },
    visitImportDeclaration(path) {
      // If import declaration for old importSource is found, save it for later use
      if (
        path.node.source.value === importSource &&
        path.node.specifiers.some(specifier => specifier?.imported?.name === componentName)
      ) {
        importDeclarationPath = path;
      }

      if (path.node.source.value === newImportSource) {
        newImportDeclarationPath = path;
      }
    },
    visitJSXElement(path) {
      if (isComponentToModify(path, componentName)) {
        removeSpecifierOrImportDeclaration(componentName, importSource);
        addImportDeclarationIfNeeded(
          builder,
          newComponentName || componentName,
          newImportSource || importSource
        );

        renameComponent(path, componentName, newComponentName);
        renamePropsToRename(path, propsToRename);
        removePropsToRemove(path, propsToRemove, builder);
        addPropsToAdd(path, propsToAdd, builder);
      }
    },
  };
};

export { transform };
