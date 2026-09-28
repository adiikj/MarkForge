import type { ProjectProfile } from "./analyzer.service.js";

// Every section builder returns Markdown starting with its "## " heading (or "" when there is
// nothing to say), so the health checker can reuse them as one-click fixes.

const TODO = (hint: string) => `<!-- TODO: ${hint} -->`;

const fence = (lang: string, lines: string[]) => ["```" + lang, ...lines, "```"].join("\n");

const runCmd = (p: ProjectProfile, script: string): string => {
  switch (p.packageManager) {
    case "pnpm":
    case "yarn":
    case "bun":
      return `${p.packageManager} ${script}`;
    default:
      return script === "start" || script === "test" ? `npm ${script}` : `npm run ${script}`;
  }
};

const installCmds = (p: ProjectProfile): string[] => {
  switch (p.packageManager) {
    case "pnpm":
    case "yarn":
    case "bun":
      return [`${p.packageManager} install`];
    case "npm":
      return ["npm install"];
    case "pip":
      return [
        "python -m venv .venv",
        "source .venv/bin/activate  # Windows: .venv\\Scripts\\activate",
        p.hasRequirementsTxt ? "pip install -r requirements.txt" : "pip install -e .",
      ];
    case "poetry":
      return ["poetry install"];
    case "uv":
      return ["uv sync"];
    case "go":
      return ["go mod download"];
    case "cargo":
      return ["cargo build --release"];
    case "composer":
      return ["composer install"];
    case "bundler":
      return ["bundle install"];
    case "maven":
      return ["mvn install"];
    case "gradle":
      return ["./gradlew build"];
    default:
      return [];
  }
};

const devCmds = (p: ProjectProfile): string[] => {
  if (p.ecosystem === "node") {
    const dev = p.scripts.find((s) => s.name === "dev") ?? p.scripts.find((s) => s.name === "start");
    return dev ? [runCmd(p, dev.name)] : [];
  }
  switch (p.packageManager) {
    case "go":
      return ["go run ."];
    case "cargo":
      return ["cargo run"];
    case "poetry":
      return ["poetry run python main.py  # adjust to your entry point"];
    case "uv":
      return ["uv run main.py  # adjust to your entry point"];
    case "pip":
      return p.stack.includes("Django")
        ? ["python manage.py runserver"]
        : p.stack.includes("Streamlit")
          ? ["streamlit run app.py  # adjust to your entry point"]
          : ["python main.py  # adjust to your entry point"];
    case "bundler":
      return p.stack.includes("Ruby on Rails") ? ["bin/rails server"] : [];
    default:
      return [];
  }
};

const prereqs = (p: ProjectProfile): string[] => {
  const list: string[] = [];
  if (p.ecosystem === "node") {
    list.push("[Node.js](https://nodejs.org/) 20 or later");
    if (p.packageManager === "pnpm") list.push("[pnpm](https://pnpm.io/installation)");
    if (p.packageManager === "yarn") list.push("[Yarn](https://yarnpkg.com/getting-started/install)");
    if (p.packageManager === "bun") list.push("[Bun](https://bun.sh/)");
  }
  if (p.ecosystem === "python") list.push("[Python](https://www.python.org/downloads/) 3.10 or later");
  if (p.packageManager === "poetry") list.push("[Poetry](https://python-poetry.org/docs/#installation)");
  if (p.packageManager === "uv") list.push("[uv](https://docs.astral.sh/uv/)");
  if (p.ecosystem === "go") list.push("[Go](https://go.dev/dl/)");
  if (p.ecosystem === "rust") list.push("[Rust](https://rustup.rs/)");
  if (p.ecosystem === "php") list.push("PHP and [Composer](https://getcomposer.org/)");
  if (p.ecosystem === "ruby") list.push("Ruby and [Bundler](https://bundler.io/)");
  if (p.ecosystem === "java") list.push("JDK 17 or later");
  if (p.hasCompose || p.hasDocker) list.push("[Docker](https://docs.docker.com/get-docker/) (optional)");
  return list;
};

