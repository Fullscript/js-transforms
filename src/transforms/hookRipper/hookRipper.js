import {
  collapseConditionalExpressionIfMatchingIdentifier,
  containsSpecifierWithName,
  isBlockStatement,
  isCallExpressionWithName,
  isIdentifierWithName,
  isJSXAttribute,
  isJSXElement,
  isJSXExpressionContainer,
  isJSXFragment,
  isLogicalExpression,
  isObjectPropertyWithKey,
  isReturnStatement,
  isUnaryExpression,
  isUnaryExpressionWithName,
  isVariableDeclarator,
  removeElementAtIndexAndMergeBothBodies,
  removeElementsStartingAtIndexAndReplaceWithNewBody,
  removeImportSpecifier,
} from "../../astUtils/index.js";

let parentNode = null;
let hookVariableToRemove = null;
let hookDeclarationPath = null;
let hookToRemove = null;

/**
 * Type definitions for VSCode autocompletion!
 *
 * @typedef {Object} TransformParams
 * @property {*} ast - The resulting AST as parsed by babel
 * @property {import("ast-types/gen/builders").builders} builder - Recast builder for transforming the AST
 * @property {*} options - Options passed into the transform from the CLI (if any)
 */

/**
 * Remove the entire useFlippers call, or just argument and variable mathing the specified flipper to remove
 *
 * @param {import("ast-types/lib/node-path").NodePath<import("ast-types/gen/kinds").VariableDeclarationKind, any>} path
 * @param {import("ast-types/gen/kinds").ExpressionKind} callExpression
 * @param {import("ast-types/gen/kinds").VariableDeclaratorKind} declaration
 */
const removeHook = path => {
  path.prune();
  removeImportSpecifier(hookDeclarationPath, hookToRemove);
};

/**
 * Recursively go upwards from a NodePath and remove the first JSXAttribute that is hit
 *
 * @param {import("ast-types/lib/node-path").NodePath<any, any>} path
 * @returns {void}
 */
const removeParentJSXAttribute = path => {
  if (
    isJSXExpressionContainer(path.parentPath.node) &&
    (isJSXElement(path.parentPath.parentPath.node) ||
      isJSXFragment(path.parentPath.parentPath.node))
  ) {
    // <div>{!isEnabled && <SomeComponent />}</div>
    // OR
    // <>{!isEnabled && <SomeComponent />}</>
    path.parentPath.prune();
  } else if (!isJSXAttribute(path.parentPath.node) && !isJSXElement(path.parentPath?.node)) {
    removeParentJSXAttribute(path.parentPath);
  } else if (isJSXAttribute(path.parentPath.node)) {
    // css={!isEnabled && styles.foo}
    path.parentPath.prune();
  }
};

/**
 * Remove the entire useQuery call that was skipped whenever isEnabled
 *
 * @param {import("ast-types/lib/node-path").NodePath<any, any>} path
 * @returns {void}
 */
const removeUseQuery = path => {
  if (isVariableDeclarator(path.node)) {
    path.prune();
  } else {
    removeUseQuery(path.parentPath);
  }
};

/**
 * @param {import("ast-types/gen/kinds").LogicalExpressionKind} node
 * @returns {import("ast-types/gen/kinds").ExpressionKind}
 */
const transformLogicalExpression = node => {
  if (isLogicalExpression(node.left)) {
    node.left = transformLogicalExpression(node.left);
  } else if (isIdentifierWithName(node.left, hookVariableToRemove)) {
    // If logicalExpression and left is flipperVariable to remove, we just return right
    return node.right;
  }

  if (isLogicalExpression(node.right)) {
    node.right = transformLogicalExpression(node.right);
  } else if (isIdentifierWithName(node.right, hookVariableToRemove)) {
    // If logicalExpression and right is flipperVariable to remove, we just return left
    return node.left;
  }

  return node;
};

/**
 * @param {TransformParams} param0
 * @returns {import("ast-types").Visitor}
 */
