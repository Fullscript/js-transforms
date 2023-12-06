/**
 * Given a ConditionalExpression and a variable name, if the variable name matches test, it will remove the ternary and leave the appropriate output.
 * example:
 * ```
 *  // before
 *  const something = matchingVariable ? "foo" : "bar";
 *  // after
 *  const something = "foo";
 * ```
 *
 * negation example:
 * ```
 *  // before
 *  const something = !matchingVariable ? "foo" : "bar";
 *  // after
 *  const something = "bar";
 * ```
 *
 * @param {import("ast-types/lib/node-path").NodePath<import("ast-types/gen/kinds").ConditionalExpressionKind, any>} path
 * @param {string} name
 */
const collapseConditionalExpressionIfMatchingIdentifier = (path, name) => {
  if (isIdentifierWithName(path.node.test, name)) {
    path.replace(path.node.consequent);
  } else if (isUnaryExpressionWithName(path.node.test, name)) {
    // const something = !isFlipperEnabled ? "foo" : "bar";
    path.replace(path.node.alternate);
  }
};

/**
 * Is the specified node an Identifier which matches the passed name?
 *
 * @param {import("ast-types/gen/kinds").ExpressionKind} node
 * @param {string} name
 * @returns {boolean}
 */
const isIdentifierWithName = (node, name) => {
  if (!node) return false;
  return node.type === "Identifier" && node.name === name;
};

/**
 * Is the specified node a CallExpression which matches the passed name?
 *
 * @param {import("ast-types/gen/kinds").CallExpressionKind} node
 * @param {string} name
 * @returns {boolean}
 */
const isCallExpressionWithName = (node, name) => {
  if (!node) return false;
  return node.type === "CallExpression" && node.callee.name === name;
};

/**
 * Does the specified ArrayPattern contain the passed name?
 *
 * @param {import("ast-types/gen/kinds").ArrayPatternKind} node
 * @param {string} name
 * @returns {boolean}
 */
const isElementInArrayPattern = (node, name) => {
  return node.elements.some(element => element.value === name);
};

/**
 * Is the specified node a UnaryExpression which matches the passed name?
 *
 * @param {import("ast-types/gen/kinds").UnaryExpressionKind} node
 * @param {string} name
 * @returns {boolean}
 */
const isUnaryExpressionWithName = (node, name) => {
  if (!node) return false;
  return node.type === "UnaryExpression" && node.argument.name === name;
};

/**
 * Is the specified node an ImportSpecifier which matches the passed name?
 *
 * @param {import("ast-types/gen/kinds").ImportSpecifierKind} node
 * @param {string} name
 * @returns {boolean}
 */
const isImportSpecifierWithName = (node, name) => {
  if (!node) return false;
  return node.type === "ImportSpecifier" && node.imported.name === name;
};

/**
 * Is the specifier node an ObjectProperty whose key matches name?
 *
 * @param {import("ast-types/gen/kinds").ObjectPropertyKind} node
 * @param {string} key
 * @returns {boolean}
 */
const isObjectPropertyWithKey = (node, key) => {
  if (!node) return false;
  return node.type === "ObjectProperty" && node.key.name === key;
};

/**
 * Is the specified node a ArrayExpression?
 *
 * @param {import("ast-types/gen/kinds").ArrayExpressionKind} node
 * @returns {boolean}
 */
const isArrayExpression = node => {
  return node?.type === "ArrayExpression";
};

/**
 * Is the specified node a JSXAttribute?
 *
 * @param {import("ast-types/gen/kinds").JSXAttributeKind} node
 * @returns {boolean}
 */
const isJSXAttribute = node => {
  return node?.type === "JSXAttribute";
};

/**
 * Is the specified node a JSXExpressionContainer?
 *
 * @param {import("ast-types/gen/kinds").JSXExpressionContainerKind} node
 * @returns {boolean}
 */
const isJSXExpressionContainer = node => {
  return node?.type === "JSXExpressionContainer";
};

/**
 * Is the specified node a JSXElement?
 *
 * @param {import("ast-types/gen/kinds").JSXElementKind} node
 * @returns {boolean}
 */
const isJSXElement = node => {
  return node?.type === "JSXElement";
};

/**
 * Is the specified node a JSXFragment?
 *
 * @param {import("ast-types/gen/kinds").JSXFragmentKind} node
 * @returns {boolean}
 */
const isJSXFragment = node => {
  return node?.type === "JSXFragment";
};

/**
 * Is the specified node a BlockStatement?
 *
 * @param {import("ast-types/gen/kinds").BlockStatementKind} node
 * @returns {boolean}
 */
const isBlockStatement = node => {
  return node?.type === "BlockStatement";
};

/**
 * Is the specified node a ReturnStatement?
 *
 * @param {import("ast-types/gen/kinds").ReturnStatementKind} node
 * @returns {boolean}
 */
const isReturnStatement = node => {
  return node?.type === "ReturnStatement";
};

/**
 * Is the specified node a LogicalExpression?
 *
 * @param {import("ast-types/gen/kinds").LogicalExpressionKind} node
 * @returns {boolean}
 */
const isLogicalExpression = node => {
  return node?.type === "LogicalExpression";
};

/**
 * Is the specified node a UnaryExpression?
 *
 * @param {import("ast-types/gen/kinds").UnaryExpressionKind} node
 * @returns {boolean}
 */
