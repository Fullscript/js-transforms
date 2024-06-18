import { beforeEach, describe, it, vi, expect } from "vitest";
import { replaceImportDeclarationWithDeepImport } from "./replaceImportDeclarationWithDeepImport.js";
import { types } from "recast";

const builder = types.builders;

vi.mock("../../../tsconfigUtils/getBaseUrl.js", () => ({
  getBaseUrl: () => "./src",
}));

vi.mock("../resolver.js", () => ({
  getAlias: () => ({
    "@components": "components",
  }),
}));

describe("replaceImportDeclarationWithDeepImport", () => {
  let path;

  beforeEach(() => {
    path = {
      insertAfter: vi.fn(),
      node: {
        importKind: "value",
      },
    };
  });

  it("replaces the existing ImportDeclaration with a new one that deeply imports the specifier", () => {
    replaceImportDeclarationWithDeepImport({
      builder,
      path,
      newImportSource: "./src/utils/useDebounce.ts",
      specifier: { imported: { name: "useDebounce" } },
    });

    expect(path.insertAfter).toHaveBeenCalledWith(
      expect.objectContaining({
        importKind: "value",
        source: expect.objectContaining({
          extra: {
            raw: '"./utils/useDebounce"',
            rawValue: "./utils/useDebounce",
          },
          type: "StringLiteral",
          value: "./utils/useDebounce",
        }),
        specifiers: [
          expect.objectContaining({
            imported: {
              comments: null,
              loc: null,
              name: "useDebounce",
              optional: false,
              type: "Identifier",
              typeAnnotation: null,
            },
          }),
        ],
        type: "ImportDeclaration",
      })
    );
  });

  describe("when the specifier has a local name", () => {
    it("replaces the existing ImportDeclaration with a new one with the same local name as the existing declaration", () => {
      replaceImportDeclarationWithDeepImport({
        builder,
        path,
        newImportSource: "./src/Button/Button.tsx",
        specifier: { imported: { name: "Props" }, local: { name: "ButtonProps" } },
      });

      expect(path.insertAfter).toHaveBeenCalledWith(
        expect.objectContaining({
          importKind: "value",
          source: expect.objectContaining({
            extra: {
              raw: '"./Button/Button"',
              rawValue: "./Button/Button",
            },
            type: "StringLiteral",
            value: "./Button/Button",
          }),
          specifiers: [
            expect.objectContaining({
              imported: {
                comments: null,
                loc: null,
                name: "Props",
                optional: false,
                type: "Identifier",
                typeAnnotation: null,
              },
              local: {
                comments: null,
                loc: null,
                name: "ButtonProps",
                optional: false,
                type: "Identifier",
                typeAnnotation: null,
              },
            }),
          ],
          type: "ImportDeclaration",
        })
      );
    });
  });

  describe("when importDeclaration is importKind type", () => {
    it("creates a new ImportDeclaration with importKind type", () => {
      let path = {
        insertAfter: vi.fn(),
        node: {
          importKind: "type",
        },
      };

      replaceImportDeclarationWithDeepImport({
        builder,
        path,
        newImportSource: "./src/Button/Button.tsx",
        specifier: { imported: { name: "Props" }, local: { name: "ButtonProps" } },
      });

      expect(path.insertAfter).toHaveBeenCalledWith(
        expect.objectContaining({ importKind: "type" })
      );
    });
  });

  describe("when importDeclaration is a relative parent path", () => {
    it("creates a new ImportDeclaration with importKind type", () => {
      let path = {
        insertAfter: vi.fn(),
        node: {
          importKind: "type",
        },
      };

      replaceImportDeclarationWithDeepImport({
        builder,
        path,
        newImportSource: "../foo/bar.tsx",
        specifier: { imported: { name: "Props" }, local: { name: "BarProps" } },
      });

      expect(path.insertAfter).toHaveBeenCalledWith(
        expect.objectContaining({
          importKind: "type",
          source: expect.objectContaining({
            extra: {
              raw: '"../foo/bar"',
              rawValue: "../foo/bar",
            },
            type: "StringLiteral",
            value: "../foo/bar",
          }),
          specifiers: [
            expect.objectContaining({
              imported: {
                comments: null,
                loc: null,
                name: "Props",
                optional: false,
                type: "Identifier",
                typeAnnotation: null,
              },
              local: {
                comments: null,
                loc: null,
                name: "BarProps",
                optional: false,
                type: "Identifier",
                typeAnnotation: null,
              },
            }),
          ],
          type: "ImportDeclaration",
        })
      );
    });
  });

  describe("when importDeclaration is an aliased path", () => {
    it("creates a new ImportDeclaration with aliased source", () => {
      replaceImportDeclarationWithDeepImport({
        builder,
        path,
        newImportSource: "./src/components/Button/Button.tsx",
        specifier: { imported: { name: "Props" }, local: { name: "ButtonProps" } },
      });

      expect(path.insertAfter).toHaveBeenCalledWith(
        expect.objectContaining({
          importKind: "value",
          source: expect.objectContaining({
            extra: {
              raw: '"@components/Button/Button"',
              rawValue: "@components/Button/Button",
            },
            type: "StringLiteral",
            value: "@components/Button/Button",
          }),
          specifiers: [
            expect.objectContaining({
              imported: {
                comments: null,
                loc: null,
                name: "Props",
                optional: false,
                type: "Identifier",
                typeAnnotation: null,
              },
              local: {
                comments: null,
                loc: null,
                name: "ButtonProps",
                optional: false,
                type: "Identifier",
                typeAnnotation: null,
              },
            }),
          ],
          type: "ImportDeclaration",
        })
      );
    });
  });
});
