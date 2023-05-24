import { visit, types, print, parse } from "recast";

const b = types.builders;

let parentNode = null;
let colorToReplace;
let themeToReplaceWith;
let addedThemeImportType = false;
let convertedColorToTheme = false;
let hasImportedThemeType = false;

/**
 * Adds Theme as a type specifier to any existing @emotion/react import declaration
 */
const addThemeTypeImport = () => {
  parentNode.body.unshift(
    b.importDeclaration(
      [b.importSpecifier(b.identifier("Theme"))],
      b.stringLiteral("@emotion/react"),
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
const convertColorsToThemeExpressions = (expressions) => {
  return expressions.map((cssExpression) => {
    if (cssExpression.type === "MemberExpression") {
      const serializedCssExpression = print(cssExpression).code;

      // If expression is the color expression to replace, do stuff
      if (serializedCssExpression === colorToReplace) {
        convertedColorToTheme = true;
        return parse(themeToReplaceWith);
      }
    }

    // Not a MemberExpression so thus can't be colors
    return cssExpression;
  });
};

const transform = (ast, callback, options) => {
  colorToReplace = options[0];
  themeToReplaceWith = options[1];
  addedThemeImportType = false;
  convertedColorToTheme = false;
  hasImportedThemeType = false;
  parentNode = null;

  visit(ast, {
    visitProgram(path) {
      if (!parentNode) {
        parentNode = path.node;
      }

      this.traverse(path);
    },
    visitImportDeclaration(path) {
      // verify if Theme is already imported via a @emotion/react importDeclaration
      if (path.node.source.value === "@emotion/react") {
        hasImportedThemeType = containsSpecifier(path.node, "Theme");
      }

      this.traverse(path);
    },
    visitVariableDeclarator(path) {
      // I'm assuming that all occurrences of colors happens within TaggedTemplateExpressions and not in functions or anything else
      if (
        path.node.init.type === "TaggedTemplateExpression" &&
        path.node.init.tag.name === "css"
      ) {
        path.node.init.quasi.expressions = convertColorsToThemeExpressions(
          path.node.init.quasi.expressions
        );
        
        // Import Theme type if it doesn't already exist, needed for changing colors to themes
        if (!hasImportedThemeType && !addedThemeImportType && convertedColorToTheme) {
          addThemeTypeImport();
        }

        // If we have converted a color to theme, we must wrap the template literal in a function
        if (convertedColorToTheme) {
          const themeIdentifier = b.identifier("theme");
          themeIdentifier.typeAnnotation = b.typeAnnotation(b.genericTypeAnnotation(b.identifier("Theme"), null));
          path.node.init = b.arrowFunctionExpression([themeIdentifier], path.node.init);
          convertedColorToTheme = false;
        }
      }

      this.traverse(path);
    },
  });

  callback(ast);
};

export { transform };