const isUnaryExpression = node => {
  return node?.type === "UnaryExpression";
};

/**
 * Is the specified node a StringLiteral?
 *
 * @param {import("ast-types/gen/kinds").StringLiteralKind} node
 * @returns {boolean}
 */
const isStringLiteral = node => {
  return node?.type === "StringLiteral";
};

/**
 * Is the specified node a VariableDeclarator?
 *
 * @param {import("ast-types/gen/kinds").VariableDeclaratorKind} node
 * @returns {boolean}
 */
const isVariableDeclarator = node => {
  return node?.type === "VariableDeclarator";
};

/**
 * Returns true if the ImportDeclaration contains the passed specifier name
 *
 * @param {import("ast-types/gen/kinds").ImportDeclarationKind} node
 * @param {string} name
 * @returns {boolean}
 */
const containsSpecifierWithName = (node, name) => {
  if (node?.specifiers?.length > 0) {
    return node.specifiers.some(specifier => {
      return isImportSpecifierWithName(specifier, name);
    });
  }

  return false;
};

/**
 * Returns the matching attributeNode for the specified name.
 *
 * @param {import("ast-types/gen/kinds").JSXOpeningElementKind} node
 * @param {string} name
 * @returns {import("ast-types/gen/kinds").JSXAttributeKind | import("ast-types/gen/kinds").JSXSpreadAttributeKind}
 */
const findAttributeInJSXOpeningElement = (node, name) => {
  return node.attributes.find(attribute => attribute.name.name === name);
};

/**
 * Remove the elements starting at the specified index and replace with elements from the new body.
 *
 * ex:
 * ["one", "two", "three"] //oldBody
 * ["foo", "bar"] //newBody
 *
 * removeElementsStartingAtIndexAndReplaceWithNewBody(oldBodyNode, 1, newBody)
 * ["one", "foo", "bar"] // result
 *
 * @param {import("ast-types/gen/kinds").BlockStatementKind} node
 * @param {number} indexToReplace
 * @param {import("ast-types/gen/kinds").BlockStatementKind["body"]} newBody
 */
const removeElementsStartingAtIndexAndReplaceWithNewBody = (node, indexToReplace, newBody) => {
  const elementsBeforeOneToRemove = node.body.slice(0, indexToReplace);
  node.body = [...elementsBeforeOneToRemove, ...newBody];
};

/**
 * Replace the element at the specified index with contents of the new body.
 *
 * ex:
 * ["one", "two", "three"] //oldBody
 * ["foo", "bar"] //newBody
 *
 * removeElementAtIndexAndMergeBothBodies(oldBodyNode, 1, newBody)
 * ["one", "foo", "bar", "three"] // result
 *
 * @param {import("ast-types/gen/kinds").BlockStatementKind} node
 * @param {number} indexToReplace
 * @param {import("ast-types/gen/kinds").BlockStatementKind["body"]} newBody
 */
const removeElementAtIndexAndMergeBothBodies = (node, indexToReplace, newBody) => {
  node.body = node.body.reduce((acc, bodyNode, currentIndex) => {
    // index to replace, merge the 2 bodies at this point
    if (currentIndex === indexToReplace) {
      newBody.forEach(consequentBodyNode => {
        acc.push(consequentBodyNode);
      });

      return acc;
    }

    // Not our if condition, keep going
    acc.push(bodyNode);
    return acc;
  }, []);
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
      specifier => specifier.imported.name !== specifierToRemove
    );
  }
};

/**
 * Removes the argument matching the passed name in the specified CallExpression.
 *
 * @param {import("ast-types/gen/kinds").CallExpressionKind} node
 * @param {string} argumentToRemove
 * @return {void}
 */
const removeCallExpressionArgument = (node, argumentToRemove) => {
  node.arguments = node.arguments.filter(argument => {
    return argument.value !== argumentToRemove;
  });
};

/**
 * Removes the element matching the passed name in the specified ArrayPattern.
 *
 * @param {import("ast-types/gen/kinds").ArrayPatternKind} node
 * @param {any} elementToRemove
 * @return {void}
 */
const removeElementFromArrayPattern = (node, elementToRemove) => {
  if (typeof elementToRemove === "string") {
    node.elements = node.elements.filter(element => {
      return (element.name || element.value) !== elementToRemove;
    });
  } else {
    // passing in a node of some time
    node.elements = node.elements.filter(element => {
      return element !== elementToRemove;
    });
  }
};

/**
 * Removes the element matching the passed name in the specified ArrayPattern.
 *
 * @param {import("ast-types/gen/kinds").TSUnionTypeKind} node
 * @param {string} typeToRemove
 * @return {void}
 */
const removeTypeFromTSUnionType = (node, typeToRemove) => {
  node.types = node.types.filter(type => type?.literal?.value !== typeToRemove);
};

export {
  collapseConditionalExpressionIfMatchingIdentifier,
  isCallExpressionWithName,
  isElementInArrayPattern,
  isIdentifierWithName,
  isImportSpecifierWithName,
  isObjectPropertyWithKey,
  isUnaryExpressionWithName,
  isArrayExpression,
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
  findAttributeInJSXOpeningElement,
  removeCallExpressionArgument,
  removeElementAtIndexAndMergeBothBodies,
  removeElementFromArrayPattern,
  removeElementsStartingAtIndexAndReplaceWithNewBody,
  removeImportSpecifier,
  removeTypeFromTSUnionType,
};
