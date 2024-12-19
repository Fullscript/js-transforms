import { expect, it, describe, beforeEach, vi } from "vitest";

import { transform } from "./aviaryMigrator";
import { transformCode } from "../../../testSetup/transformCode";

let config;
vi.mock("node:fs", () => ({
  readFileSync: () => JSON.stringify(config),
}));

describe("aviaryMigrator", () => {
  beforeEach(() => {
    config = {};
  });

  describe("when componentName is not specified in the passed config", () => {
    it("throws an error requiring componentName", async () => {
      config = {};
      const configPath = "./Config.json";

      const code = `
        import { OldComponent } from "@aviary";
      `;

      expect(async () => {
        await transformCode({
          code,
          transform,
          options: [configPath],
        });
      }).rejects.toThrow(
        `componentName is required in ${configPath}, please specify the component you want to migrate.`
      );
    });
  });

  describe("when importSource is not specified in the passed config", () => {
    it("throws an error requiring importSource", async () => {
      config = { componentName: "OldComponent" };
      const configPath = "./Config.json";

      const code = `
        import { OldComponent } from "@aviary";
      `;

      expect(async () => {
        await transformCode({
          code,
          transform,
          options: [configPath],
        });
      }).rejects.toThrow(
        `importSource is required in ${configPath}, please specify the existing import path for ${config.componentName}.`
      );
    });
  });

  describe("when componentName and newComponentName are both specified", () => {
    describe("when the component to rename if self closing", () => {
      it("renames the component in place", async () => {
        config = {
          importSource: "@aviary",
          componentName: "OldComponent",
          newComponentName: "NewComponent",
        };

        const code = `
          import { OldComponent } from "@aviary";

          const Component = () => {
            return <OldComponent />;
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["./Config.json"],
        });

        await expect(result).assertWithPrettier(`
          import { NewComponent } from "@aviary";
          
          const Component = () => {
            return <NewComponent />;
          };
        `);
      });
    });

    describe("when the component to rename has open and closing tags", () => {
      it("renames the component in place", async () => {
        config = {
          importSource: "@aviary",
          componentName: "OldComponent",
          newComponentName: "NewComponent",
        };

        const code = `
          import { OldComponent } from "@aviary";

          const Component = () => {
            return <OldComponent>Some internal content</OldComponent>;
          };
        `;

        const result = await transformCode({
          code,
          transform,
          options: ["./Config.json"],
        });

        await expect(result).assertWithPrettier(`
          import { NewComponent } from "@aviary";
          
          const Component = () => {
            return <NewComponent>Some internal content</NewComponent>;
          };
        `);
      });
    });
  });

  describe("when newComponentName is not specified but newImportSource is", () => {
    it("updates the import path for the specified component", async () => {
      config = {
        importSource: "@aviary",
        newImportSource: "@fullscript/aviary-web",
        componentName: "Component",
      };

      const code = `
        import { Component } from "@aviary";

        const Component = () => {
          return <Component />;
        };
      `;

      const result = await transformCode({
        code,
        transform,
        options: ["./Config.json"],
      });

      await expect(result).assertWithPrettier(`
        import { Component } from "@fullscript/aviary-web";
        
        const Component = () => {
          return <Component />;
        };
      `);
    });
  });

  describe("when componentName, newComponentName, importSource and newImportSource are specified", () => {
    it("updates the import path and the component name", async () => {
      config = {
        importSource: "@aviary",
        newImportSource: "@fullscript/aviary-web",
        componentName: "Component",
        newComponentName: "NewComponent",
      };

      const code = `
        import { Component } from "@aviary";

        const Component = () => {
          return <Component />;
        };
      `;

      const result = await transformCode({
        code,
        transform,
        options: ["./Config.json"],
      });

      await expect(result).assertWithPrettier(`
        import { NewComponent } from "@fullscript/aviary-web";
        
        const Component = () => {
          return <NewComponent />;
        };
      `);
    });
  });

  describe("when propsToRename is specified", () => {
    it("updates the props in propsToRename", async () => {
      config = {
        importSource: "@aviary",
        componentName: "Button",
        propsToRename: {
          isColor: "intention",
          dotPlacement: "alignment",
        },
      };

      const code = `
        import { Button } from "@aviary";

        const Component = () => {
          return <Button isColor="warning" dotPlacement="left" />;
        };
      `;

      const result = await transformCode({
        code,
        transform,
        options: ["./Config.json"],
      });

      await expect(result).assertWithPrettier(`
        import { Button } from "@aviary";
        
        const Component = () => {
          return <Button intention="warning" alignment="left" />;
        };
      `);
    });
  });

  describe("when propsToAdd is specified", () => {
    it("adds props in propsToAdd and their values", async () => {
      config = {
        importSource: "@aviary",
        componentName: "Button",
        propsToAdd: {
          intention: "warning",
        },
      };

      const code = `
        import { Button } from "@aviary";

        const Component = () => {
          return <Button dotPlacement="left" />;
        };
      `;

      const result = await transformCode({
        code,
        transform,
        options: ["./Config.json"],
      });

      await expect(result).assertWithPrettier(`
        import { Button } from "@aviary";
        
        const Component = () => {
          return <Button dotPlacement="left" intention={"warning"} />;
        };
      `);
    });
  });

  describe("when propsToRemove is specified", () => {
    it("removes props from propsToRemove and their values", async () => {
      config = {
        importSource: "@aviary",
        newImportSource: "@fullscript/aviary-web",
        componentName: "Status",
        propsToRemove: ["dotPlacement"],
      };

      const code = `
        import { Status } from "@aviary";

        const Component = () => {
          return <Status dotPlacement="left" />;
        };
      `;

      const result = await transformCode({
        code,
        transform,
        options: ["./Config.json"],
      });

      await expect(result).assertWithPrettier(`
        import { Status } from "@fullscript/aviary-web";
        
        const Component = () => {
          return <Status />;
        };
      `);
    });
  });

  describe("when no matching importSource is found", () => {
    it("does not modify any components", async () => {
      config = {
        importSource: "@fullscript/aviary-web",
        componentName: "Button",
        propsToRemove: ["dotPlacement"],
        propsToRename: {
          oldProp: "newProp",
        },
        propsToAdd: {
          intention: "warning",
        },
      };

      const code = `
        import { Button } from "@aviary";

        const Component = () => {
          return <Button dotPlacement="left" oldProp />;
        };
      `;

      const result = await transformCode({
        code,
        transform,
        options: ["./Config.json"],
      });

      await expect(result).assertWithPrettier(`
        import { Button } from "@aviary";
        
        const Component = () => {
          return <Button dotPlacement="left" oldProp />;
        };
      `);
    });
  });

  describe("when an import for the new import source already exists", () => {
    it("adds the componentName to the already existing import", async () => {
      config = {
        importSource: "@aviary",
        newImportSource: "@fullscript/aviary-web",
        componentName: "Message",
      };

      const code = `
        import { Button, Message } from "@aviary";
        import { Status } from "@fullscript/aviary-web";

        const Component = () => {
          return (
            <>
              <Message />
              <Button />
              <Status />
            </>
          );
        };
      `;

      const result = await transformCode({
        code,
        transform,
        options: ["./Config.json"],
      });

      await expect(result).assertWithPrettier(`
        import { Button } from "@aviary";
        import { Status, Message } from "@fullscript/aviary-web";

        const Component = () => {
          return (
            <>
              <Message />
              <Button />
              <Status />
            </>
          );
        };
      `);
    });
  });

  describe("when an import for the new import source already exists", () => {
    it("adds the componentName to the already existing import", async () => {
      config = {
        importSource: "@aviary",
        newImportSource: "@fullscript/aviary-web",
        componentName: "Button",
      };

      const code = `
        import { Button } from "@aviary";
        import { Status } from "@fullscript/aviary-web";

        const Component = () => {
          return (
            <>
              <Button />
              <Status />
            </>
          );
        };
      `;

      const result = await transformCode({
        code,
        transform,
        options: ["./Config.json"],
      });

      await expect(result).assertWithPrettier(`
        import { Status, Button } from "@fullscript/aviary-web";

        const Component = () => {
          return (
            <>
              <Button />
              <Status />
            </>
          );
        };
      `);
    });
  });
});
