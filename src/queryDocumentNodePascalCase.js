import { visit, types } from "recast";
import { parse } from "graphql";

const b = types.builders;

const transformedNames = {};

const isQueryOrMutation = (parsedQuery) => {
  return (
    parsedQuery.definitions[0].operation === "query" ||
    parsedQuery.definitions[0].operation === "mutation"
  );
};

const transform = (ast, callback) => {
  visit(ast, {
    visitVariableDeclarator(path) {
      if (path?.node?.init?.tag?.name === "gql") {
        const parsedQuery = parse(path.node.init.quasi.quasis[0].value.raw);

        if (isQueryOrMutation(parsedQuery)) {
          const gqlOperationName = parsedQuery.definitions[0].name.value;
          const exportName = path.node.id.name;

          if (transformedNames.hasOwnProperty(exportName)) {
            throw new Error(
              `Duplicate exportName: ${exportName} found for operation name: ${gqlOperationName}.`
            );
          }

          transformedNames[exportName] = gqlOperationName;
          path.node.id.name = gqlOperationName;
        }
      }

      this.traverse(path);
    },
    visitIdentifier(path) {
      if (transformedNames[path.node.name]) {
        path.node.name = transformedNames[path.node.name];
      }

      this.traverse(path);
    },
  });

  callback(ast, transformedNames);
};

export { transform };
