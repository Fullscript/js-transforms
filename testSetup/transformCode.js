import { print } from "recast";

import { parseCode } from "../src/parser";
import { transformer } from "../src/transformer";

const transformCode = ({ code, options, transform }) => {
  const node = transformer({
    ast: parseCode(code),
    transformToRun: transform,
    options,
  });

  return print(node).code;
};

export { transformCode };
