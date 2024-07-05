import { getBaseUrl } from "../../../tsconfigUtils/getBaseUrl.js";
import { getAlias } from "../resolver.js";

const srcDirectory = getBaseUrl();
const aliases = getAlias();

/**
 * Removes the file extension from a path
 *
 * @param {string} path
 * @returns {string}
 */
const removeFileExtension = path => {
  return path.replace(/\.[^/.]+$/, "");
};

/**
 * Removes the src directory from a path
 *
 * @param {string} path
 * @returns {stirng}
 */
const removeSrcDirectory = path => {
  return path.replace(`${srcDirectory}/`, "");
};

/**
 * Given a path, determines if it should start with an alias
 *
 * @param {string} path
 * @returns {string | undefined}
 */
const findMatchingAlias = path => {
  return Object.keys(aliases).find(alias => path.startsWith(`${srcDirectory}/${aliases[alias]}`));
};

/**
 * Given a path, if it doesn't start with a ".", add "./" to the beginning
 *
 * @param {string} path
 * @returns {string}
 */
const makeRelativePath = path => {
  if (path.startsWith(".")) {
    return path;
  }

  return `./${path}`;
};

/**
 * Given a specifier, importSource and path
 * replace the existing ImportDeclaration with a new one that deeply imports the specifier
 *
 * @typedef {Object} replaceImportDeclarationWithDeepImportParams
 * @property {import("ast-types/gen/builders").builders} builder - Recast builder for transforming the AST
 * @property {import("ast-types/lib/node-path").NodePath<import("ast-types/gen/kinds").ImportDeclarationKind, any>} path - the path to replace
 * @property {string} newImportSource - import source
 * @property {import("ast-types/gen/kinds").ImportSpecifierKind} specifier - the specifier to import
 * @property {boolean} importAs - whether or not to import as wildcard
 *
 * @param {replaceImportDeclarationWithDeepImportParams}
 * @returns {void}
 */
const replaceImportDeclarationWithDeepImport = ({
  builder,
  path,
  newImportSource,
  specifier,
  importAs,
}) => {
  // If the specifier doesn't have an imported name, we don't do anything
  // e.g.:import "@testing-library/jest-native/extend-expect";
  if (!specifier.imported?.name) {
    return;
  }

  // DONE: make sure to add the @shared alias to the import source
  // using insertAfter so that imports with multiple specifiers don't overwrite one another
  let newSpecifier = builder.importSpecifier(builder.identifier(specifier.imported.name));

  // Some imports have a local name, so we need to account for that
  if (specifier.local && !importAs) {
    // type based import specifiers aren't supported by recast, these will need to be manually fixed
    newSpecifier = builder.importSpecifier(
      builder.identifier(specifier.imported.name),
      builder.identifier(specifier.local.name)
    );
  } else if (specifier.local && importAs) {
    // Some imports are imported as a wildcard, so we need to account for that
    // e.g: import * as React from "react";
    newSpecifier = builder.importNamespaceSpecifier(builder.identifier(specifier.local.name));
  }

  const matchingAlias = findMatchingAlias(newImportSource);
  const importSourceWithoutExtension = removeFileExtension(newImportSource);
  const importSourceWithoutSrcDirectory = removeSrcDirectory(importSourceWithoutExtension);
  let finalizedImportSource = makeRelativePath(importSourceWithoutSrcDirectory);

  // if source matches a tsconfig alias, replace the path with the alias
  if (matchingAlias) {
    finalizedImportSource = importSourceWithoutSrcDirectory.replace(
      aliases[matchingAlias],
      matchingAlias
    );
  }

  path.insertAfter(
    builder.importDeclaration(
      [newSpecifier],
      builder.stringLiteral(finalizedImportSource),
      specifier?.importKind
    )
  );
};

export { replaceImportDeclarationWithDeepImport };
