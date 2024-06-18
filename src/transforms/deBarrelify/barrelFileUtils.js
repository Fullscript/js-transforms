/**
 * Given path, determines if it is a barrel file (index file)
 *
 * @param {string} path
 * @returns {boolean}
 */
const isBarrelFile = path => {
  // TODO: add support for specifying a list of barrel file names
  return (
    path.endsWith("/index.ts") ||
    path.endsWith("/index.tsx") ||
    path.endsWith("/helpers.ts") ||
    path.endsWith("/helpers.tsx")
  );
};

/**
 * Given a path, remove the barrel file name from it
 * ex: src/components/index.ts -> src/components/
 *
 * @param {string} path
 * @returns {string} - the path with the barrel file name removed
 */
const removeBarrelFileFromPath = path => {
  // TODO: also need to modify this to account for different barrel file names
  return path.replace(/(index|helpers)\.tsx?/, "");
};

export { isBarrelFile, removeBarrelFileFromPath };
