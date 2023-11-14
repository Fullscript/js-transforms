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
          const [isFlipperEnabled] = useFlippers("flipper_name");`;

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

  describe("when the flipper to remove is NOT in useFlippers", () => {
    it("does nothing", () => {
      const code = `
import { useFlippers } from "@shared/utils";
const [isFlipperEnabled, isAnotherFlipperEnabled] = useFlippers("flipper_name", "another_flipper_name")
`;

      transformCode({
        code,
        options: ["some_flipper_that_doesn't exist"],
        onTransformed: (result) => {
          expect(result).toEqual(code);
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

    describe("when flipper variable to remove is part of an inline if statement as a single UnaryExpression", () => {
      it("removes the if statement", () => {
        const code = `
import { useFlippers } from "@shared/hooks";

const Component = () => {
  const [isFlipperEnabled] = useFlippers("flipper_name");
  const loadingState = "Loading...";

  if (!isFlipperEnabled) return null;

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

    describe("when flipper variable to remove is part of if statement with a block as a single UnaryExpression", () => {
      it("removes the if statement", () => {
        const code = `
import { useFlippers } from "@shared/hooks";

const Component = () => {
  const [isFlipperEnabled] = useFlippers("flipper_name");
  const loadingState = "Loading...";

  if (!isFlipperEnabled) {
    return null
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

    describe("when flipper variable to remove is part of if statement as an || UnaryExpression on the right side", () => {
      it("removes the flipper unary condition", () => {
        const code = `
import { useFlippers } from "@shared/hooks";

const Component = () => {
  const [isFlipperEnabled] = useFlippers("flipper_name");

  const isAdminImpersonatingOnProd = isAdminImpersonating && isProduction();
  if (isAdminImpersonatingOnProd || !isFlipperEnabled) return null;

  return (
    <>
      <ComponentOne />
      <ComponentTwo/>
    </>
  );
};`;

        transformCode({
          code,
          options: ["flipper_name"],
          onTransformed: (result) => {
            expect(result).toEqual(
              `
const Component = () => {
  const isAdminImpersonatingOnProd = isAdminImpersonating && isProduction();
  if (isAdminImpersonatingOnProd) return null;

  return (
    <>
      <ComponentOne />
      <ComponentTwo/>
    </>
  );
};`
            );
          },
        });
      });
    });

    describe("when flipper variable to remove is part of if statement as an || UnaryExpression on the left side", () => {
      it("removes the flipper unary condition", () => {
        const code = `
import { useFlippers } from "@shared/hooks";

const Component = () => {
  const [isFlipperEnabled] = useFlippers("flipper_name");

  const isAdminImpersonatingOnProd = isAdminImpersonating && isProduction();
  if (!isFlipperEnabled || isAdminImpersonatingOnProd) return null;

  return (
    <>
      <ComponentOne />
      <ComponentTwo/>
    </>
  );
};`;

        transformCode({
          code,
          options: ["flipper_name"],
          onTransformed: (result) => {
            expect(result).toEqual(
              `
const Component = () => {
  const isAdminImpersonatingOnProd = isAdminImpersonating && isProduction();
  if (isAdminImpersonatingOnProd) return null;

  return (
    <>
      <ComponentOne />
      <ComponentTwo/>
    </>
  );
};`
            );
          },
        });
      });
    });
  });

  describe("JSXExpressionContainer", () => {
    describe("when the expression contains a simple unary flipper expression", () => {
      it("removes the entire JSXExpressionContainer", () => {
        const code = `
const Component = () => {
  const [isFlipperEnabled] = useFlippers("flipper_name");

  return <Accordion
    css={!isFlipperEnabled && styles.accordion}
    coreTriggerContent={
      <Typography type="body" isSecondaryWeight>
        {patientTermCapitalizedPlural}
      </Typography>
    }
  />;
};`;

        transformCode({
          code,
          options: ["flipper_name"],
          onTransformed: (result) => {
            expect(result).toEqual(`
const Component = () => {
  return (
    <Accordion
      coreTriggerContent={
        <Typography type="body" isSecondaryWeight>
          {patientTermCapitalizedPlural}
        </Typography>
      } />
  );
};`);
          },
        });
      });
    });

    describe("when the expression contains a simple flipper expression", () => {
      it("removes the flipper conditional", () => {
        const code = `
const Component = () => {
  const [isFlipperEnabled] = useFlippers("flipper_name");

  return <Accordion
    css={isFlipperEnabled && styles.accordion}
    coreTriggerContent={
      <Typography type="body" isSecondaryWeight>
        {patientTermCapitalizedPlural}
      </Typography>
    }
  />;
};`;

        transformCode({
          code,
          options: ["flipper_name"],
          onTransformed: (result) => {
            expect(result).toEqual(`
const Component = () => {
  return (
    <Accordion
      css={styles.accordion}
      coreTriggerContent={
        <Typography type="body" isSecondaryWeight>
          {patientTermCapitalizedPlural}
        </Typography>
      }
    />
  );
};`);
          },
        });
      });
    });
  });

  describe("JSXAttribute", () => {
    describe("when flippers attribute contains only the flipper to remove", () => {
      it("removes the entire FlippersProvider", () => {
        const code = `
import { FlippersProvider } from "@shared/context";

<FlippersProvider flippers={["flipper_name"]}>
  <div />
</FlippersProvider>`;

        transformCode({
          code,
          options: ["flipper_name"],
          onTransformed: (result) => {
            expect(result.trim()).toEqual(`<div />`);
          },
        });
      });
    });

    describe("when flippers attribute contains more than just the flipper to remove", () => {
      it("removes just the specified flipper", () => {
        const code = `
import { FlippersProvider } from "@shared/context";

<FlippersProvider flippers={["flipper_name", "foo_bar_flipper"]}>
  <div />
</FlippersProvider>`;

        transformCode({
          code,
          options: ["flipper_name"],
          onTransformed: (result) => {
            expect(result).toEqual(`
import { FlippersProvider } from "@shared/context";

<FlippersProvider flippers={["foo_bar_flipper"]}>
  <div />
</FlippersProvider>`);
          },
        });
      });
    });

    describe("when FlippersProvider contains more than one child", () => {
      it("removes just the specified flipper", () => {
        const code = `
import { FlippersProvider } from "@shared/context";

<FlippersProvider flippers={["flipper_name"]}>
  <div />
  <div />
</FlippersProvider>`;

        transformCode({
          code,
          options: ["flipper_name"],
          onTransformed: (result) => {
            expect(result.trim()).toEqual(`<><div /><div /></>`);
          },
        });
      });
    });

    describe("when flippers attribute is passed a variable", () => {
      it("does nothing", () => {
        const code = `
import { FlippersProvider } from "@shared/context";

<FlippersProvider flippers={flippers}>
  <div />
</FlippersProvider>`;

        transformCode({
          code,
          options: ["flipper_name"],
          onTransformed: (result) => {
            expect(result).toEqual(code);
          },
        });
      });
    });

    describe("when multiple FlippersProvider exist", () => {
      it("cleans up both of them", () => {
        const code = `
import { FlippersProvider } from "@shared/context";

const ComponentOne = () => {
  return <FlippersProvider flippers={["flipper_name"]}>
    <div />
  </FlippersProvider>;
}

const ComponentTwo = () => {
  return <FlippersProvider flippers={["flipper_name"]}>
    <div />
  </FlippersProvider>
}`;

        transformCode({
          code,
          options: ["flipper_name"],
          onTransformed: (result) => {
            expect(result).toEqual(`
const ComponentOne = () => {
  return <div />;
}

const ComponentTwo = () => {
  return <div />;
}`);
          },
        });
      });
    });
  });

  describe("TSUnionType", () => {
    describe("when the union contains the flipper to remove", () => {
      it("removes that flipper from the union", () => {
        const code = `
export type BaseFlipper =
  | "flipper_name"
  | "foo_flipper"
  | "bar_flipper";`;

        transformCode({
          code,
          options: ["flipper_name"],
          onTransformed: (result) => {
            expect(result).toEqual(`
export type BaseFlipper =
  "foo_flipper" | "bar_flipper";`);
          },
        });
      });
    });
  });
});