export const badgesLine = (p: ProjectProfile): string => {
  const { owner, name } = p.meta;
  const badges: string[] = [];
  if (p.ciWorkflow) {
    badges.push(
      `[![CI](https://img.shields.io/github/actions/workflow/status/${owner}/${name}/${p.ciWorkflow}?style=flat-square&label=CI)](https://github.com/${owner}/${name}/actions)`
    );
  }
  if (p.npmPackage) {
    badges.push(
      `[![npm](https://img.shields.io/npm/v/${p.npmPackage}?style=flat-square)](https://www.npmjs.com/package/${p.npmPackage})`
    );
  }
  if (p.meta.license) {
    badges.push(
      `[![License](https://img.shields.io/github/license/${owner}/${name}?style=flat-square)](${p.licensePath ?? p.meta.htmlUrl})`
    );
  }
  badges.push(
    `[![Stars](https://img.shields.io/github/stars/${owner}/${name}?style=flat-square)](https://github.com/${owner}/${name}/stargazers)`
  );
  if (p.communityFiles.contributing) {
    badges.push(`[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](${p.contributingPath ?? "#contributing"})`);
  }
  return badges.join(" ");
};

export const featuresSection = (): string =>
  [
    "## Features",
    "",
    TODO("list what makes this project useful. Lead with outcomes, not implementation."),
    "- **Feature one**: what it does for the user",
    "- **Feature two**: what it does for the user",
    "- **Feature three**: what it does for the user",
  ].join("\n");

export const stackSection = (p: ProjectProfile): string =>
  p.stack.length ? ["## Tech Stack", "", ...p.stack.map((s) => `- ${s}`)].join("\n") : "";

export const installSection = (p: ProjectProfile): string => {
  const { owner, name } = p.meta;
  const lines = ["## Getting Started", ""];

  const pre = prereqs(p);
  if (pre.length) lines.push("### Prerequisites", "", ...pre.map((x) => `- ${x}`), "");

  // Published CLIs get a global install path as well as the from-source path.
  if (p.npmPackage && p.bins.length) {
    lines.push("### Install", "", fence("bash", [`npm install -g ${p.npmPackage}`]), "", "Or build from source:", "");
  } else if (p.npmPackage) {
    lines.push("### Install", "", fence("bash", [`npm install ${p.npmPackage}`]), "", "### Development setup", "");
  } else {
    lines.push("### Installation", "");
  }

  const setup = [`git clone https://github.com/${owner}/${name}.git`, `cd ${name}`, ...installCmds(p)];
  if (p.envVars.length) setup.push("cp .env.example .env  # then fill in the values");
  lines.push(fence("bash", setup));

  const dev = devCmds(p);
  const hasDevScript = p.scripts.some((s) => s.name === "dev");
  if (dev.length) lines.push("", hasDevScript ? "Start the development server:" : "Run it:", "", fence("bash", dev));
  if (p.hasCompose) lines.push("", "Or run everything with Docker:", "", fence("bash", ["docker compose up"]));

  return lines.join("\n");
};

export const envSection = (p: ProjectProfile): string => {
  if (!p.envVars.length) return "";
  const esc = (s: string) => s.replace(/\|/g, "\\|");
  return [
    "## Environment Variables",
    "",
    "Copy `.env.example` to `.env` and set the following:",
    "",
    "| Variable | Description | Example |",
    "| --- | --- | --- |",
    ...p.envVars.map(
      (v) =>
        `| \`${v.key}\` | ${v.comment ? esc(v.comment) : TODO("describe")} | ${v.example ? `\`${esc(v.example)}\`` : ""} |`
    ),
  ].join("\n");
};

export const usageSection = (p: ProjectProfile): string => {
  const lines = ["## Usage", ""];
  if (p.bins.length) {
    lines.push(fence("bash", [`${p.bins[0]} --help`]), "", TODO("show the two or three commands people run most."));
  } else if (p.npmPackage) {
    lines.push(
      fence("js", [`import { /* ... */ } from "${p.npmPackage}";`, "", "// TODO: a minimal, copy-pasteable example"])
    );
  } else {
    lines.push(TODO("show how to use the project once it's running: a screenshot, a GIF, or an example request."));
  }
  return lines.join("\n");
};

export const scriptsSection = (p: ProjectProfile): string => {
  if (p.ecosystem !== "node" || p.scripts.length < 2) return "";
  return [
    "## Scripts",
    "",
    "| Command | Runs |",
    "| --- | --- |",
    ...p.scripts.map((s) => `| \`${runCmd(p, s.name)}\` | \`${s.command.replace(/\|/g, "\\|")}\` |`),
  ].join("\n");
};

