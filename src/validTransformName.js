import { AVAILABLE_TRANSFORMS } from "./availableTransforms.js";

const validTransformName = transformName => {
  return AVAILABLE_TRANSFORMS.includes(transformName);
};

export { validTransformName };
