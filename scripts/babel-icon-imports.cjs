const fs = require("node:fs");

// Metro in Expo 52 includes the entire icon barrel. Resolve named icons through
// the installed package's own export map, preserving aliases and fallback imports.
module.exports = function iconImports({ types: t }) {
  const entry = require
    .resolve("lucide-react-native/package.json")
    .replace(/package\.json$/, "dist/esm/lucide-react-native.js");
  const exports = fs.readFileSync(entry, "utf8");
  const paths = new Map();
  for (const match of exports.matchAll(
    /export \{([^}]+)\} from '\.\/(icons\/[^']+)';/g,
  )) {
    for (const alias of match[1].matchAll(/default as (\w+)/g)) {
      paths.set(alias[1], `lucide-react-native/dist/esm/${match[2]}`);
    }
  }
  return {
    name: "nutrition-icon-imports",
    visitor: {
      ImportDeclaration(path) {
        if (
          path.node.source.value !== "lucide-react-native" ||
          path.node.importKind === "type"
        )
          return;
        const remaining = [];
        const direct = [];
        for (const specifier of path.node.specifiers) {
          const target =
            t.isImportSpecifier(specifier) && specifier.importKind !== "type"
              ? paths.get(specifier.imported.name)
              : undefined;
          if (target)
            direct.push(
              t.importDeclaration(
                [t.importDefaultSpecifier(specifier.local)],
                t.stringLiteral(target),
              ),
            );
          else remaining.push(specifier);
        }
        if (!direct.length) return;
        if (remaining.length)
          direct.push(t.importDeclaration(remaining, path.node.source));
        path.replaceWithMultiple(direct);
      },
    },
  };
};
