import { build } from "esbuild";
import { expect, it } from "vitest";

it("keeps the config UI off the static startup graph in a single-file bundle", async () => {
  const { metafile, outputFiles } = await build({
    entryPoints: ["src/index.ts"],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node22",
    external: ["@earendil-works/*"],
    write: false,
    metafile: true,
  });
  const reachable = new Set(["src/index.ts"]);
  for (const path of reachable) {
    for (const dependency of metafile.inputs[path]?.imports ?? []) {
      if (!dependency.external && dependency.kind !== "dynamic-import") {
        reachable.add(dependency.path);
      }
    }
  }

  expect([...reachable].filter((path) => /^src\/ui(?:\/|\.ts$)/.test(path))).toEqual([]);
  expect(metafile.inputs["src/index.ts"]?.imports).toContainEqual(
    expect.objectContaining({ path: "src/ui.ts", kind: "dynamic-import" }),
  );
  expect(metafile.inputs).toHaveProperty("package.json");
  expect(Object.keys(metafile.inputs).some((path) => path.startsWith("node_modules/chalk/"))).toBe(
    true,
  );
  expect(outputFiles).toHaveLength(1);
  for (const output of Object.values(metafile.outputs)) {
    for (const dependency of output.imports) {
      expect(dependency.external).toBe(true);
      expect(dependency.path).toMatch(/^(?:node:|@earendil-works\/)/);
    }
  }
});
