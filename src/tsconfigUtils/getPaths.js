import { getTsconfig } from "get-tsconfig"; /**

 * Returns paths specified in the tsconfig file
 * If no paths are specified, returns an empty object
 *
 * @returns {Record<string, string[]>} - the paths
 */
const getPaths = () => {
  const { config: tsconfig } = getTsconfig() ?? {};

  return tsconfig?.compilerOptions?.paths ?? {};
};

export { getPaths };
