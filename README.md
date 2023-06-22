## Get started

## Step 1

Clone your repo locally:

```
git clone git@github.com:Fullscript/js-transforms.git
```

### Step 3

Go into the folder

```
cd js-transforms
```

### Step 3

Install your dependencies

```
yarn install
```


## How to use

### Color transforms

```
yarn transform colorsToTheme '../hw-admin/app/javascript/**/*.styles.ts*' COLOR.TO.REPLACE THEME.TOKEN.REPLACEMENT
```

Example of an actual command:

`yarn transform colorsToTheme '../hw-admin/app/javascript/**/*.styles.ts*' colors.green.base theme.success.textBase`
