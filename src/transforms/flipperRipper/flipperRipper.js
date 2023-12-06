import {
  collapseConditionalExpressionIfMatchingIdentifier,
  containsSpecifierWithName,
  findAttributeInJSXOpeningElement,
  isBlockStatement,
  isCallExpressionWithName,
  isElementInArrayPattern,
  isIdentifierWithName,
  isJSXAttribute,
  isJSXElement,
  isJSXExpressionContainer,
  isJSXFragment,
  isLogicalExpression,
  isObjectPropertyWithKey,
  isReturnStatement,
  isStringLiteral,
  isUnaryExpression,
  isUnaryExpressionWithName,
  isVariableDeclarator,
  removeCallExpressionArgument,
  removeElementAtIndexAndMergeBothBodies,
  removeElementFromArrayPattern,
  removeElementsStartingAtIndexAndReplaceWithNewBody,
  removeImportSpecifier,
  removeTypeFromTSUnionType,
} from "../../astUtils/index.js";

const FLIPPERS_HOOK_NAME = "useFlippers";
const FLIPPERS_PROVIDER_NANE = "FlippersProvider";

let parentNode = null;
let flipperVariableToRemove = null;
let flipperImportDeclarationPath = null;
let flippersProviderImportDeclarationPath = null;
let flipperNameToRemove = null;

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
const removeUseFlippers = (path, callExpression, declaration) => {
  // If the flipper to remove is the only flipper specified in this hook, remove useFlippers entirely
  if (callExpression.arguments.length === 1) {
    path.prune();
    removeImportSpecifier(flipperImportDeclarationPath, FLIPPERS_HOOK_NAME);
  } else {
    // Remove argument for the specified flipper
    removeCallExpressionArgument(callExpression, flipperNameToRemove);

    // Remove the variable for the specified flipper
    removeElementFromArrayPattern(declaration.id, flipperVariableToRemove);
  }
};

/**
 * Recursively go upwards from a NodePath and remove the first JSXAttribute that is hit
 *
 * @param {import("ast-types/lib/node-path").NodePath<any, any>} path
 * @returns {void}
 */
const removeParentJSXAttribute = path => {
  if (!path.parentPath) return;

  if (
    isJSXExpressionContainer(path.parentPath.node) &&
    (isJSXElement(path.parentPath.parentPath.node) ||
      isJSXFragment(path.parentPath.parentPath.node))
  ) {
    // <div>{!isFlipperEnabled && <SomeComponent />}</div>
    // OR
    // <>{!isFlipperEnabled && <SomeComponent />}</>
    path.parentPath.prune();
  } else if (!isJSXAttribute(path.parentPath.node) && !isJSXElement(path.parentPath?.node)) {
    removeParentJSXAttribute(path.parentPath);
  } else if (isJSXAttribute(path.parentPath.node)) {
    // css={!isFlipperEnabled && styles.foo}
    path.parentPath.prune();
  }
};

/**
 * Remove the entire useQuery call that was skipped whenever isFlipperEnabled
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
  } else if (isIdentifierWithName(node.left, flipperVariableToRemove)) {
    // If logicalExpression and left is flipperVariable to remove, we just return right
    return node.right;
  } else if (isUnaryExpressionWithName(node.left, flipperVariableToRemove)) {
    if (node.operator === "&&") {
      // !isFlipperEnabled && somethingElse
      // remove entire logicalExpression
      return null;
    } else {
      // !isFlipperEnabled || somethingElse
      return node.right;
    }
  }

  if (isLogicalExpression(node.right)) {
    node.right = transformLogicalExpression(node.right);
  } else if (isIdentifierWithName(node.right, flipperVariableToRemove)) {
    // If logicalExpression and right is flipperVariable to remove, we just return left
    return node.left;
  } else if (isUnaryExpressionWithName(node.right, flipperVariableToRemove)) {
    if (node.operator === "&&") {
      // somethingElse && !isFlipperEnabled
      // remove entire logicalExpression
      return null;
    } else {
      // somethingElse || !isFlipperEnabled
      return node.left;
    }
  }

  return node;
};

/**
 * @param {TransformParams} param0
 * @returns {import("ast-types").Visitor}
 */
