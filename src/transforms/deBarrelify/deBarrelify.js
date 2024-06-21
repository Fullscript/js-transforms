import { readFileSync } from "node:fs";
import { parseCode } from "../../parser.js";
import { visit } from "recast";
import isBuiltinModule from "is-builtin-module";

import { resolveAbsolutePath } from "./resolver.js";
import { isBarrelFile, removeBarrelFileFromPath } from "./barrelFileUtils.js";

import { replaceImportDeclarationWithDeepImport } from "./replaceImportDeclarationWithDeepImport/replaceImportDeclarationWithDeepImport.js";
import { exportNamedDeclarationHasSpecifier } from "../../astUtils/index.js";

/**
 * Type definitions for VSCode autocompletion!
 *
 * @typedef {Object} TransformParams
 * @property {*} ast - The resulting AST as parsed by babel
 * @property {import("ast-types/gen/builders").builders} builder - Recast builder for transforming the AST
 * @property {*} options - Options passed into the transform from the CLI (if any)
 */

/**
 * @typedef {Object} findSpecifierSourceParams
 * @property {string} filePath - the file path
 * @property {import("ast-types/gen/kinds").ImportSpecifierKind} specifier - the specifier to find
 *
 * @typedef {Object} findSpecifierSourceResult
 * @property {string|undefined} specifierSource - the found specifier
 * @property {boolean} importAs - true if the specifier was imported as wildcard
 * @property {string[]} potentialSpecifierSources - the potential specifier sources
 *
 * @param {findSpecifierSourceParams}
 * @returns {findSpecifierSourceResult}
 */
const findSpecifierSource = ({ filePath, specifier }) => {
  let specifierSource;
  let importAs = false;
  let potentialSpecifierSources = [];

  const code = readFileSync(filePath, { encoding: "utf-8", flag: "r" });
  const barrelFileAst = parseCode(code);

  visit(barrelFileAst, {
    visitImportDeclaration: function (importPath) {
      if (importPath.node.specifiers.some(spec => spec.local.name === specifier?.imported?.name)) {
        // DONE: identify the import name
        specifierSource = importPath.node.source.value;
        importAs = true;
        return false; // stop parsing, found what we needed
      }

      this.traverse(importPath);
    },
    visitExportNamedDeclaration: function (exportPath) {
      if (exportNamedDeclarationHasSpecifier({ exportNode: exportPath.node, specifier })) {
        if (exportPath.node.source) {
          // DONE: identify the export name
          specifierSource = exportPath.node?.source?.value;
        } else if (!specifierSource) {
          // prevent conflict with visitImportDeclaration if the specifierSource is already set
          // This can conflict in cases where an import statement is used to load a module which is then exported as a separate statement
          // ex: app/javascript/styles/index.ts
          // If the export statement doesn't have a source, it's likely defined in the current filePath, set that as the returned source
          specifierSource = filePath;
        }
        return false; // stop parsing, found what we needed
      }

      this.traverse(exportPath);
    },
    visitExportAllDeclaration: function (exportPath) {
      potentialSpecifierSources.push(exportPath.node.source.value);
      this.traverse(exportPath);
    },

    // Look at adding support for visitExportNamedDeclaration with wildcard
  });

  return { specifierSource, importAs, potentialSpecifierSources };
};

/**
 * @typedef {Object} transformImportParams
 * @property {import("ast-types/gen/builders").builders} builder - Recast builder for transforming the AST
 * @property {import("ast-types/lib/node-path").NodePath<import("ast-types/gen/kinds").ImportDeclarationKind, any>} path - the path to replace
 * @property {string} importSource - import source
 * @property {import("ast-types/gen/kinds").ImportSpecifierKind} specifier - the specifier to import
 *
 * @param {transformImportParams} param0
 * @returns {boolean} - true if the import was transformed
 */
const transformImport = ({ builder, path, importSource, specifier }) => {
  // DONE: visit the barrel file and parse it's contents into an AST
  const { specifierSource, importAs, potentialSpecifierSources } = findSpecifierSource({
    filePath: importSource,
    specifier,
  });

  // If there's no found specifier, we don't do anything more
  // If specifier if the same as the importSource, we don't do anything more
  if (specifierSource && specifierSource !== importSource) {
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
        importAs,
      });

      return true;
    } else {
      // DONE: if it's a barrel file, go down again
      return transformImport({
        builder,
        path,
        importSource: deeperResolvedPath,
        specifier,
      });
    }
  } else if (potentialSpecifierSources.length > 0) {
    // loop through each potentialSpecifierSource, dive into if further and check if the specifier is found
    // if it is, replace the import with the deeperResolvedPath
    // if it's not, continue to the next potentialSpecifierSource
    // if nothing is found, do nothing

    for (let i = 0; i < potentialSpecifierSources.length; i++) {
      const deeperResolvedPath = resolveAbsolutePath({
        context: {},
        resolveContext: {},
        folderPath: removeBarrelFileFromPath(`./${importSource}`),
        importSource: potentialSpecifierSources[i],
      });

      if (isBarrelFile(deeperResolvedPath)) {
        const wasImportTransformed = transformImport({
          builder,
          path,
          importSource: deeperResolvedPath,
          specifier,
        });

        if (wasImportTransformed) {
          return true;
        }
      } else {
        replaceImportDeclarationWithDeepImport({
          builder,
          path,
          newImportSource: deeperResolvedPath,
          specifier,
          importAs,
        });

        return true;
      }
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
            const wasImportTransformed = transformImport({
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
