import fs from "fs";
import path from "path";

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (p.endsWith(".tsx")) files.push(p);
  }
  return files;
}

function ensureImport(content) {
  if (content.includes('import AppImage from "@/components/AppImage"')) return content;
  if (content.startsWith('"use client"')) {
    return content.replace(
      '"use client";\n\n',
      '"use client";\n\nimport AppImage from "@/components/AppImage";\n'
    );
  }
  return `import AppImage from "@/components/AppImage";\n${content}`;
}

function processFile(file) {
  let t = fs.readFileSync(file, "utf8");
  const before = t;

  // Logo with style object
  t = t.replace(
    /<img loading="lazy" src=\{LOGO_URL\} alt="([^"]+)" className="([^"]+)" style=\{\{ filter: "brightness\(0\) invert\(1\) opacity\(0\.85\)" \}\}\s*\/>/g,
    '<AppImage src={LOGO_URL} alt="$1" width={200} height={48} className="$2" style={{ filter: "brightness(0) invert(1) opacity(0.85)" }} />'
  );

  // Small logo without loading
  t = t.replace(
    /<img src=\{LOGO_URL\} alt="([^"]+)" className="([^"]+)"\s*\/>/g,
    '<AppImage src={LOGO_URL} alt="$1" width={24} height={24} className="$2" />'
  );

  // Absolute fill cover
  t = t.replace(
    /<img loading="(eager|lazy)" src=\{([^}]+)\} alt="([^"]+)" className="absolute inset-0 w-full h-full object-cover"\s*\/>/g,
    (_, load, src, alt) =>
      `<AppImage src={${src}} alt="${alt}" fill${load === "eager" ? " priority" : ""} className="object-cover" />`
  );

  t = t.replace(
    /<img loading="lazy" src="([^"]+)" alt="([^"]+)" className="absolute inset-0 w-full h-full object-cover"\s*\/>/g,
    '<AppImage src="$1" alt="$2" fill className="object-cover" />'
  );

  // Fixed height cover
  t = t.replace(
    /<img loading="lazy" src=\{([^}]+)\} alt="([^"]+)" className="w-full h-\[(\d+)px\] object-cover([^"]*)"\s*\/>/g,
    (_, src, alt, h, extra) =>
      `<div className="relative w-full h-[${h}px]${extra.includes("rounded") ? " rounded-sm overflow-hidden" : ""}"><AppImage src={${src}} alt="${alt}" fill className="object-cover${extra}" /></div>`
  );

  // h-full in grid/card (parent must be relative)
  t = t.replace(
    /<img loading="lazy" src=\{([^}]+)\} alt=\{([^}]+)\} className="w-full h-full object-cover([^"]*)"\s*\/>/g,
    '<AppImage src={$1} alt={$2} fill className="object-cover$3" />'
  );

  t = t.replace(
    /<img loading="lazy" src=\{([^}]+)\} alt="([^"]+)" className="w-full h-full object-cover([^"]*)"\s*\/>/g,
    '<AppImage src={$1} alt="$2" fill className="object-cover$3" />'
  );

  t = t.replace(
    /<img src=\{([^}]+)\} alt=\{([^}]+)\} className="w-full h-full object-cover([^"]*)"\s*\/>/g,
    '<AppImage src={$1} alt={$2} fill className="object-cover$3" />'
  );

  t = t.replace(
    /<img src="([^"]+)" alt="([^"]+)" className="w-full h-full object-cover"\s*\/>/g,
    '<AppImage src="$1" alt="$2" fill className="object-cover" />'
  );

  // h-24 fixed
  t = t.replace(
    /<img loading="lazy" src=\{([^}]+)\} alt="([^"]+)" className="w-full h-24 object-cover([^"]*)"\s*\/>/g,
    '<AppImage src={$1} alt="$2" width={320} height={96} className="w-full h-24 object-cover$3" />'
  );

  // w-16 h-16 modal thumb
  t = t.replace(
    /<img\s+src=\{([^}]+)\}\s+alt=\{([^}]+)\}\s+className="w-16 h-16 rounded-xl object-cover flex-shrink-0"\s*\/>/g,
    '<AppImage src={$1} alt={$2} width={64} height={64} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />'
  );

  // PopularSection style without loading attr
  t = t.replace(
    /<img\s+loading="eager"\s+src=\{([^}]+)\}\s+alt=\{([^}]+)\}\s+className="([^"]+)"\s*\/>/g,
    '<AppImage src={$1} alt={$2} priority fill className="$3" />'
  );

  if (t !== before) {
    t = ensureImport(t);
    fs.writeFileSync(file, t);
    console.log("updated:", file);
  }
}

for (const file of walk("src")) {
  if (fs.readFileSync(file, "utf8").includes("<img")) processFile(file);
}
