import { highlight } from "cli-highlight";

const dryRunOutput = (code, filePath) => {
  console.log(
    "##########################################################################"
  );

  console.log("#");
  console.log("# Output for:");
  console.log(`# ${filePath}`);
  console.log("#");

  console.log(
    "##########################################################################\n"
  );

  console.log(`${highlight(code)}\n\n`);
};

export { dryRunOutput };
