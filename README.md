# js-transforms

Welcome to Fullscript's repository for JS transforms. This repo contains transforms for large codebase refactors.
It internally uses [babel](https://babeljs.io/docs/babel-parser) for parsing code and [recast](https://github.com/benjamn/recast) for transforming the resulting Abstract Syntax Tree (AST).

**NOTE: This code is provided as is, we don't guarantee that we will support any feature requests or bug fixes.**

## Installation

### Step 1

Clone your repo locally:

```sh
git clone git@github.com:Fullscript/js-transforms.git
```

### Step 2

Go into the folder

```sh
cd js-transforms
```

### Step 3

Install the dependencies

```sh
yarn install
```

## Usage

You can find all available CLI options by running the followin:

```sh
yarn transform --help
```

Or if you prefer to read the available options here, jump to the [CLI](#cli) section.

### Available Transforms

#### colorsToTheme

Used for converting colors to Emotion theme/tokens.

```sh
yarn transform colorsToTheme '../hw-admin/app/javascript/**/*.styles.ts*' --options COLOR.TO.REPLACE THEME.TOKEN.REPLACEMENT
```

Example:

```sh
yarn transform colorsToTheme '../hw-admin/app/javascript/**/*.styles.ts*' --options colors.green.base theme.success.textBase
```

#### createMockToObjectParams

Was used for converting

```ts
createMock("Patient", { firstName: "John" });

// TO

createMock({ typeName: "Patient", overrides: { firstName: "John" } });
```

Usage:

```zsh
yarn transform createMockToObjectParams '../hw-admin/app/javascript/**/*.spec.ts*'
```

#### createFragmentToCreateMock

For converting `create*Fragment` calls to equivalent `createMock` calls. Requires you to specify the `create*Fragment` to convert along with its equivalent GQL type.

Usage:

```sh
yarn transform createFragmentToCreateMock '../hw-admin/app/javascript/**/*.spec.ts*' --options <create*Fragment> <GQLType>
```

Example:

```sh
yarn transform createFragmentToCreateMock '../hw-admin/app/javascript/**/*.spec.ts*' --options createPatientFragment Patient
```

### CLI

The CLI usage is as follows:

```sh
yarn transform <transformName> <filesToTransformAsGlob> --dry-run --options
```

- **transformName**: Any of the transforms specified in [Available Transforms](#available-transforms)
- **filesToTransformAsGlob**: A glob pattern **in quotations** identifying files to run the transform against. Ex: '../projectDir/src/\*\*/\*.tsx'
- **`--dry-run` or `-d` for short**: Output transform result to console rather than writing changes to files. Useful during development.
- **`--options`**: An array of optional parameters to pass into the specified transform. Some transforms require additional user input, this is how you specify that. See [colorsToTheme](#colorstotheme) for an example.
