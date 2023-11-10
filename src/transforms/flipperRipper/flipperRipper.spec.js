import { expect, it, describe } from "vitest";
import { print } from "recast";

import { parseCode } from "../../parser";
import { transformer } from "../../transformer";
import { transform } from "./flipperRipper";

const transformCode = ({ code, options, onTransformed }) => {
  transformer({
    ast: parseCode(code),
    transformToRun: transform,
    onTransformed: (node) => {
      const transformedCode = print(node).code;

      onTransformed(transformedCode);
    },
    options,
  });
};

describe("flipperRipper", () => {
  describe("when the flipper to remove is the only one in useFlippers", () => {
    it("removes the useFlippers call entirely", () => {
      const code = `const [isFlipperEnabled] = useFlippers("flipper_name");`;

      transformCode({
        code,
        options: ["flipper_name"],
        onTransformed: (result) => {
          expect(result).toEqual("");
        },
      });
    });

    describe("when useFlippers is the only specifier in an import", () => {
      it("removes the useFlippers ImportDeclaration", () => {
        const code = `
          import { useFlippers } from "@shared/utils";
          const [isFlipperEnabled] = useFlippers("flipper_name");
        `;

        transformCode({
          code,
          options: ["flipper_name"],
          onTransformed: (result) => {
            expect(result.trim()).toEqual("");
          },
        });
      });
    });

    describe("when useFlippers is one of multiple specifiers in an import", () => {
      it("removes the useFlippers specifier only", () => {
        const code = `
          import { useFlippers, someOtherUtil } from "@shared/utils";
          const [isFlipperEnabled] = useFlippers("flipper_name");
        `;

        transformCode({
          code,
          options: ["flipper_name"],
          onTransformed: (result) => {
            expect(result.trim()).toEqual(
              `import { someOtherUtil } from "@shared/utils";`
            );
          },
        });
      });
    });
  });

  describe("when the flipper to remove is NOT the only one in useFlippers", () => {
    it("removes flipper variable and argument from useFlippers", () => {
      const code = `const [isFlipperEnabled, isAnotherFlipperEnabled] = useFlippers("flipper_name", "another_flipper_name")`;

      transformCode({
        code,
        options: ["flipper_name"],
        onTransformed: (result) => {
          expect(result).toEqual(
            `const [isAnotherFlipperEnabled] = useFlippers("another_flipper_name")`
          );
        },
      });
    });
  });

  describe("BlockStatement", () => {
    describe("when flipper variable to remove is part of if statement and has an early return", () => {
      it("unwraps the if statement and removes the default return/condition", () => {
        const code = `
import { useFlippers } from "@shared/hooks";

const Component = () => {
  const [isFlipperEnabled] = useFlippers("flipper_name");
  const loadingState = "Loading...";

  if (isFlipperEnabled) {
    return (
      <div data-testid="flipper-enabled-div">
        {loadingState}
      </div>
    );
  }

  return <div data-testid="flipper-disabled-div">{loadingState}</div>;
};`;

        transformCode({
          code,
          options: ["flipper_name"],
          onTransformed: (result) => {
            expect(result).toEqual(
              `
const Component = () => {
  const loadingState = "Loading...";

  return (
    <div data-testid="flipper-enabled-div">
      {loadingState}
    </div>
  );
};`
            );
          },
        });
      });
    });

    describe("when flipper variable to remove is part of if statement and has an early inline return", () => {
      it("removes the if statement and removes the default return/condition", () => {
        const code = `
import { useFlippers } from "@shared/hooks";

const Component = () => {
  const [isFlipperEnabled] = useFlippers("flipper_name");
  const loadingState = "Loading...";

  if (isFlipperEnabled) return <div>{loadingState}</div>;

  return <div data-testid="flipper-disabled-div">{loadingState}</div>;
};`;

        transformCode({
          code,
          options: ["flipper_name"],
          onTransformed: (result) => {
            expect(result).toEqual(
              `
const Component = () => {
  const loadingState = "Loading...";

  return <div>{loadingState}</div>;
};`
            );
          },
        });
      });
    });

    describe("when flipper variable to remove is part of if statement but doesn't have an early return", () => {
      it("unwraps the if statement", () => {
        const code = `
import { useFlippers } from "@shared/hooks";

const Component = () => {
  const [isFlipperEnabled] = useFlippers("flipper_name");
  const loadingState = "Loading...";

  if (isFlipperEnabled) {
    console.log("flipper is enabled");
  }

  return (
    <div data-testid="flipper-disabled-div">
      {loadingState}
    </div>
  );
};`;

        transformCode({
          code,
          options: ["flipper_name"],
          onTransformed: (result) => {
            expect(result).toEqual(
              `
const Component = () => {
  const loadingState = "Loading...";

  console.log("flipper is enabled");

  return (
    <div data-testid="flipper-disabled-div">
      {loadingState}
    </div>
  );
};`
            );
          },
        });
      });
    });
  });
});