const transform = ({ builder, options }) => {
  flipperNameToRemove = options[0];

  // reset
  flipperVariableToRemove = null;
  flipperImportDeclarationPath = null;
  flippersProviderImportDeclarationPath = null;

  return {
    visitProgram(path) {
      // Program can seemingly be visited multiple times for a single file
      // This is contrary to other parsers so I just want to set it once per file
      if (!parentNode) {
        parentNode = path.node;
      }
    },
    visitArrayExpression(path) {
      // const someStyles = [
      //   !isFlipperEnabled && styles.box,
      //   isFlipperEnabled && styles.foo,
      //   styles.bar,
      // ];

      path.node.elements = path.node.elements.reduce((acc, element) => {
        if (isLogicalExpression(element)) {
          const result = transformLogicalExpression(element);

          if (result) {
            acc.push(result);
          }
        } else {
          acc.push(element);
        }

        return acc;
      }, []);
    },
    visitCallExpression(path) {
      path.node.arguments = path.node.arguments.map(argument => {
        if (isUnaryExpressionWithName(argument, flipperVariableToRemove)) {
          return builder.booleanLiteral(false);
        } else if (isIdentifierWithName(argument, flipperVariableToRemove)) {
          return builder.booleanLiteral(true);
        }

        return argument;
      });
    },
    visitConditionalExpression(path) {
      // const something = isFlipperEnabled ? "foo" : "bar";
      // const something = !isFlipperEnabled ? "foo" : "bar";
      collapseConditionalExpressionIfMatchingIdentifier(path, flipperVariableToRemove);
    },
    visitJSXAttribute(path) {
      if (isIdentifierWithName(path.node.value?.expression, flipperVariableToRemove)) {
        // <Component someProps={isFlipperEnabled} />
        path.node.value = null;
      } else if (isUnaryExpressionWithName(path.node.value?.expression, flipperVariableToRemove)) {
        // <Component someProps={!isFlipperEnabled} />
        path.prune();
      }
    },
    visitJSXElement(path) {
      // For code like the following:
      // <FlippersProvider flippers={["some_flipper"]}>
      //   <div />
      // </FlippersProvider>
      const { openingElement } = path.node;

      if (openingElement.name.name === FLIPPERS_PROVIDER_NANE) {
        const flipperJSXAttribute = findAttributeInJSXOpeningElement(openingElement, "flippers");

        if (
          isJSXAttribute(flipperJSXAttribute) &&
          isJSXExpressionContainer(flipperJSXAttribute.value) &&
          flipperJSXAttribute.value.expression?.elements?.length > 0
        ) {
          // look through the flippers props and find the flipperToRemove
          const hasFlipperToRemove = isElementInArrayPattern(
            flipperJSXAttribute.value.expression,
            flipperNameToRemove
          );

          // if it exists, continue removing stuff
          if (hasFlipperToRemove) {
            // if the flipper to remove is the only one in the flippers prop list, remove FlppersProvider
            if (flipperJSXAttribute.value.expression.elements.length === 1) {
              // get all JSXElement children of the `FlippersProvider` component
              const children = path.node.children.filter(child => isJSXElement(child));

              // if there's multiple children JSXElements, wrap them in a fragment
              if (children.length > 1) {
                path.replace(
                  builder.jsxFragment(
                    builder.jsxOpeningFragment(),
                    builder.jsxClosingFragment(),
                    children
                  )
                );
              } else {
                path.replace(children[0]);
              }

              // Remove Import for FlipperProvider
              removeImportSpecifier(flippersProviderImportDeclarationPath, FLIPPERS_PROVIDER_NANE);
            } else {
              // remove just the flipper from the flippers array
              removeElementFromArrayPattern(
                flipperJSXAttribute.value.expression,
                flipperNameToRemove
              );
            }
          }
        }
      }
    },
    visitIfStatement(path) {
      if (isIdentifierWithName(path.node.test, flipperVariableToRemove)) {
        // We must go up to the parent to be able to modify the block this IfStatement is part of
        const indexToReplace = path.parentPath.node.body.indexOf(path.node);

        if (isBlockStatement(path.node.consequent)) {
          //if (isFlipperEnabled) {
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
          //if (isFlipperEnabled) return "bla";
          removeElementsStartingAtIndexAndReplaceWithNewBody(path.parentPath.node, indexToReplace, [
            path.node.consequent,
          ]);
        }
      } else if (isUnaryExpressionWithName(path.node?.test, flipperVariableToRemove)) {
        // if (!isFlipperEnabled) return;
        path.prune();
      } else if (
        isLogicalExpression(path.node.test) &&
        path.node.test.operator === "&&" &&
        isUnaryExpressionWithName(path.node.test.right, flipperVariableToRemove)
      ) {
        if (path.node.alternate) {
          // if (someOtherCondition && !isFlipperEnabled) {
          //   console.log("do something");
          // } else if (!someOtherCondition) {
          //   console.log("do something else");
          // }
          path.replace(path.node.alternate);
        } else {
          // if (someOtherCondition && !isFlipperEnabled) {
          //   console.log("do something");
          // }
          path.prune();
        }
      }
    },
    visitImportDeclaration(path) {
      // If useFlippers exists within this ImportDeclaration, store it for later
      if (containsSpecifierWithName(path.node, FLIPPERS_HOOK_NAME)) {
        flipperImportDeclarationPath = path;
      }

      // If FlippersProvider exists within this ImportDeclaration, store it for later
      if (containsSpecifierWithName(path.node, FLIPPERS_PROVIDER_NANE)) {
        flippersProviderImportDeclarationPath = path;
      }
    },
    visitLogicalExpression(path) {
      if (isLogicalExpression(path.node.left)) {
        // (isFlipperEnabled && isFoo) || (isFlipperEnabled && isBar)
        const result = transformLogicalExpression(path.node.left);

        // If result is non truthy, we have removed the left side of the expression
        if (result) {
          path.node.left = result;
        } else {
          path.replace(path.node.right);
        }
      } else if (isIdentifierWithName(path.node.left, flipperVariableToRemove)) {
        // case where we are doing a simple `isFlipperEnabled && styles.foo`
        path.replace(transformLogicalExpression(path.node));
        // No longer a LogicalExpression, lets stop visiting
        return;
      }

      if (isLogicalExpression(path.node.right)) {
        // (isFoo && isFlipperEnabled) || (isBar && isFlipperEnabled)
        const result = transformLogicalExpression(path.node.right);

        // If result is non truthy, we have removed the left side of the expression
        if (result) {
          path.node.right = result;
        } else {
          path.replace(path.node.left);
        }
      } else if (isIdentifierWithName(path.node.right, flipperVariableToRemove)) {
        // case where we are doing a simple `isSomethingElse && isFlipperEnabled`
        path.replace(transformLogicalExpression(path.node));
        // No longer a LogicalExpression, lets stop visiting
        return;
      }

      // !isFlipperEnabled && styles.someStyles
      if (
        isUnaryExpression(path.node.left) &&
        isIdentifierWithName(path.node.left.argument, flipperVariableToRemove)
      ) {
        // css={!isEnabled && styles.someStyles}
        removeParentJSXAttribute(path);
      }

      // if (!isFlipperEnabled || someOtherBooleanLike) return null;
      if (
        path.node.operator === "||" &&
        isUnaryExpression(path.node.left) &&
        isIdentifierWithName(path.node.left.argument, flipperVariableToRemove)
      ) {
        path.replace(path.node.right);
      }

      // if (someOtherBooleanLike || !isFlipperEnabled) return null;
      if (
        path.node.operator === "||" &&
        isUnaryExpression(path.node.right) &&
        isIdentifierWithName(path.node.right.argument, flipperVariableToRemove)
      ) {
        path.replace(path.node.left);
      }
    },
    visitObjectProperty(path) {
      if (
        isObjectPropertyWithKey(path.node, "skip") &&
        isUnaryExpression(path.node.value) &&
        path.node.value.argument.name === flipperVariableToRemove
      ) {
        // const { data, loading } = useQuery({ skip: !isFlipperEnabled });
        path.prune();
      } else if (
        isObjectPropertyWithKey(path.node, "skip") &&
        isIdentifierWithName(path.node.value, flipperVariableToRemove)
      ) {
        // const { data, loading } = useQuery({ skip: isFlipperEnabled });
        removeUseQuery(path.parentPath);
      } else if (
        isObjectPropertyWithKey(path.node, "flipper") &&
        isStringLiteral(path.node.value) &&
        path.node.value.value === flipperNameToRemove
      ) {
        // const routes = [{
        //   path: "/some/path",
        //   key: "path_key",
        //   element: <LazyPage />,
        //   flipper: "flipper_name",
        // }];
        path.prune();
      }
    },
    visitTSUnionType(path) {
      // remove flipper from TypeUnion
      // export type BaseFlippers = "foo_flipper" | "bar_flipper";
      removeTypeFromTSUnionType(path.node, flipperNameToRemove);
    },
    visitVariableDeclaration(path) {
      const declaration = path.node.declarations[0];

      if (!isVariableDeclarator(declaration)) return;

      // Check to see if a CallExpression is `const [] = useFlippers()`
      if (isCallExpressionWithName(declaration.init, FLIPPERS_HOOK_NAME)) {
        const callExpression = declaration.init;

        // find the argument index of the flipper to remove: `useFlippers("flipper-one", "flipper-two");`
        const flipperArgumentIndex = callExpression.arguments.findIndex(argument => {
          return argument.value === flipperNameToRemove;
        });

        // No flipper found that matches the one to remove
        if (flipperArgumentIndex === -1) return;

        // Retrieve the variable representing the flipper to remove
        // const [flipperOneEnabled, flipperTwoEnabled] = useFlippers("flipper-one", "flipper-two");
        flipperVariableToRemove = declaration.id.elements[flipperArgumentIndex].name;

        // start of remove useFlippers CallExpression and ImportDeclaration
        removeUseFlippers(path, callExpression, declaration);
      }
    },
  };
};

export { transform };
