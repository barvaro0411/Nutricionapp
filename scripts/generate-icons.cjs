const fs = require("node:fs");
const { Resvg } = require("@resvg/resvg-js");
const svg = fs.readFileSync("assets/icon.svg", "utf8");
for (const [file, size] of [["assets/icon.png",1024],["assets/adaptive-icon.png",1024],["assets/splash-icon.png",512],["assets/favicon.png",64],["public/icon.png",512],["public/icon-192.png",192],["public/icon-512.png",512]]) {
  fs.writeFileSync(file, new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng());
}
console.log("Iconos generados desde assets/icon.svg.");
