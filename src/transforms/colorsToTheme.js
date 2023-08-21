import { print, parse } from "recast";

let parentNode = null;
let colorToReplace;
let themeToReplaceWith;
let addedThemeImportType = false;
let convertedColorToTheme = false;
let hasImportedThemeType = false;

/**
 * Type definitions for VSCode autocompletion!
 *
 * @typedef {Object} TransformParams
 * @property {import("ast-types/gen/builders").builders} builder - Recast builder for transforming the AST
 * @property {*} options - Options passed into the transform from the CLI (if any)
 */

/**
 * @param {TransformParams} param0
 * @returns {import("ast-types").Visitor}
 */
const transform = ({ builder, options }) => {
  colorToReplace = options[0];
  themeToReplaceWith = options[1];
  addedThemeImportType = false;
  convertedColorToTheme = false;
  hasImportedThemeType = false;
  parentNode = null;

  /**
   * Adds Theme as a type specifier to any existing @emotion/react import declaration
   */
  const addThemeTypeImport = () => {
    parentNode.body.unshift(
      builder.importDeclaration(
        [builder.importSpecifier(builder.identifier("Theme"))],
        builder.stringLiteral("@emotion/react"),
        "type"
      )
    );

    // We have now added the import statement, no need to do so again for other instances of colors
    addedThemeImportType = true;
  };

  /**
   * Determines if specifierName is contained within the list of import type specifiers
   */
  const containsSpecifier = (node, specifierName) => {
    return !!node.specifiers.find((specifier) => {
      return specifier?.imported?.name === specifierName;
    });
  };

  /**
   * Replace existing expressions with modified ones, this map replaces specified colors with equivalent theme
   */
  const convertColorsExpressionsToThemeExpressions = (expressions) => {
    // parse converts out theme.success.base for example with the equivalent AST
    const themeToReplaceWithAST = parse(themeToReplaceWith);

    return expressions.map((cssExpression) => {
      if (cssExpression.type === "MemberExpression") {
        // Convert the AST of colors.foobar into a string for comparison
        const serializedCssExpression = print(cssExpression).code;

        // If cssExpression is a color expression that matches the color we want to replace, replace it with the specified theme
        if (serializedCssExpression === colorToReplace) {
          convertedColorToTheme = true;
          return themeToReplaceWithAST;
        }
      } else if (cssExpression.type === "CallExpression") {
        // helpers.hexToRgba(colors.foobar) for example
        const serializedCallExpression = print(cssExpression.callee).code;

        // Some of these are helpers.hexToRgba or hexToRgba
        if (serializedCallExpression.match(/^(helpers|hexToRgba)/gm)) {
          const serializedArgument = print(cssExpression.arguments[0]).code;

          if (serializedArgument === colorToReplace) {
            convertedColorToTheme = true;

            cssExpression.arguments[0] = themeToReplaceWithAST;
            return cssExpression;
          }
        }
      }

      // Not a MemberExpression or CallExpression so thus can't be colors
      return cssExpression;
    });
  };

  /**
   * Takes in a TemplateLiteral node, loops through its expressions and replaces any colors with the specified theme
   * Also wraps the TemplateLiteral in a function if we have converted a color to theme
   */
  const convertColorsInTaggedExpression = (
    node,
    shouldWrapInThemeFunc = true
  ) => {
    node.quasi.expressions = convertColorsExpressionsToThemeExpressions(
      node.quasi.expressions
    );

    // Import Theme type if it doesn't already exist, needed for changing colors to themes
    if (
      !hasImportedThemeType &&
      !addedThemeImportType &&
      convertedColorToTheme
    ) {
      addThemeTypeImport();
    }

    // If we have converted a color to theme, we must wrap the template literal in a function like (theme: Theme ) = css`...`;
    if (convertedColorToTheme && shouldWrapInThemeFunc) {
      const themeIdentifier = builder.identifier("theme");
      themeIdentifier.typeAnnotation = builder.typeAnnotation(
        builder.genericTypeAnnotation(builder.identifier("Theme"), null)
      );
      node = builder.arrowFunctionExpression([themeIdentifier], node);
      convertedColorToTheme = false;
    }

    return node;
  };

  return {
    visitProgram(path) {
      // Program can seemingly be visited multiple times for a single file
      // This is contrary to other parsers so I just want to set it once per file
      // Having access to the parentNode allows us to inject a type import for Theme once we know we've replaced a color
      if (!parentNode) {
        parentNode = path.node;
      }
    },
    visitImportDeclaration(path) {
      // verify if Theme is already imported via a @emotion/react importDeclaration
      if (
        !hasImportedThemeType &&
        path.node.source.value === "@emotion/react"
      ) {
        hasImportedThemeType = containsSpecifier(path.node, "Theme");
      }
    },
    // Covers most cases where colors is used within something like export const container = css`...`;
    visitVariableDeclarator(path) {
      // For most cases like export const container = css`...`;
      if (
        path.node.init.type === "TaggedTemplateExpression" &&
        (path.node.init.tag.name === "css" ||
          path.node.init.tag.name === "keyframes")
      ) {
        path.node.init = convertColorsInTaggedExpression(path.node.init);
      } else if (
        // For cases where theme is already partially used but colors still exist like const container = (theme: Theme) => css`...`;
        path.node.init.type === "ArrowFunctionExpression" &&
        (path.node.init.body.tag?.name === "css" ||
          path.node.init.body.tag?.name === "keyframes")
      ) {
        path.node.init.body = convertColorsInTaggedExpression(
          path.node.init.body,
          false
        );
      }
    },
    // For cases where colors is used within an object for like base: css`...`,
    visitObjectProperty(path) {
      if (
        path.node.value.type === "TaggedTemplateExpression" &&
        (path.node.value.tag.name === "css" ||
          path.node.value.tag.name === "keyframes")
      ) {
        path.node.value = convertColorsInTaggedExpression(path.node.value);
      }
    },
  };
};

export { transform };
