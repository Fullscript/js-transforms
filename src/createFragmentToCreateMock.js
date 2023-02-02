import { visit, types } from "recast";

const b = types.builders;
let needToImportCreateMock = true;
let rtlImportNode = null;
let parentNode;
let createFragmentFunction;
let graphqlTypeName;

/**
 * Converts arguments passed into a create*Fragment function into an objectExpression
 * that can be passed into a createMock callExpression
 *
 * ex:
 * - createPatientFragment(id, { firstName: "John" })
 * to
 * - { typeName: "Patient", overrides: { id, firstName: "John" }}
 */
const buildCreateMockParams = (node) => {
  const id = node.arguments[0];
  let overrides = node.arguments[1] ?? b.objectExpression([]);

  node.callee.name = "createMock";

  const createMockParam = b.objectExpression([
    b.objectProperty(
      b.identifier("typeName"),
      b.stringLiteral(graphqlTypeName)
    ),
  ]);

  // In the case where a variable is being passed directly into create*Fragment
  // Ex: createVariantFragment("1", variantOptions);
  if (overrides.type === "Identifier") {
    overrides = b.objectExpression([b.spreadElement(overrides)]);
  }

  overrides.properties.unshift(b.objectProperty(b.identifier("id"), id));

  createMockParam.properties.push(
    b.objectProperty(b.identifier("overrides"), overrides)
  );

  return createMockParam;
};

/**
 * Adds createMock as a specifier to any existing @testing/rtl import declaration
 * or creates a new import declaration importing createMock from @testing/createMock
 */
const addCreateMockImport = () => {
  if (rtlImportNode) {
    rtlImportNode.specifiers.push(
      b.importSpecifier(b.identifier("createMock"))
    );
  } else {
    // need to add via parentNode
    parentNode.body.unshift(
      b.importDeclaration(
        [b.importSpecifier(b.identifier("createMock"))],
        b.stringLiteral("@testing/createMock")
      )
    );
  }
};

/**
 * Determines if specifierName is contained within the list of import specifiers
 */
const containsSpecifier = (node, specifierName) => {
  return !!node.specifiers.find((specifier) => {
    return specifier?.imported?.name === specifierName;
  });
};

/**
 * Removes the createFragmentFunction from list of specifiers
 */
const removeCreateFragmentImport = (node) => {
  return node.specifiers.filter((specifier) => {
    return specifier.imported.name !== createFragmentFunction;
  });
};

const transform = (ast, callback, options) => {
  createFragmentFunction = options[0];
  graphqlTypeName = options[1];

  visit(ast, {
    visitProgram(path) {
      // Need to reset these global properties to initial state for each processed file
      needToImportCreateMock = true;
      parentNode = path.node;
      rtlImportNode = null;

      this.traverse(path);
    },
    visitImportDeclaration(path) {
      // already imported createMock so no need to create an import statement later
      if (path.node.source.value === "@testing/createMock") {
        needToImportCreateMock = false;
      }

      // verify if createMock is already imported via a @testing/rtl importDeclaration
      if (path.node.source.value === "@testing/rtl") {
        const hasImportedCreateMock = containsSpecifier(
          path.node,
          "createMock"
        );

        if (hasImportedCreateMock) {
          needToImportCreateMock = false;
        } else {
          rtlImportNode = path.node;
        }
      }

      // Removes createFragmentImport specifier
      // First condition is when just a single specifier exists within the importDeclaration
      if (
        containsSpecifier(path.node, createFragmentFunction) &&
        path.node.specifiers.length === 1
      ) {
        path.prune();
      } else if (containsSpecifier(path.node, createFragmentFunction)) {
        // More than one specifier is declared, we just remove create*Fragment
        path.node.specifiers = removeCreateFragmentImport(path.node);
      }

      this.traverse(path);
    },
    visitCallExpression(path) {
      if (path.node.callee.name === createFragmentFunction) {
        const createMockParam = buildCreateMockParams(path.node);

        path.node.arguments = [createMockParam];

        // Since we replaced a create*Fragment with a createMock, we need to add the import if there's not already one
        if (needToImportCreateMock) {
          addCreateMockImport();

          // We have now added the import statement, no need to do so again for other instances of create*Fragment
          needToImportCreateMock = false;
        }
      }

      this.traverse(path);
    },
  });

  callback(ast);
};

export { transform };
