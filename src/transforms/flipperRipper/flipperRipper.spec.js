import { expect, it, describe } from "vitest";

import { transform } from "./flipperRipper";
import { transformCode } from "../../../testSetup/transformCode";

describe("flipperRipper", () => {
  describe("BlockStatement", () => {
    describe("when flipper variable to remove is part of if statement and has an early return", () => {
      it("unwraps the if statement and removes the default return/condition", async () => {
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
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["flipper_name"],
        });

        expect(result).assertWithPrettier(
          `const Component = () => {
            const loadingState = "Loading...";

            return (
              <div data-testid="flipper-enabled-div">
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
          import { useFlippers } from "@shared/hooks";

          const Component = () => {
            const [isFlipperEnabled] = useFlippers("flipper_name");
            const loadingState = "Loading...";

            if (isFlipperEnabled) return <div>{loadingState}</div>;

            return <div data-testid="flipper-disabled-div">{loadingState}</div>;
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["flipper_name"],
        });

        expect(result).assertWithPrettier(`
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
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["flipper_name"],
        });

        expect(result).assertWithPrettier(
          `const Component = () => {
            const loadingState = "Loading...";

            console.log("flipper is enabled");

            return (
              <div data-testid="flipper-disabled-div">
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
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["flipper_name"],
        });

        expect(result).assertWithPrettier(
          `const Component = () => {
            const loadingState = "Loading...";

            return (
              <div data-testid="flipper-disabled-div">
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
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["flipper_name"],
        });

        expect(result).assertWithPrettier(
          `const Component = () => {
            const loadingState = "Loading...";

            return (
              <div data-testid="flipper-disabled-div">
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
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["flipper_name"],
        });

        expect(result).assertWithPrettier(
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
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["flipper_name"],
        });

        expect(result).assertWithPrettier(`
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
        const code = `const [isFlipperEnabled] = useFlippers("flipper_name");`;

        const result = await transformCode({
          code,
          transform,
          options: ["flipper_name"],
        });

        expect(result).assertWithPrettier("");
      });
    });

    describe("when the flipper to remove is NOT the only one in useFlippers", () => {
      it("removes flipper variable and argument from useFlippers", async () => {
        const code = `const [isFlipperEnabled, isAnotherFlipperEnabled] = useFlippers("flipper_name", "another_flipper_name")`;

        const result = await transformCode({
          code,
          transform,
          options: ["flipper_name"],
        });

        expect(result).assertWithPrettier(
          `const [isAnotherFlipperEnabled] = useFlippers("another_flipper_name")`
        );
      });
    });

    describe("when the flipper to remove is NOT in useFlippers", () => {
      it("does nothing", async () => {
        const code = `
          import { useFlippers } from "@shared/utils";
          const [isFlipperEnabled, isAnotherFlipperEnabled] = useFlippers("flipper_name", "another_flipper_name")
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["some_flipper_that_doesn't exist"],
        });

        expect(result).assertWithPrettier(code);
      });
    });
  });

  describe("ConditionalExpression", () => {
    describe("when flipper is part of a ternary statement", () => {
      it("removes the flipper check", async () => {
        const code = `
          import { useFlippers } from "@shared/utils";
          const [isFlipperEnabled] = useFlippers("flipper_name");
          const productName = isFlipperEnabled ? "foo" : "bar";
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["flipper_name"],
        });

        expect(result).assertWithPrettier(`const productName = "foo";`);
      });
    });

    describe("when flipper is part of a ternary statement as a UnaryExpression", () => {
      it("removes the flipper check", async () => {
        const code = `
          import { useFlippers } from "@shared/utils";
          const [isFlipperEnabled] = useFlippers("flipper_name");
          const productName = !isFlipperEnabled ? "foo" : "bar";
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["flipper_name"],
        });

        expect(result).assertWithPrettier(`const productName = "bar";`);
      });
    });
  });

  describe("ImportDeclaration", () => {
    describe("when the flipper to remove is NOT the only one in useFlippers", () => {
      it("removes flipper variable and argument from useFlippers", async () => {
        const code = `const [isFlipperEnabled, isAnotherFlipperEnabled] = useFlippers("flipper_name", "another_flipper_name")`;

        const result = await transformCode({
          code,
          transform,
          options: ["flipper_name"],
        });

        expect(result).assertWithPrettier(
          `const [isAnotherFlipperEnabled] = useFlippers("another_flipper_name")`
        );
      });
    });

    describe("when the flipper to remove is NOT in useFlippers", () => {
      it("does nothing", async () => {
        const code = `
          import { useFlippers } from "@shared/utils";
          const [isFlipperEnabled, isAnotherFlipperEnabled] = useFlippers("flipper_name", "another_flipper_name")
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["some_flipper_that_doesn't exist"],
        });

        expect(result).assertWithPrettier(code);
      });
    });
  });

  describe("JSXAttribute", () => {
    describe("when flippers attribute contains only the flipper to remove", () => {
      it("removes the entire FlippersProvider", async () => {
        const code = `
          import { FlippersProvider } from "@shared/context";

          <FlippersProvider flippers={["flipper_name"]}>
            <div />
          </FlippersProvider>
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["flipper_name"],
        });

        expect(result).assertWithPrettier(`<div />`);
      });
    });

    describe("when flippers attribute contains more than just the flipper to remove", () => {
      it("removes just the specified flipper", async () => {
        const code = `
          import { FlippersProvider } from "@shared/context";

          <FlippersProvider flippers={["flipper_name", "foo_bar_flipper"]}>
            <div />
          </FlippersProvider>
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["flipper_name"],
        });

        expect(result).assertWithPrettier(`
          import { FlippersProvider } from "@shared/context";

          <FlippersProvider flippers={["foo_bar_flipper"]}>
            <div />
          </FlippersProvider>
        `);
      });
    });

    describe("when FlippersProvider contains more than one child", () => {
      it("removes just the specified flipper", async () => {
        const code = `
          import { FlippersProvider } from "@shared/context";

          <FlippersProvider flippers={["flipper_name"]}>
            <div />
            <div />
          </FlippersProvider>
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["flipper_name"],
        });

        expect(result).assertWithPrettier(`<><div /><div /></>`);
      });
    });

    describe("when flippers attribute is passed a variable", () => {
      it("does nothing", async () => {
        const code = `
          import { FlippersProvider } from "@shared/context";

          <FlippersProvider flippers={flippers}>
            <div />
          </FlippersProvider>
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["flipper_name"],
        });

        expect(result).assertWithPrettier(code);
      });
    });

    describe("when multiple FlippersProvider exist", () => {
      it("cleans up both of them", async () => {
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
          }
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["flipper_name"],
        });

        expect(result).assertWithPrettier(`
          const ComponentOne = () => {
            return <div />;
          }
          
          const ComponentTwo = () => {
            return <div />;
          }
        `);
      });
    });
  });

  describe("JSXExpressionContainer", () => {
    describe("when the expression contains a simple unary flipper expression", () => {
      it("removes the entire JSXExpressionContainer", async () => {
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
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["flipper_name"],
        });

        expect(result).assertWithPrettier(`
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
            const [isFlipperEnabled] = useFlippers("flipper_name");

            return <Accordion
              css={isFlipperEnabled && styles.accordion}
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
          options: ["flipper_name"],
        });

        expect(result).assertWithPrettier(`
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
            const [isFlipperEnabled] = useFlippers("flipper_name");

            return (
              <div>
                {isFlipperEnabled && <PageFooter />}
              </div>
            );
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["flipper_name"],
        });

        expect(result).assertWithPrettier(`
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
            const [isFlipperEnabled] = useFlippers("flipper_name");

            return <div>
              {!isFlipperEnabled && <PageFooter />}
            </div>;
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["flipper_name"],
        });

        expect(result).assertWithPrettier(`
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
            const [isFlipperEnabled] = useFlippers("flipper_name");

            return <>{isFlipperEnabled && <PageFooter />}</>;
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["flipper_name"],
        });

        expect(result).assertWithPrettier(`
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
            const [isFlipperEnabled] = useFlippers("flipper_name");

            return <>
              {!isFlipperEnabled && <PageFooter />}
            </>;
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["flipper_name"],
        });

        expect(result).assertWithPrettier(`
          const Component = () => {
            return <></>;
          };
        `);
      });
    });

    describe("when a LogicalExpression containing a flipper check on the right side", () => {
      it("removes the flipper check", async () => {
        const code = `
          import { useFlippers } from "@shared/utils";
          const [isFlipperEnabled] = useFlippers("flipper_name");
          const productName = isSomeOtherFlag && isFlipperEnabled ? "foo" : "bar";
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["flipper_name"],
        });

        expect(result).assertWithPrettier(`const productName = isSomeOtherFlag ? "foo" : "bar";`);
      });
    });
  });

  describe("ObjectProperty", () => {
    describe("whenever flipperVariable as a UnaryExpression is used for a query skip", () => {
      it("removes the skip property", async () => {
        const code = `
          const [isFlipperEnabled] = useFlippers("flipper_name");
          const { data } = useSomeQuery({
            skip: !isFlipperEnabled,
          });
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["flipper_name"],
        });

        expect(result).assertWithPrettier(`const { data } = useSomeQuery({});`);
      });
    });

    describe("whenever flipperVariable is used for a query skip", () => {
      it("removes the skip property", async () => {
        const code = `
          const [isFlipperEnabled] = useFlippers("flipper_name");
          const { data } = useSomeQuery({
            skip: isFlipperEnabled,
          });
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["flipper_name"],
        });

        expect(result).assertWithPrettier("");
      });
    });

    describe("whenever flipperVariable is used as a route flipper check", () => {
      it("removes the flipper property", async () => {
        const code = `
          const routes = [{
            path: "/some/path",
            key: "path_key",
            element: <LazyPage />,
            flipper: "flipper_name",
          }];
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["flipper_name"],
        });

        expect(result).assertWithPrettier(`
          const routes = [{
            path: "/some/path",
            key: "path_key",
            element: <LazyPage />
          }];
        `);
      });
    });
  });

  describe("TSUnionType", () => {
    describe("when the union contains the flipper to remove", () => {
      it("removes that flipper from the union", async () => {
        const code = `
          export type BaseFlipper =
            | "flipper_name"
            | "foo_flipper"
            | "bar_flipper";
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["flipper_name"],
        });

        expect(result).assertWithPrettier(
          `export type BaseFlipper = "foo_flipper" | "bar_flipper";`
        );
      });
    });
  });
});
