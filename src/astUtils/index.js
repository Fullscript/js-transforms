/**
 * Is the specified node an Identifier which matches the passed name?
 * If so, return true, otherwise false.
 *
 * @param {import("ast-types/gen/kinds").ExpressionKind} node
 * @param {string} name
 * @returns {boolean}
 */
const isIdentifierWithName = (node, name) => {
  return node.type === "Identifier" && node.name === name;
};

/**
 * Is the specified node a CallExpression which matches the passed name?
 * If so, return true, otherwise false.
 *
 * @param {import("ast-types/gen/kinds").CallExpressionKind} node
 * @param {string} name
 * @returns {boolean}
 */
const isCallExpressionWithName = (node, name) => {
  return node?.type === "CallExpression" && node?.callee?.name === name;
};

/**
 * Is the specified node a UnaryExpression which matches the passed name?
 * If so, return true, otherwise false.
 *
 * @param {import("ast-types/gen/kinds").UnaryExpressionKind} node
 * @param {string} name
 * @returns {boolean}
 */
const isUnaryExpressionWithName = (node, name) => {
  return (
    node.test.type === "UnaryExpression" && node.test.argument.name === name
  );
};

/**
 * Is the specified node an ImportSpecifier which matches the passed name?
 * If so, return true, otherwise false.
 *
 * @param {import("ast-types/gen/kinds").ImportSpecifierKind} node
 * @param {string} name
 * @returns {boolean}
 */
const isImportSpecifierWithName = (node, name) => {
  return node.type === "ImportSpecifier" && node.imported.name === name;
};

/**
 * Is the specified node a JSXAttribute?
 * If so, return true, otherwise false.
 *
 * @param {import("ast-types/gen/kinds").JSXAttributeKind} node
 * @returns {boolean}
 */
const isJSXAttribute = (node) => {
  return node.type === "JSXAttribute";
};

/**
 * Is the specified node a JSXExpressionContainer?
 * If so, return true, otherwise false.
 *
 * @param {import("ast-types/gen/kinds").JSXExpressionContainerKind} node
 * @returns {boolean}
 */
const isJSXExpressionContainer = (node) => {
  return node.type === "JSXExpressionContainer";
};

/**
 * Is the specified node a JSXElement?
 * If so, return true, otherwise false.
 *
 * @param {import("ast-types/gen/kinds").JSXElementKind} node
 * @returns {boolean}
 */
const isJSXElement = (node) => {
  return node.type === "JSXElement";
};

/**
 * Is the specified node a JSXFragment?
 * If so, return true, otherwise false.
 *
 * @param {import("ast-types/gen/kinds").JSXFragmentKind} node
 * @returns {boolean}
 */
const isJSXFragment = (node) => {
  return node.type === "JSXFragment";
};

/**
 * Is the specified node a BlockStatement?
 * If so, return true, otherwise false.
 *
 * @param {import("ast-types/gen/kinds").BlockStatementKind} node
 * @returns {boolean}
 */
const isBlockStatement = (node) => {
  return node.type === "BlockStatement";
};

/**
 * Is the specified node a ReturnStatement?
 * If so, return true, otherwise false.
 *
 * @param {import("ast-types/gen/kinds").ReturnStatementKind} node
 * @returns {boolean}
 */
const isReturnStatement = (node) => {
  return node.type === "ReturnStatement";
};

/**
 * Is the specified node a LogicalExpression?
 * If so, return true, otherwise false.
 *
 * @param {import("ast-types/gen/kinds").LogicalExpressionKind} node
 * @returns {boolean}
 */
const isLogicalExpression = (node) => {
  return node.type === "LogicalExpression";
};

/**
 * Is the specified node a UnaryExpression?
 * If so, return true, otherwise false.
 *
 * @param {import("ast-types/gen/kinds").UnaryExpressionKind} node
 * @returns {boolean}
 */
const isUnaryExpression = (node) => {
  return node.type === "UnaryExpression";
};

/**
 * Is the specified node a StringLiteral?
 * If so, return true, otherwise false.
 *
 * @param {import("ast-types/gen/kinds").StringLiteralKind} node
 * @returns {boolean}
 */
const isStringLiteral = (node) => {
  return node.type === "StringLiteral";
};

/**
 * Is the specified node a VariableDeclarator?
 * If so, return true, otherwise false.
 *
 * @param {import("ast-types/gen/kinds").VariableDeclaratorKind} node
 * @returns {boolean}
 */
const isVariableDeclarator = (node) => {
  return node.type === "VariableDeclarator";
};

/**
 * Returns true if the ImportDeclaration contains the passed specifier name
 *
 * @param {import("ast-types/gen/kinds").ImportDeclarationKind, any>} node
 * @param {string} name
 * @returns {boolean}
 */
const containsSpecifierWithName = (node, name) => {
  if (!node || node.specifiers.length === 0) return false;

  return node.specifiers.some((specifier) => {
    return isImportSpecifierWithName(specifier, name);
  });
};

/**
 * Removes the given specifier that matches the passed name.
 * May also remove the entire ImportDeclaration if there's just one specifier.
 *
 * @param {import("ast-types/lib/node-path").NodePath<import("ast-types/gen/kinds").ImportDeclarationKind, any>} path
 * @param {string} specifierToRemove
 * @return {void}
 */
const removeImportSpecifier = (path, specifierToRemove) => {
  if (!path) return;

  if (path.node.specifiers?.length === 1) {
    path.prune();
  } else {
    path.node.specifiers = path.node.specifiers?.filter(
      (specifier) => specifier.imported.name !== specifierToRemove
    );
  }
};

export {
  isCallExpressionWithName,
  isIdentifierWithName,
  isImportSpecifierWithName,
  isUnaryExpressionWithName,
  isJSXAttribute,
  isJSXExpressionContainer,
  isJSXElement,
  isJSXFragment,
  isBlockStatement,
  isReturnStatement,
  isLogicalExpression,
  isUnaryExpression,
  isStringLiteral,
  isVariableDeclarator,
  containsSpecifierWithName,
  removeImportSpecifier,
};
