import resolver from "enhanced-resolve";
import { getBaseUrl } from "../../tsconfigUtils/getBaseUrl.js";
import { getPaths } from "../../tsconfigUtils/getPaths.js";

/**
 * @typedef {object} getAliasParams
 * @property {import("get-tsconfig").TsConfigJsonResolved} tsconfig - The resolved tsconfig as an object
 * @param {getAliasParams} param
 *
 * @return {object} - Resolver alias
 */
const getAlias = () => {
  let alias = {};
  const tsconfigPaths = getPaths();

  // Convert tsconfig paths to alias that is understood by enhanced-resolve
  Object.keys(tsconfigPaths).forEach(key => {
    alias[key.replace("/*", "")] = tsconfigPaths[key][0].replace("/*", "");
  });

  return alias;
};

/**
 * @typedef {object} getResolverParams
 * @param {getResolverParams} param
 *
 * @returns {import("enhanced-resolve/types").ResolveFunction}
 */
const getResolver = () => {
  const baseUrl = getBaseUrl();

  return resolver.create.sync({
    preferRelative: true,
    modules: ["node_modules", baseUrl],
    extensions: [
      ".tsx",
      ".ts",
      ".d.ts",
      ".mjs",
      ".json",
      ".js",
      ".jsx",
      ".sass",
      ".scss",
      ".css",
      ".module.sass",
      ".module.scss",
      ".module.css",
      ".png",
      ".gif",
      ".jpeg",
      ".jpg",
    ],
    alias: getAlias(),
  });
};

/**
 * Given a import source, returns the deep absolute source
 *
 * @typedef {Object} resolveAbsolutePathParams
 * @property {*} context - a context?
 * @property {string} folderPath - relative project path
 * @property {resolveContext} - resolver context
 * @property {string} importSource - import source
 * @param {resolveAbsolutePathParams}
 *
 * @returns {string} - the resolved deep import path
 */
const resolveAbsolutePath = ({ context, folderPath, resolveContext, importSource }) => {
  try {
    const resolveSync = getResolver();
    const resolvedPath = resolveSync(context, folderPath, importSource, resolveContext);

    if (!resolvedPath.startsWith("node_modules")) {
      return resolvedPath;
    }
  } catch (e) {
    if (!e.message.includes("is not exported from package node_modules")) {
      throw e;
    }
  }

  return "";
};

export { resolveAbsolutePath, getAlias };
