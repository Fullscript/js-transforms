import {
  containsSpecifierWithName,
  isBlockStatement,
  isCallExpressionWithName,
  isIdentifierWithName,
  isJSXAttribute,
  isJSXElement,
  isJSXExpressionContainer,
  isJSXFragment,
  isLogicalExpression,
  isReturnStatement,
  isStringLiteral,
  isUnaryExpression,
  isUnaryExpressionWithName,
  isVariableDeclarator,
  removeImportSpecifier,
} from "../../astUtils";

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
 * Is the specified node an Identifier matching the flipperVariable to remove?
 * If so, return true, otherwise false.
 *
 * @param {import("ast-types/gen/kinds").ExpressionKind} node
 * @returns {boolean}
 */
const isIdentifierAndVariableToRemove = (node) => {
  return isIdentifierWithName(node, flipperVariableToRemove);
};

/**
 * Remove the entire useFlippers call, or just argument and variable mathing the specified flipper to remove
 *
 * @param {import("ast-types/lib/node-path").NodePath<import("ast-types/gen/kinds").VariableDeclarationKind, any>} path
 * @param {import("ast-types/gen/kinds").ExpressionKind} callExpression
 * @param {import("ast-types/gen/kinds").VariableDeclaratorKind} declaration
 */
const removeUseFlippers = (
  path,
  callExpression,
  declaration,
  removeFullExpression
) => {
  if (removeFullExpression) {
    path.prune();
    // Only remove useFlippers import if useFlippers CallExpression is completely removed
    removeImportSpecifier(flipperImportDeclarationPath, FLIPPERS_HOOK_NAME);
  } else {
    // Remove argument for the specified flipper
    callExpression.arguments = callExpression.arguments.filter((argument) => {
      return argument.value !== flipperNameToRemove;
    });

    // Remove the variable for the specified flipper
    declaration.id.elements = declaration.id.elements.filter((element) => {
      return element.name !== flipperVariableToRemove;
    });
  }
};

/**
 * Recursively go upwards from a NodePath and remove the first JSXAttribute that is hit
 *
 * @param {import("ast-types/lib/node-path").NodePath<any, any>} path
 * @returns {void}
 */