export const structureSection = (p: ProjectProfile): string => {
  if (p.topLevelDirs.length < 2) return "";
  const dirs = p.topLevelDirs.slice(0, 12);
  return [
    "## Project Structure",
    "",
    fence("text", [
      `${p.meta.name}/`,
      ...dirs.map((d, i) => `${i === dirs.length - 1 ? "└──" : "├──"} ${d}/`),
    ]),
  ].join("\n");
};

export const testingSection = (p: ProjectProfile): string => {
  if (!p.hasTests) return "";
  const cmd =
    p.ecosystem === "node"
      ? runCmd(p, "test")
      : p.ecosystem === "python"
        ? "pytest"
        : p.ecosystem === "go"
          ? "go test ./..."
          : p.ecosystem === "rust"
            ? "cargo test"
            : null;
  return cmd ? ["## Running Tests", "", fence("bash", [cmd])].join("\n") : "";
};

export const contributingSection = (p: ProjectProfile | null): string => {
  const lines = ["## Contributing", ""];
  if (p?.contributingPath) {
    lines.push(`Contributions are welcome! Please read [the contributing guide](${p.contributingPath}) before opening a pull request.`);
  } else {
    lines.push(
      "Contributions are welcome!",
      "",
      "1. Fork the repository",
      "2. Create a branch: `git checkout -b feature/my-change`",
      "3. Commit your changes: `git commit -m \"Add my change\"`",
      "4. Push and open a pull request"
    );
  }
  return lines.join("\n");
};

export const licenseSection = (p: ProjectProfile | null): string => {
  if (p?.meta.license) {
    const name = p.meta.license.name.replace(/^the\s+/i, "");
    return p.licensePath
      ? `## License\n\nDistributed under the ${name}. See [${p.licensePath}](${p.licensePath}) for details.`
      : `## License\n\nDistributed under the ${name}.`;
  }
  return `## License\n\n${TODO("add a LICENSE file and name it here, e.g. MIT.")}`;
};

export const tableOfContents = (headings: string[]): string =>
  ["## Table of Contents", "", ...headings.map((h) => `- [${h}](#${slugify(h)})`)].join("\n");

/** GitHub-compatible heading anchor. */
export const slugify = (text: string): string =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");

export const generateReadme = (p: ProjectProfile): string => {
  const { meta } = p;
  const header = [
    `# ${meta.name}`,
    "",
    badgesLine(p),
    "",
    meta.description ? `> ${meta.description}` : `> ${TODO("one sentence: what this does and who it's for.")}`,
  ];
  if (meta.homepage) header.push("", `**[Live demo →](${meta.homepage})**`);

  const sections = [
    featuresSection(),
    stackSection(p),
    installSection(p),
    envSection(p),
    usageSection(p),
    scriptsSection(p),
    structureSection(p),
    testingSection(p),
    contributingSection(p),
    licenseSection(p),
  ].filter(Boolean);

  const titles = sections.map((s) => s.split("\n")[0].replace(/^##\s+/, ""));
  const toc = sections.length >= 6 ? [tableOfContents(titles)] : [];

  return [header.join("\n"), ...toc, ...sections].join("\n\n") + "\n";
};
