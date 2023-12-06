import { expect, it, describe } from "vitest";

import { transform } from "./hookRipper";
import { transformCode } from "../../../testSetup/transformCode";

describe("hookRipper", () => {
  describe("BlockStatement", () => {
    describe("when hook variable to remove is part of if statement and has an early return", () => {
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

    describe("when hook variable to remove is part of if statelolment and has an early inline return", () => {
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

    describe("when hook variable to remove is part of if statement but doesn't have an early return", () => {
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

    describe("when hook variable to remove is part of an inline if statement as a single UnaryExpression", () => {
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

    describe("when hook variable to remove is part of if statement with a block as a single UnaryExpression", () => {
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

    describe("when hook variable to remove is part of if statement as an || UnaryExpression on the right side", () => {
      it("removes the hook variable unary condition", async () => {
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

    describe("when hook variable to remove is part of if statement as an || UnaryExpression on the left side", () => {
      it("removes the hook unary condition", async () => {
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

    describe("when hook variable to remove is part of if statement as a && UnaryExpression on the right side", () => {
      it("Removes the entire condition and block", async () => {
        const code = `
          const isFeatureEnabled = useSomeFeatureIsEnabled();

          const handleOnAddCompleted = () => {
            if (someOtherCondition && !isFeatureEnabled) {
              console.log("do something when feature is not enabled");
            } else if (!someOtherCondition) {
              console.log("do something when feature is enabled");
            }

            if (isFeatureEnabled && !fooBarCondition) {
              console.log("bla");
            }
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["useSomeFeatureIsEnabled"],
        });

        await expect(result).assertWithPrettier(`
          const handleOnAddCompleted = () => {
            if (!someOtherCondition) {
              console.log("do something when feature is enabled");
            }

            if (!fooBarCondition) {
              console.log("bla");
            }
          };
        `);
      });
    });

    describe("when hook variable to remove is part of if statement as a && on the right side", () => {
      it("Removes the feature checks", async () => {
        const code = `
          const isFeatureEnabled = useSomeFeatureIsEnabled();

          const handleOnAddCompleted = () => {
            if (someOtherCondition && isFeatureEnabled) {
              console.log("do something when feature is not enabled");
            } else if (!someOtherCondition) {
              console.log("do something when feature is enabled");
            }

            if (isFeatureEnabled && !fooBarCondition) {
              console.log("bla");
            }
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["useSomeFeatureIsEnabled"],
        });

        await expect(result).assertWithPrettier(`
          const handleOnAddCompleted = () => {
            if (someOtherCondition) {
              console.log("do something when feature is not enabled");
            } else if (!someOtherCondition) {
              console.log("do something when feature is enabled");
            }

            if (!fooBarCondition) {
              console.log("bla");
            }
          };
        `);
      });
    });
  });

  describe("CallExpression", () => {
    describe("when the hook to remove is the only one", () => {
      it("removes the usehooks call entirely", async () => {
        const code = `const isFeatureEnabled = useSomeFeatureIsEnabled();`;

        const result = await transformCode({
          code,
          transform,
          options: ["useSomeFeatureIsEnabled"],
        });

        await expect(result).assertWithPrettier("");
      });
    });

    describe("when the hook variable to remove is passed into a CallExpression", () => {
      it("replaces the parameter with the equivalent boolean value (true)", async () => {
        const code = `
          const isFeatureEnabled = useSomeFeatureIsEnabled();
          someFunctionCall(isFeatureEnabled);
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["useSomeFeatureIsEnabled"],
        });

        await expect(result).assertWithPrettier("someFunctionCall(true);");
      });

      it("replaces the parameter with the equivalent boolean value (false)", async () => {
        const code = `
          const isFeatureEnabled = useSomeFeatureIsEnabled();
          someFunctionCall(!isFeatureEnabled);
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["useSomeFeatureIsEnabled"],
        });

        await expect(result).assertWithPrettier("someFunctionCall(false);");
      });
    });
  });

  describe("ConditionalExpression", () => {
    describe("when hook is part of a ternary statement", () => {
      it("removes the hook check", async () => {
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

    describe("when hook is part of a ternary statement as a UnaryExpression", () => {
      it("removes the hook check", async () => {
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
    describe("when the hook to remove is NOT in usehooks", () => {
      it("does nothing", async () => {
        const code = `
          import { useSomeFeatureIsEnabled } from "@shared/hooks/useSomeFeatureIsEnabled";
          const isFeatureEnabled = useSomeFeatureIsEnabled();
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["some_hook_that_doesn't exist"],
        });

        await expect(result).assertWithPrettier(code);
      });
    });
  });

  describe("JSXAttribute", () => {
    describe("when the attribute is the hook variable UnaryExpression", () => {
      it("removes the JSXAttribute", async () => {
        const code = `
          const isFeatureEnabled = useSomeFeatureIsEnabled();

          return (
            <AlertBar fixedButton={!isFeatureEnabled}>
              Some text
            </AlertBar>
          );
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["useSomeFeatureIsEnabled"],
        });

        await expect(result).assertWithPrettier(`
          return <AlertBar>Some text</AlertBar>;
        `);
      });
    });

    describe("when the attribute is the hook variable only", () => {
      it("removes the JSXExpressionContainer but keeps the prop enabled", async () => {
        const code = `
          const isFeatureEnabled = useSomeFeatureIsEnabled();

          return (
            <AlertBar fixedButton={isFeatureEnabled}>
              Some text
            </AlertBar>
          );
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["useSomeFeatureIsEnabled"],
        });

        await expect(result).assertWithPrettier(`
          return <AlertBar fixedButton>Some text</AlertBar>;
        `);
      });
    });
  });

  describe("JSXExpressionContainer", () => {
    describe("when the expression contains a simple unary hook expression", () => {
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

    describe("when the expression contains a simple hook expression", () => {
      it("removes the hook conditional", async () => {
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
    describe("when a LogicalExpression containing a hook check is rendered inside a component", () => {
      it("removes the hook condition and leaves the component to render", async () => {
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

    describe("when a LogicalExpression containing a Unary hook check is rendered inside a component", () => {
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

    describe("when a LogicalExpression containing a hook check is rendered inside a fragment", () => {
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

    describe("when a LogicalExpression containing a Unary hook check is rendered inside a fragment", () => {
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

    describe("when a LogicalExpression containing a hook check on the right side", () => {
      it("removes the hook check", async () => {
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

    describe("when LogicalExpression as a UnaryExprssion is inside an ArrayExpression", () => {
      it("removes the LogicalExpression", async () => {
        const code = `
          const isFeatureEnabled = useSomeFeatureIsEnabled();

          const someStyles = [
            !isFeatureEnabled && styles.box,
            isFeatureEnabled && styles.foo,
            styles.bar,
          ];
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["useSomeFeatureIsEnabled"],
        });

        await expect(result).assertWithPrettier(`const someStyles = [styles.foo, styles.bar];`);
      });
    });

    describe("when LogicalExpression contains a nested LogicalExpression with the left side being a hook variable UnaryExpression", () => {
      it("does something", async () => {
        const code = `
          const isFeatureEnabled = useSomeFeatureIsEnabled();

          const isSomeProperty =
            (platformEnabled && featureType === "bla") ||
            (!isFeatureEnabled && platformEnabled);
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["useSomeFeatureIsEnabled"],
        });

        await expect(result).assertWithPrettier(`
          const isSomeProperty =
            (platformEnabled && featureType === "bla");
        `);
      });
    });
  });

  describe("ObjectProperty", () => {
    describe("whenever hookVariable as a UnaryExpression is used for a query skip", () => {
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

    describe("whenever hookVariable is used for a query skip", () => {
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