const transform = ({ builder, options }) => {
  hookToRemove = options[0];

  // reset
  hookDeclarationPath = null;

  return {
    visitProgram(path) {
      // Program can seemingly be visited multiple times for a single file
      // This is contrary to other parsers so I just want to set it once per file
      if (!parentNode) {
        parentNode = path.node;
      }
    },
    visitConditionalExpression(path) {
      // const something = isEnabled ? "foo" : "bar";
      // const something = !isEnabled ? "foo" : "bar";
      collapseConditionalExpressionIfMatchingIdentifier(path, hookVariableToRemove);
    },
    visitIfStatement(path) {
      if (isIdentifierWithName(path.node.test, hookVariableToRemove)) {
        // We must go up to the parent to be able to modify the block this IfStatement is part of
        const indexToReplace = path.parentPath.node.body.indexOf(path.node);

        if (isBlockStatement(path.node.consequent)) {
          //if (isEnabled) {
          //  return "bla";
          //}

          // If last statement in if condition that we are unwrapping is a return statement, then remove the rest of body afterwards
          if (isReturnStatement(path.node.consequent.body.at(-1))) {
            removeElementsStartingAtIndexAndReplaceWithNewBody(
              path.parentPath.node,
              indexToReplace,
              path.node.consequent.body
            );
          } else {
            removeElementAtIndexAndMergeBothBodies(
              path.parentPath.node,
              indexToReplace,
              path.node.consequent.body
            );
          }
        } else if (isReturnStatement(path.node.consequent)) {
          //if (isEnabled) return "bla";
          removeElementsStartingAtIndexAndReplaceWithNewBody(path.parentPath.node, indexToReplace, [
            path.node.consequent,
          ]);
        }
      } else if (isUnaryExpressionWithName(path.node, hookVariableToRemove)) {
        // if (!isEnabled) return;
        path.prune();
      }
    },
    visitImportDeclaration(path) {
      // If hookToRemove exists within this ImportDeclaration, store it for later
      if (containsSpecifierWithName(path.node, hookToRemove)) {
        hookDeclarationPath = path;
      }
    },
    visitLogicalExpression(path) {
      if (isLogicalExpression(path.node.left)) {
        // (isEnabled && isFoo) || (isEnabled && isBar)
        path.node.left = transformLogicalExpression(path.node.left);
      } else if (isIdentifierWithName(path.node.left, hookVariableToRemove)) {
        // case where we are doing a simple `isEnabled && styles.foo`
        path.replace(transformLogicalExpression(path.node));
        // No longer a LogicalExpression, lets stop visiting
        return;
      }

      if (isLogicalExpression(path.node.right)) {
        // (isFoo && isEnabled) || (isBar && isEnabled)
        path.node.right = transformLogicalExpression(path.node.right);
      } else if (isIdentifierWithName(path.node.right, hookVariableToRemove)) {
        // case where we are doing a simple `isSomethingElse && isEnabled`
        path.replace(transformLogicalExpression(path.node));
        // No longer a LogicalExpression, lets stop visiting
        return;
      }

      // !isEnabled && styles.someStyles
      if (
        isUnaryExpression(path.node.left) &&
        isIdentifierWithName(path.node.left.argument, hookVariableToRemove) &&
        isJSXExpressionContainer(path.parentPath?.node)
      ) {
        removeParentJSXAttribute(path);
      }

      // if (!isEnabled || someOtherBooleanLike) return null;
      if (
        path.node.operator === "||" &&
        isUnaryExpression(path.node.left) &&
        isIdentifierWithName(path.node.left.argument, hookVariableToRemove)
      ) {
        path.replace(path.node.right);
      }

      // if (someOtherBooleanLike || !isEnabled) return null;
      if (
        path.node.operator === "||" &&
        isUnaryExpression(path.node.right) &&
        isIdentifierWithName(path.node.right.argument, hookVariableToRemove)
      ) {
        path.replace(path.node.left);
      }
    },
    visitObjectProperty(path) {
      if (
        isObjectPropertyWithKey(path.node, "skip") &&
        isUnaryExpression(path.node.value) &&
        path.node.value.argument.name === hookVariableToRemove
      ) {
        // const { data, loading } = useQuery({ skip: !isEnabled });
        path.prune();
      } else if (
        isObjectPropertyWithKey(path.node, "skip") &&
        isIdentifierWithName(path.node.value, hookVariableToRemove)
      ) {
        // const { data, loading } = useQuery({ skip: isEnabled });
        removeUseQuery(path.parentPath);
      }
    },
    visitVariableDeclaration(path) {
      const declaration = path.node.declarations[0];

      if (!isVariableDeclarator(declaration)) return;

      // Check to see if a CallExpression is `const isEnabled = useSomeFeatureIsEnabled()`
      if (isCallExpressionWithName(declaration.init, hookToRemove)) {
        // Retrieve the variable returned from the hook to remove
        // const isFeatureEnabled = useSomeFeatureIsEnabled();
        hookVariableToRemove = declaration.id.name;

        // start of remove useSomeFeatureIsEnabled CallExpression and ImportDeclaration
        removeHook(path);
      }
    },
  };
};

export { transform };
