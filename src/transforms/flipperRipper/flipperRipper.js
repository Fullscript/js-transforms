import { print, parse, types } from "recast";

const FLIPPERS_HOOK_NAME = "useFlippers";

let parentNode = null;
let flipperVariableToRemove = null;
let flipperSpecifierIndex = null;
let flipperImportDeclarationPath = null;
let shouldRemoveFlipperImportDeclaration = null;
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
 * @param {import("ast-types/gen/kinds").ExpressionKind} node
 * @returns {boolean}
 */
const isIdentifierAndVariableToRemove = (node) => {
  return node.type === "Identifier" && node.name === flipperVariableToRemove;
};

/**
 * @param {import("ast-types/gen/kinds").CallExpressionKind} node
 * @returns {boolean}
 */
const isUseFlippersCallExpression = (node) => {
  return (
    node?.type === "CallExpression" && node?.callee?.name === FLIPPERS_HOOK_NAME
  );
};

/**
 * Remove the useFlippers ImportSecifier or then entire ImportDeclaration
 * @return {void}
 */
const removeUseFlippersImport = () => {
  if (shouldRemoveFlipperImportDeclaration) {
    // remove entire import declaration
    flipperImportDeclarationPath.prune();
  } else if (flipperImportDeclarationPath) {
    // just remove useFlippers specifier
    flipperImportDeclarationPath.node.specifiers =
      flipperImportDeclarationPath.node.specifiers?.filter(
        (specifier) => specifier.imported.name !== FLIPPERS_HOOK_NAME
      );
  }
};

/**
 *
 * @param {*} path
 * @param {*} callExpression
 * @param {*} declaration
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
    removeUseFlippersImport();
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
 * @param {import("ast-types/gen/kinds").LogicalExpressionKind} node
 * @returns {import("ast-types/gen/kinds").ExpressionKind}
 */
const transformLogicalExpression = (node) => {
  // TODO: This does not yet account for UnaryExpressions !isFlipperEnabled

  if (node.left.type === "LogicalExpression") {
    node.left = transformLogicalExpression(node.left);
  } else if (isIdentifierAndVariableToRemove(node.left)) {
    // If logicalExpression and left is flipperVariable to remove, we just return right
    return node.right;
  }

  if (node.right.type === "LogicalExpression") {
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
  flipperSpecifierIndex = null;
  shouldRemoveFlipperImportDeclaration = false;

  return {
    visitProgram(path) {
      // Program can seemingly be visited multiple times for a single file
      // This is contrary to other parsers so I just want to set it once per file
      if (!parentNode) {
        parentNode = path.node;
      }
    },

    visitLogicalExpression(path) {
      // side before `||` is considered left, side after is right
      // (isDS4FlipperEnabled && isPatient) || (isDS4FlipperEnabled && isDev)
      if (path.node.left.type === "LogicalExpression") {
        path.node.left = transformLogicalExpression(path.node.left);
      }

      if (path.node.right.type === "LogicalExpression") {
        path.node.right = transformLogicalExpression(path.node.right);
      }
    },
    visitIfStatement(path) {
      if (
        path.node.test.type === "Identifier" &&
        path.node.test.name === flipperVariableToRemove
      ) {
        if (path.node.consequent.type === "BlockStatement") {
          //if (isFlipperEnabled) {
          //  return "bla";
          // }

          // If last statement in if condition that we are unwrapping is a return statement, then remove the rest of body afterwards
          if (path.node.consequent.body.at(-1).type === "ReturnStatement") {
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
        } else if (path.node.consequent.type === "ReturnStatement") {
          //if (isFlipperEnabled) return "bla";

          // We must go up to the parent to be able to modify the block this IfStatement is part of
          const indexToReplace = path.parentPath.node.body.indexOf(path.node);

          const newBody = path.parentPath.node.body.slice(0, indexToReplace);
          path.parentPath.node.body = [...newBody, path.node.consequent];
        }
      }
    },
    visitImportDeclaration(path) {
      if (path.node.specifiers?.length > 0) {
        // If the useFlippers exists within this ImportDeclaration, save it's index
        flipperSpecifierIndex = path.node.specifiers?.findIndex((specifier) => {
          if (
            specifier.type === "ImportSpecifier" &&
            specifier.imported.name === FLIPPERS_HOOK_NAME
          ) {
            flipperImportDeclarationPath = path;
            return true;
          }

          return false;
        });

        // If useFlippers is the only specifier, set flag to remove the entire ImportDeclaration
        if (flipperSpecifierIndex > -1 && path.node.specifiers?.length === 1) {
          shouldRemoveFlipperImportDeclaration = true;
        }
      }
    },
    visitVariableDeclaration(path) {
      const declaration = path.node.declarations[0];

      if (declaration.type !== "VariableDeclarator") return;

      // Check to see if a CallExpression is `const [] = useFlippers()`
      if (isUseFlippersCallExpression(declaration.init)) {
        const callExpression = declaration.init;

        // find the argument index of the flipper to remove: `useFlippers("flipper-one", "flipper-two");`
        const flipperArgumentIndex = callExpression.arguments.findIndex(
          (argument) => {
            return argument.value === flipperNameToRemove;
          }
        );

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