const removeParentJSXAttribute = (path) => {
  if (!path.parentPath.node?.type) debugger;
  if (
    isJSXExpressionContainer(path.parentPath.node) &&
    (isJSXElement(path.parentPath.parentPath.node) ||
      isJSXFragment(path.parentPath.parentPath.node))
  ) {
    // <div>{!isFlipperEnabled && <SomeComponent />}</div>
    // OR
    // <>{!isFlipperEnabled && <SomeComponent />}</>
    path.parentPath.prune();
  } else if (
    !isJSXAttribute(path.parentPath.node) &&
    !isJSXElement(path.parentPath?.node)
  ) {
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
const removeUseQuery = (path) => {
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
const transformLogicalExpression = (node) => {
  if (isLogicalExpression(node.left)) {
    node.left = transformLogicalExpression(node.left);
  } else if (isIdentifierAndVariableToRemove(node.left)) {
    // If logicalExpression and left is flipperVariable to remove, we just return right
    return node.right;
  }

  if (isLogicalExpression(node.right)) {
    node.right = transformLogicalExpression(node.right);
  } else if (isIdentifierAndVariableToRemove(node.right)) {
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
    visitConditionalExpression(path) {
      // const something = isFlipperEnabled ? "foo" : "bar";
      if (isIdentifierAndVariableToRemove(path.node.test)) {
        path.replace(path.node.consequent);
      } else if (
        isUnaryExpressionWithName(path.node, flipperVariableToRemove)
      ) {
        // const something = !isFlipperEnabled ? "foo" : "bar";
        path.replace(path.node.alternate);
      }
    },
    visitJSXElement(path) {
      // For code like the following:
      // <FlippersProvider flippers={["some_flipper"]}>
      //   <div />
      // </FlippersProvider>
      const { openingElement } = path.node;

      if (openingElement.name.name === FLIPPERS_PROVIDER_NANE) {
        const flipperJSXAttribute = openingElement.attributes.find(
          (attribute) => attribute.name.name === "flippers"
        );

        if (
          isJSXAttribute(flipperJSXAttribute) &&
          isJSXExpressionContainer(flipperJSXAttribute.value) &&
          flipperJSXAttribute.value.expression?.elements?.length > 0
        ) {
          // look through the flippers props and find the flipperToRemove
          const flipperToRemoveIndex =
            flipperJSXAttribute.value.expression.elements.findIndex(
              (element) => element.value === flipperNameToRemove
            );

          // if it exists, continue removing stuff
          if (flipperToRemoveIndex > -1) {
            // if the flipper to remove is the only one in the flippers prop list, remove FlppersProvider
            if (flipperJSXAttribute.value.expression.elements.length === 1) {
              // get all JSXElement children of the `FlippersProvider` component
              const children = path.node.children.reduce((acc, child) => {
                if (isJSXElement(child)) {
                  acc.push(child);
                }

                return acc;
              }, []);

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
              removeImportSpecifier(
                flippersProviderImportDeclarationPath,
                FLIPPERS_PROVIDER_NANE
              );
            } else {
              // remove just the flipper to remove from the flippers array
              flipperJSXAttribute.value.expression.elements =
                flipperJSXAttribute.value.expression.elements.filter(
                  (element) => element.value !== flipperNameToRemove
                );
            }
          }
        }
      }
    },
    visitIfStatement(path) {
      if (isIdentifierAndVariableToRemove(path.node.test)) {
        if (isBlockStatement(path.node.consequent)) {
          //if (isFlipperEnabled) {
          //  return "bla";
          // }

          // If last statement in if condition that we are unwrapping is a return statement, then remove the rest of body afterwards
          if (isReturnStatement(path.node.consequent.body.at(-1))) {
            // We must go up to the parent to be able to modify the block this IfStatement is part of
            const indexToReplace = path.parentPath.node.body.indexOf(path.node);

            const newBody = path.parentPath.node.body.slice(0, indexToReplace);
            path.parentPath.node.body = [
              ...newBody,
              ...path.node.consequent.body,
            ];
          } else {
            // case where the if condition does not contain an early return statement
            path.parentPath.node.body = path.parentPath.node.body.reduce(
              (acc, bodyNode) => {
                // Replace existing IfStatement with contents of the inner block
                if (bodyNode === path.node) {
                  path.node.consequent.body.forEach((consequentBodyNode) => {
                    acc.push(consequentBodyNode);
                  });

                  return acc;
                }

                // Not our if condition, keep going
                acc.push(bodyNode);
                return acc;
              },
              []
            );
          }
        } else if (isReturnStatement(path.node.consequent)) {
          //if (isFlipperEnabled) return "bla";

          // We must go up to the parent to be able to modify the block this IfStatement is part of
          const indexToReplace = path.parentPath.node.body.indexOf(path.node);

          const newBody = path.parentPath.node.body.slice(0, indexToReplace);
          path.parentPath.node.body = [...newBody, path.node.consequent];
        }
      } else if (
        isUnaryExpressionWithName(path.node, flipperVariableToRemove)
      ) {
        // if (!isFlipperEnabled) return;
        path.prune();
      }
    },
    visitImportDeclaration(path) {
      if (path.node.specifiers?.length > 0) {
        // If the useFlippers exists within this ImportDeclaration, save it's index
        if (containsSpecifierWithName(path.node, FLIPPERS_HOOK_NAME)) {
          flipperImportDeclarationPath = path;
        }

        if (containsSpecifierWithName(path.node, FLIPPERS_PROVIDER_NANE)) {
          flippersProviderImportDeclarationPath = path;
        }
      }
    },
    visitLogicalExpression(path) {
      // side before `||` is considered left, side after is right
      // (isFlipperEnabled && isFoo) || (isFlipperEnabled && isBar)
      if (isLogicalExpression(path.node.left)) {
        path.node.left = transformLogicalExpression(path.node.left);
      } else if (isIdentifierAndVariableToRemove(path.node.left)) {
        // case where we are doing a simple `isFlipperEnabled && styles.foo`
        path.replace(transformLogicalExpression(path.node));
        // No longer a LogicalExpression, lets stop visiting
        return;
      }

      if (isLogicalExpression(path.node.right)) {
        path.node.right = transformLogicalExpression(path.node.right);
      } else if (isIdentifierAndVariableToRemove(path.node.right)) {
        // case where we are doing a simple `isSomethingElse && isFlipperEnabled`
        path.replace(transformLogicalExpression(path.node));
        // No longer a LogicalExpression, lets stop visiting
        return;
      }

      // !isFlipperEnabled && styles.someStyles
      if (
        isUnaryExpression(path.node.left) &&
        isIdentifierAndVariableToRemove(path.node.left.argument) &&
        isJSXExpressionContainer(path.parentPath?.node)
      ) {
        removeParentJSXAttribute(path);
      }

      // if (!isFlipperEnabled || someOtherBooleanLike) return null;
      if (
        path.node.operator === "||" &&
        isUnaryExpression(path.node.left) &&
        isIdentifierAndVariableToRemove(path.node.left.argument)
      ) {
        path.replace(path.node.right);
      }

      // if (someOtherBooleanLike || !isFlipperEnabled) return null;
      if (
        path.node.operator === "||" &&
        isUnaryExpression(path.node.right) &&
        isIdentifierAndVariableToRemove(path.node.right.argument)
      ) {
        path.replace(path.node.left);
      }
    },
    visitObjectProperty(path) {
      // const { data, loading } = useQuery({ skip: !isFlipperEnabled });
      if (
        path.node.key.name === "skip" &&
        isUnaryExpression(path.node.value) &&
        path.node.value.argument.name === flipperVariableToRemove
      ) {
        path.prune();
      } else if (
        path.node.key.name === "skip" &&
        isIdentifierAndVariableToRemove(path.node.value)
      ) {
        // const { data, loading } = useQuery({ skip: isFlipperEnabled });
        removeUseQuery(path.parentPath);
      } else if (
        path.node.key.name === "flipper" &&
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
      path.node.types = path.node.types.filter(
        (type) => type?.literal?.value !== flipperNameToRemove
      );
    },
    visitVariableDeclaration(path) {
      const declaration = path.node.declarations[0];

      if (declaration.type !== "VariableDeclarator") return;

      // Check to see if a CallExpression is `const [] = useFlippers()`
      if (isCallExpressionWithName(declaration.init, FLIPPERS_HOOK_NAME)) {
        const callExpression = declaration.init;

        // find the argument index of the flipper to remove: `useFlippers("flipper-one", "flipper-two");`
        const flipperArgumentIndex = callExpression.arguments.findIndex(
          (argument) => {
            return argument.value === flipperNameToRemove;
          }
        );

        // No flipper found that matches the one to remove
        if (flipperArgumentIndex === -1) return;

        // Retrieve the variable representing the flipper to remove
        // const [flipperOneEnabled, flipperTwoEnabled] = useFlippers("flipper-one", "flipper-two");
        flipperVariableToRemove =
          declaration.id.elements[flipperArgumentIndex].name;

        // If the flipper to remove is the only flipper specified in this hook, remove useFlippers entirely
        const shouldRemoveUseFlippers = callExpression.arguments.length === 1;

        // start of remove useFlippers CallExpression and ImportDeclaration
        removeUseFlippers(
          path,
          callExpression,
          declaration,
          shouldRemoveUseFlippers
        );
      }
    },
  };
};

export { transform };
