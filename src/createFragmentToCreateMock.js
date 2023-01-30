import { visit, types } from "recast";

const b = types.builders;
let needToImportCreateMock = true;
let rtlImportNode = null;
let parentNode;

const buildCreateMockParams = (node) => {
  const id = node.arguments[0];
  const overrides = node.arguments?.[1] ?? {};

  node.callee.name = "createMock";

  const createMockParam = b.objectExpression([
    b.objectProperty(b.identifier("typeName"), b.stringLiteral("Patient")),
  ]);

  overrides.properties.unshift(b.objectProperty(b.identifier("id"), id));
  createMockParam.properties.push(
    b.objectProperty(b.identifier("overrides"), overrides)
  );

  return createMockParam;
};

const addCreateMockImport = () => {
  if (rtlImportNode) {
    rtlImportNode.specifiers.push(
      b.importSpecifier(b.identifier("createMock"))
    );
  } else {
    // need to add via parentNode
    parentNode.body.unshift(
      b.importDeclaration(
        b.importSpecifier(b.identifier("createMock")),
        b.stringLiteral("@testing/createMock"),
      )
    );
  }
};

const transform = (ast, callback) => {
  visit(ast, {
    visitProgram(path) {
      needToImportCreateMock = true;
      parentNode = path.node;
      rtlImportNode = null;

      this.traverse(path);
    },
    visitImportDeclaration(path) {
      // already imported createMock
      if (path.node.source.value === "@testing/createMock") {
        needToImportCreateMock = false;
      }

      if (path.node.source.value === "@testing/rtl") {
        // verify if createMock is already imported
        const hasImportedCreateMock = path.node.specifiers.find((specifier) => {
          return specifier?.imported?.name === "createMock";
        });

        if (hasImportedCreateMock) {
          needToImportCreateMock = false;
        } else {
          rtlImportNode = path.node;
        }
      }

      this.traverse(path);
    },
    visitCallExpression(path) {
      if (path.node.callee.name === "createPatientFragment") {
        // If there's a match, then we need to also import `createMock` depending on needToImportCreateMock
        const createMockParam = buildCreateMockParams(path.node);

        path.node.arguments = [createMockParam];

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
