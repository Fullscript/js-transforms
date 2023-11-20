import { beforeEach, expect } from "vitest";
import prettier from "prettier";

beforeEach(() => {
  expect.assertions(1);
});

expect.extend({
  async assertWithPrettier(received, expected) {
    const formattedReceived = await prettier.format(received, { parser: "typescript" });
    const formattedExpected = await prettier.format(expected, { parser: "typescript" });

    const pass = formattedReceived === formattedExpected;

    const message = pass
      ? () =>
          this.utils.matcherHint("assertWithPrettier", undefined, undefined, {
            isNot: this.isNot,
          }) +
          "\n\n" +
          `Expected: ${this.utils.printExpected(formattedExpected)}\n` +
          `Received: ${this.utils.printReceived(formattedReceived)}`
      : () => {
          const diffString = this.utils.diff(formattedExpected, formattedReceived);
          return (
            this.utils.matcherHint("assertWithPrettier", undefined, undefined, {
              isNot: this.isNot,
            }) +
            "\n\n" +
            `Expected: ${this.utils.printExpected(formattedExpected)}\n` +
            `Received: ${this.utils.printReceived(formattedReceived)}\n\n` +
            `Difference:\n\n${diffString}`
          );
        };

    return { pass, message };
  },
});
