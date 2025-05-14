import { getTsconfig } from "get-tsconfig";

/**
 * Returns the baseUrl from the tsconfig file
 * If no source directory is specified, returns the current directory .
 *
 * @returns {string} - the source directory
 */
const getBaseUrl = () => {
  const { config: tsconfig } = getTsconfig() ?? {};

  const srcDirectory = tsconfig?.compilerOptions?.baseUrl;
  if (!srcDirectory) return ".";

  return srcDirectory.replace("./", "");
};

export { getBaseUrl };
