import { readFileSync } from "node:fs";
import { parseCode } from "../../parser.js";
import { visit } from "recast";
import isBuiltinModule from "is-builtin-module";

import { resolveAbsolutePath } from "./resolver.js";
import { isBarrelFile, removeBarrelFileFromPath } from "./barrelFileUtils.js";

import { replaceImportDeclarationWithDeepImport } from "./replaceImportDeclarationWithDeepImport/replaceImportDeclarationWithDeepImport.js";

/**
 * Type definitions for VSCode autocompletion!
 *
 * @typedef {Object} TransformParams
 * @property {*} ast - The resulting AST as parsed by babel
 * @property {import("ast-types/gen/builders").builders} builder - Recast builder for transforming the AST
 * @property {*} options - Options passed into the transform from the CLI (if any)
 */

/**
 * @typedef {Object} visitFileParams
 * @property {string} filePath - the file path
 * @property {import("ast-types/gen/kinds").ImportSpecifierKind} specifier - the specifier to find
 *
 * @param {visitFileParams}
 * @returns {string|undefined} - the found specifier
 */
const findSpecifierSource = ({ filePath, specifier }) => {
  const code = readFileSync(filePath, { encoding: "utf-8", flag: "r" });
  const barrelFileAst = parseCode(code);
  // const srcDirectory = getBaseUrl();

  let specifierSource;
  let exportAllSources = [];

  visit(barrelFileAst, {
    visitExportNamedDeclaration: function (exportPath) {
      if (
        exportPath.node.specifiers?.find(
          exportSpecifier => exportSpecifier.exported.name === specifier?.imported?.name
        )
      ) {
        // If the export statement doesn't have a source, it's likely defined in the current filePath, set that as the returned source
        if (!exportPath.node.source) {
          specifierSource = filePath;
        } else {
          // DONE: identify the export name
          specifierSource = exportPath.node?.source?.value;
        }
        return false; // stop parsing, found what we needed
      }

      this.traverse(exportPath);
    },
    visitExportAllDeclaration: function (exportAllPath) {
      exportAllSources.push(exportAllPath.node.source.value);

      this.traverse(exportAllPath);
    },
  });

  return specifierSource;
};

/**
 * @typedef {Object} recursionParams
 * @property {import("ast-types/gen/builders").builders} builder - Recast builder for transforming the AST
 * @property {import("ast-types/lib/node-path").NodePath<import("ast-types/gen/kinds").ImportDeclarationKind, any>} path - the path to replace
 * @property {string} importSource - import source
 * @property {import("ast-types/gen/kinds").ImportSpecifierKind} specifier - the specifier to import
 *
 * @param {recursionParams} param0
 * @returns {boolean} - true if the import was transformed
 */
const startRecursion = ({ builder, path, importSource, specifier }) => {
  // DONE: visit the barrel file and parse it's contents into an AST
  const specifierSource = findSpecifierSource({ filePath: importSource, specifier });

  // If there's no found specified, we don't do anything more
  if (specifierSource) {
    const deeperResolvedPath = resolveAbsolutePath({
      context: {},
      resolveContext: {},
      folderPath: removeBarrelFileFromPath(`./${importSource}`),
      importSource: specifierSource,
    });

    // DONE: if it's a not a barrel file, create a new importDeclaration for this specifier with the path to this file
    if (!isBarrelFile(deeperResolvedPath)) {
      replaceImportDeclarationWithDeepImport({
        builder,
        path,
        newImportSource: deeperResolvedPath,
        specifier,
      });

      return true;
    } else {
      // DONE: if it's a barrel file, go down again
      return startRecursion({
        builder,
        path,
        importSource: deeperResolvedPath,
        specifier,
      });
    }
  }

  return false;
};

/**
 * @param {TransformParams} param0
 * @returns {import("ast-types").Visitor}
 */
const transform = ({ builder, filePath }) => {
  const folderPath = filePath.split("/").slice(0, -1).join("/");

  return {
    visitImportDeclaration: path => {
      let importTransformed = false;

      // Verify that the import is not a node builtin module
      if (!isBuiltinModule(path.node.source.value)) {
        const resolvedPath = resolveAbsolutePath({
          context: {},
          resolveContext: {},
          folderPath,
          importSource: path.node.source.value,
        });

        if (resolvedPath && isBarrelFile(resolvedPath)) {
          path.node.specifiers.forEach(specifier => {
            const wasImportTransformed = startRecursion({
              builder,
              path,
              importSource: resolvedPath,
              specifier,
            });

            if (wasImportTransformed && !importTransformed) {
              importTransformed = true;
            }
          });
        }

        // DONE: If the import was transformed into a deep import, delete the original import
        if (importTransformed) {
          path.prune();
        }
      }
    },
  };
};

export { transform };
