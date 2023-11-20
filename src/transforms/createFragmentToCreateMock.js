let needToImportCreateMock = true;
let rtlImportNode = null;
let parentNode;
let createFragmentFunction;
let graphqlTypeName;

/**
 * Type definitions for VSCode autocompletion!
 *
 * @typedef {Object} TransformParams
 * @property {*} ast - The resulting AST as parsed by babel
 * @property {import("ast-types/gen/builders").builders} builder - Recast builder for transforming the AST
 * @property {*} options - Options passed into the transform from the CLI (if any)
 */

/**
 * @param {TransformParams} param0
 * @returns {import("ast-types").Visitor}
 */
const transform = ({ builder, options }) => {
  createFragmentFunction = options[0];
  graphqlTypeName = options[1];

  /**
   * Converts arguments passed into a create*Fragment function into an objectExpression
   * that can be passed into a createMock callExpression
   *
   * ex:
   * - createPatientFragment(id, { firstName: "John" })
   * to
   * - { typeName: "Patient", overrides: { id, firstName: "John" }}
   */
  const buildCreateMockParams = node => {
    const id = node.arguments[0];
    let overrides = node.arguments[1] ?? builder.objectExpression([]);

    node.callee.name = "createMock";

    const createMockParam = builder.objectExpression([
      builder.objectProperty(
        builder.identifier("typeName"),
        builder.stringLiteral(graphqlTypeName)
      ),
    ]);

    // In the case where a variable is being passed directly into create*Fragment
    // Ex: createVariantFragment("1", variantOptions);
    if (overrides.type === "Identifier") {
      overrides = builder.objectExpression([builder.spreadElement(overrides)]);
    }

    overrides.properties.unshift(builder.objectProperty(builder.identifier("id"), id));

    createMockParam.properties.push(
      builder.objectProperty(builder.identifier("overrides"), overrides)
    );

    return createMockParam;
  };

  /**
   * Adds createMock as a specifier to any existing @testing/rtl import declaration
   * or creates a new import declaration importing createMock from @testing/createMock
   */
  const addCreateMockImport = () => {
    if (rtlImportNode) {
      rtlImportNode.specifiers.push(builder.importSpecifier(builder.identifier("createMock")));
    } else {
      // need to add via parentNode
      parentNode.body.unshift(
        builder.importDeclaration(
          [builder.importSpecifier(builder.identifier("createMock"))],
          builder.stringLiteral("@testing/createMock")
        )
      );
    }
  };

  /**
   * Determines if specifierName is contained within the list of import specifiers
   */
  const containsSpecifier = (node, specifierName) => {
    return !!node.specifiers.find(specifier => {
      return specifier?.imported?.name === specifierName;
    });
  };

  /**
   * Removes the createFragmentFunction from list of specifiers
   */
  const removeCreateFragmentImport = node => {
    return node.specifiers.filter(specifier => {
      return specifier.imported.name !== createFragmentFunction;
    });
  };

  return {
    visitProgram(path) {
      // Need to reset these global properties to initial state for each processed file
      needToImportCreateMock = true;
      parentNode = path.node;
      rtlImportNode = null;
    },
    visitImportDeclaration(path) {
      // already imported createMock so no need to create an import statement later
      if (path.node.source.value === "@testing/createMock") {
        needToImportCreateMock = false;
      }

      // verify if createMock is already imported via a @testing/rtl importDeclaration
      if (path.node.source.value === "@testing/rtl") {
        const hasImportedCreateMock = containsSpecifier(path.node, "createMock");

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
    },
  };
};

export { transform };
