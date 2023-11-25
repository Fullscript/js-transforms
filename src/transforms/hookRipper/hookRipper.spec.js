import { expect, it, describe } from "vitest";

import { transform } from "./hookRipper";
import { transformCode } from "../../../testSetup/transformCode";

describe("hookRipper", () => {
  describe("BlockStatement", () => {
    describe("when flipper variable to remove is part of if statement and has an early return", () => {
      it("unwraps the if statement and removes the default return/condition", async () => {
        const code = `
          import { useSomeFeatureIsEnabled } from "@shared/hooks/useSomeFeatureIsEnabled";

          const Component = () => {
            const isFeatureEnabled = useSomeFeatureIsEnabled();
            const loadingState = "Loading...";

            if (isFeatureEnabled) {
              return (
                <div data-testid="experiment-enabled-div">
                  {loadingState}
                </div>
              );
            }

            return <div data-testid="experiment-disabled-div">{loadingState}</div>;
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["useSomeFeatureIsEnabled"],
        });

        await expect(result).assertWithPrettier(
          `const Component = () => {
            const loadingState = "Loading...";

            return (
              <div data-testid="experiment-enabled-div">
                {loadingState}
              </div>
            );
          };
        `
        );
      });
    });

    describe("when flipper variable to remove is part of if statement and has an early inline return", () => {
      it("removes the if statement and removes the default return/condition", async () => {
        const code = `
        import { useSomeFeatureIsEnabled } from "@shared/hooks/useSomeFeatureIsEnabled";

          const Component = () => {
            const isFeatureEnabled = useSomeFeatureIsEnabled();
            const loadingState = "Loading...";

            if (isFeatureEnabled) return <div>{loadingState}</div>;

            return <div data-testid="experiment-disabled-div">{loadingState}</div>;
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["useSomeFeatureIsEnabled"],
        });

        await expect(result).assertWithPrettier(`
          const Component = () => {
            const loadingState = "Loading...";

            return <div>{loadingState}</div>;
          };
        `);
      });
    });

    describe("when flipper variable to remove is part of if statement but doesn't have an early return", () => {
      it("unwraps the if statement", async () => {
        const code = `
        import { useSomeFeatureIsEnabled } from "@shared/hooks/useSomeFeatureIsEnabled";

          const Component = () => {
            const isFeatureEnabled = useSomeFeatureIsEnabled();
            const loadingState = "Loading...";

            if (isFeatureEnabled) {
              console.log("experiment is enabled");
            }

            return (
              <div data-testid="experiment-disabled-div">
                {loadingState}
              </div>
            );
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["useSomeFeatureIsEnabled"],
        });

        await expect(result).assertWithPrettier(
          `const Component = () => {
            const loadingState = "Loading...";

            console.log("experiment is enabled");

            return (
              <div data-testid="experiment-disabled-div">
                {loadingState}
              </div>
            );
          };`
        );
      });
    });

    describe("when flipper variable to remove is part of an inline if statement as a single UnaryExpression", () => {
      it("removes the if statement", async () => {
        const code = `
          import { useSomeFeatureIsEnabled } from "@shared/hooks/useSomeFeatureIsEnabled";

          const Component = () => {
            const isFeatureEnabled = useSomeFeatureIsEnabled();
            const loadingState = "Loading...";

            if (!isFeatureEnabled) return null;

            return (
              <div data-testid="experiment-disabled-div">
                {loadingState}
              </div>
            );
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["useSomeFeatureIsEnabled"],
        });

        await expect(result).assertWithPrettier(
          `const Component = () => {
            const loadingState = "Loading...";

            return (
              <div data-testid="experiment-disabled-div">
                {loadingState}
              </div>
            );
          };
          `
        );
      });
    });

    describe("when flipper variable to remove is part of if statement with a block as a single UnaryExpression", () => {
      it("removes the if statement", async () => {
        const code = `
          import { useSomeFeatureIsEnabled } from "@shared/hooks/useSomeFeatureIsEnabled";

          const Component = () => {
            const isFeatureEnabled = useSomeFeatureIsEnabled();
            const loadingState = "Loading...";

            if (!isFeatureEnabled) {
              return null
            }

            return (
              <div data-testid="experiment-disabled-div">
                {loadingState}
              </div>
            );
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["useSomeFeatureIsEnabled"],
        });

        await expect(result).assertWithPrettier(
          `const Component = () => {
            const loadingState = "Loading...";

            return (
              <div data-testid="experiment-disabled-div">
                {loadingState}
              </div>
            );
          };`
        );
      });
    });

    describe("when flipper variable to remove is part of if statement as an || UnaryExpression on the right side", () => {
      it("removes the flipper unary condition", async () => {
        const code = `
          import { useSomeFeatureIsEnabled } from "@shared/hooks/useSomeFeatureIsEnabled";

          const Component = () => {
            const isFeatureEnabled = useSomeFeatureIsEnabled();

            const isAdminImpersonatingOnProd = isAdminImpersonating && isProduction();
            if (isAdminImpersonatingOnProd || !isFeatureEnabled) return null;

            return (
              <>
                <ComponentOne />
                <ComponentTwo/>
              </>
            );
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["useSomeFeatureIsEnabled"],
        });

        await expect(result).assertWithPrettier(
          `const Component = () => {
            const isAdminImpersonatingOnProd = isAdminImpersonating && isProduction();
            if (isAdminImpersonatingOnProd) return null;

            return (
              <>
                <ComponentOne />
                <ComponentTwo/>
              </>
            );
          };
          `
        );
      });
    });

    describe("when flipper variable to remove is part of if statement as an || UnaryExpression on the left side", () => {
      it("removes the flipper unary condition", async () => {
        const code = `
          import { useSomeFeatureIsEnabled } from "@shared/hooks/useSomeFeatureIsEnabled";

          const Component = () => {
            const isFeatureEnabled = useSomeFeatureIsEnabled();

            const isAdminImpersonatingOnProd = isAdminImpersonating && isProduction();
            if (!isFeatureEnabled || isAdminImpersonatingOnProd) return null;

            return (
              <>
                <ComponentOne />
                <ComponentTwo/>
              </>
            );
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["useSomeFeatureIsEnabled"],
        });

        await expect(result).assertWithPrettier(`
          const Component = () => {
            const isAdminImpersonatingOnProd = isAdminImpersonating && isProduction();
            if (isAdminImpersonatingOnProd) return null;
          
            return (
              <>
                <ComponentOne />
                <ComponentTwo/>
              </>
            );
          };
        `);
      });
    });
  });

  describe("CallExpression", () => {
    describe("when the flipper to remove is the only one in useFlippers", () => {
      it("removes the useFlippers call entirely", async () => {
        expect.assertions(1);
        const code = `const isFeatureEnabled = useSomeFeatureIsEnabled();`;

        const result = await transformCode({
          code,
          transform,
          options: ["useSomeFeatureIsEnabled"],
        });

        await expect(result).assertWithPrettier("");
      });
    });
  });

  describe("ConditionalExpression", () => {
    describe("when flipper is part of a ternary statement", () => {
      it("removes the flipper check", async () => {
        const code = `
          import { useSomeFeatureIsEnabled } from "@shared/hooks/useSomeFeatureIsEnabled";
          const isFeatureEnabled = useSomeFeatureIsEnabled();
          const productName = isFeatureEnabled ? "foo" : "bar";
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["useSomeFeatureIsEnabled"],
        });

        await expect(result).assertWithPrettier(`const productName = "foo";`);
      });
    });

    describe("when flipper is part of a ternary statement as a UnaryExpression", () => {
      it("removes the flipper check", async () => {
        const code = `
          import { useSomeFeatureIsEnabled } from "@shared/hooks/useSomeFeatureIsEnabled";
          const isFeatureEnabled = useSomeFeatureIsEnabled();
          const productName = !isFeatureEnabled ? "foo" : "bar";
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["useSomeFeatureIsEnabled"],
        });

        await expect(result).assertWithPrettier(`const productName = "bar";`);
      });
    });
  });

  describe("ImportDeclaration", () => {
    describe("when the flipper to remove is NOT in useFlippers", () => {
      it("does nothing", async () => {
        const code = `
          import { useSomeFeatureIsEnabled } from "@shared/hooks/useSomeFeatureIsEnabled";
          const isFeatureEnabled = useSomeFeatureIsEnabled();
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["some_flipper_that_doesn't exist"],
        });

        await expect(result).assertWithPrettier(code);
      });
    });
  });

  describe("JSXExpressionContainer", () => {
    describe("when the expression contains a simple unary flipper expression", () => {
      it("removes the entire JSXExpressionContainer", async () => {
        const code = `
          const Component = () => {
            const isFeatureEnabled = useSomeFeatureIsEnabled();

            return <Accordion
              css={!isFeatureEnabled && styles.accordion}
              coreTriggerContent={
                <Typography type="body" isSecondaryWeight>
                  {patientTermCapitalizedPlural}
                </Typography>
              }
            />;
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["useSomeFeatureIsEnabled"],
        });

        await expect(result).assertWithPrettier(`
          const Component = () => {
            return (
              <Accordion
                coreTriggerContent={
                  <Typography type="body" isSecondaryWeight>
                    {patientTermCapitalizedPlural}
                  </Typography>
                } 
              />
            );
          };
        `);
      });
    });

    describe("when the expression contains a simple flipper expression", () => {
      it("removes the flipper conditional", async () => {
        const code = `
          const Component = () => {
            const isFeatureEnabled = useSomeFeatureIsEnabled();

            return <Accordion
              css={isFeatureEnabled && styles.accordion}
              coreTriggerContent={
                <Typography type="body" isSecondaryWeight>
                  {patientTermCapitalizedPlural}
                </Typography>
              }
            />;
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["useSomeFeatureIsEnabled"],
        });

        await expect(result).assertWithPrettier(`
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
          };
        `);
      });
    });
  });

  describe("LogicalExpression", () => {
    describe("when a LogicalExpression containing a flipper check is rendered inside a component", () => {
      it("removes the flipper condition and leaves the component to render", async () => {
        const code = `
          const Component = () => {
            const isFeatureEnabled = useSomeFeatureIsEnabled();

            return (
              <div>
                {isFeatureEnabled && <PageFooter />}
              </div>
            );
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["useSomeFeatureIsEnabled"],
        });

        await expect(result).assertWithPrettier(`
          const Component = () => {
            return (
              <div>
                {<PageFooter />}
              </div>
            );
          };
        `);
      });
    });

    describe("when a LogicalExpression containing a Unary flipper check is rendered inside a component", () => {
      it("removes the entire JSXExpressionContainer", async () => {
        const code = `
          const Component = () => {
            const isFeatureEnabled = useSomeFeatureIsEnabled();

            return <div>
              {!isFeatureEnabled && <PageFooter />}
            </div>;
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["useSomeFeatureIsEnabled"],
        });

        await expect(result).assertWithPrettier(`
          const Component = () => {
            return <div></div>;
          };
        `);
      });
    });

    describe("when a LogicalExpression containing a flipper check is rendered inside a fragment", () => {
      it("removes the entire JSXExpressionContainer", async () => {
        const code = `
          const Component = () => {
            const isFeatureEnabled = useSomeFeatureIsEnabled();

            return <>{isFeatureEnabled && <PageFooter />}</>;
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["useSomeFeatureIsEnabled"],
        });

        await expect(result).assertWithPrettier(`
          const Component = () => {
            return <>{<PageFooter />}</>;
          };
        `);
      });
    });

    describe("when a LogicalExpression containing a Unary flipper check is rendered inside a fragment", () => {
      it("removes the entire JSXExpressionContainer", async () => {
        const code = `
          const Component = () => {
            const isFeatureEnabled = useSomeFeatureIsEnabled();

            return <>
              {!isFeatureEnabled && <PageFooter />}
            </>;
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["useSomeFeatureIsEnabled"],
        });

        await expect(result).assertWithPrettier(`
          const Component = () => {
            return <></>;
          };
        `);
      });
    });

    describe("when a LogicalExpression containing a flipper check on the right side", () => {
      it("removes the flipper check", async () => {
        const code = `
          import { useSomeFeatureIsEnabled } from "@shared/hooks";
          const isFeatureEnabled = useSomeFeatureIsEnabled();
          const productName = isSomeOtherFlag && isFeatureEnabled ? "foo" : "bar";
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["useSomeFeatureIsEnabled"],
        });

        await expect(result).assertWithPrettier(
          `const productName = isSomeOtherFlag ? "foo" : "bar";`
        );
      });
    });
  });

  describe("ObjectProperty", () => {
    describe("whenever flipperVariable as a UnaryExpression is used for a query skip", () => {
      it("removes the skip property", async () => {
        const code = `
          const isFeatureEnabled = useSomeFeatureIsEnabled();
          const { data } = useSomeQuery({
            skip: !isFeatureEnabled,
          });
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["useSomeFeatureIsEnabled"],
        });

        await expect(result).assertWithPrettier(`const { data } = useSomeQuery({});`);
      });
    });

    describe("whenever flipperVariable is used for a query skip", () => {
      it("removes the skip property", async () => {
        const code = `
          const isFeatureEnabled = useSomeFeatureIsEnabled();
          const { data } = useSomeQuery({
            skip: isFeatureEnabled,
          });
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["useSomeFeatureIsEnabled"],
        });

        await expect(result).assertWithPrettier("");
      });
    });
  });
});
