import type { ProjectProfile } from "./analyzer.service.js";
import { devCmds, fence, installCmds, runCmd, TODO } from "./readmeGenerator.service.js";

export interface DocFile {
  id: string;
  path: string;
  title: string;
  description: string;
  content: string;
  /** A file serving the same purpose already exists in the repo. */
  exists: boolean;
  existingPath: string | null;
}

export interface DocsPackOptions {
  /** Where conduct and security reports go. Falls back to GitHub-native channels. */
  contactEmail?: string;
}

const script = (p: ProjectProfile, name: string) => (p.scripts.some((s) => s.name === name) ? runCmd(p, name) : null);

const testCmd = (p: ProjectProfile): string | null =>
  p.ecosystem === "node"
    ? script(p, "test")
    : p.ecosystem === "python"
      ? "pytest"
      : p.ecosystem === "go"
        ? "go test ./..."
        : p.ecosystem === "rust"
          ? "cargo test"
          : null;

const lintCmd = (p: ProjectProfile): string | null =>
  p.ecosystem === "node"
    ? script(p, "lint")
    : p.ecosystem === "go"
      ? "go vet ./..."
      : p.ecosystem === "rust"
        ? "cargo clippy"
        : null;

const contributing = (p: ProjectProfile, docs: Record<string, string>): string => {
  const { owner, name } = p.meta;
  const setup = [
    `git clone https://github.com/<your-username>/${name}.git`,
    `cd ${name}`,
    `git remote add upstream https://github.com/${owner}/${name}.git`,
    ...installCmds(p),
  ];
  if (p.envVars.length) setup.push("cp .env.example .env");
  const dev = devCmds(p);
  const test = testCmd(p);
  const lint = lintCmd(p);

  const checks = [test && `- Tests pass: \`${test}\``, lint && `- Lint passes: \`${lint}\``].filter(Boolean);

  return [
    `# Contributing to ${name}`,
    "",
    `Thanks for taking the time to contribute! This guide covers how to set up ${name} locally and get a change merged.`,
    "",
    `By participating you agree to follow our [Code of Conduct](${docs.coc}).`,
    "",
    "## Ways to contribute",
    "",
    `- **Report a bug**: [open an issue](https://github.com/${owner}/${name}/issues/new?template=bug_report.md) with steps to reproduce.`,
    `- **Suggest a feature**: [open a feature request](https://github.com/${owner}/${name}/issues/new?template=feature_request.md) describing the problem it solves.`,
    "- **Improve the docs**: typo fixes and clarifications are always welcome.",
    "- **Fix an issue**: look for issues labelled `good first issue` or `help wanted`.",
    "",
    "For anything bigger than a small fix, please open an issue first so we can agree on the approach before you invest time in it.",
    "",
    "## Development setup",
    "",
    fence("bash", setup),
    ...(dev.length ? ["", "Start it locally:", "", fence("bash", dev)] : []),
    ...(test || lint
      ? ["", "Before pushing, make sure everything passes:", "", fence("bash", [lint, test].filter(Boolean) as string[])]
      : []),
    "",
    "## Making a change",
    "",
    "1. Sync with upstream: `git fetch upstream && git checkout -b my-change upstream/" + p.meta.defaultBranch + "`",
    "2. Make your change, with tests where it makes sense.",
    "3. Commit with a clear message, e.g. `Fix crash when config is empty`.",
    "4. Push to your fork and open a pull request against `" + p.meta.defaultBranch + "`.",
    "",
    "## Pull request checklist",
    "",
    "- The PR describes **what** changed and **why**",
    "- Related issues are linked (e.g. `Closes #123`)",
    ...checks,
    "- Docs and README are updated if behaviour changed",
    "",
    "A maintainer will review your PR. We may suggest changes. That's normal and not a rejection!",
    "",
    "## License",
    "",
    p.meta.license
      ? `By contributing, you agree that your contributions will be licensed under the ${p.meta.license.name.replace(/^the\s+/i, "")}.`
      : `By contributing, you agree that your contributions will be licensed under the project's license. ${TODO("add a LICENSE file")}`,
    "",
  ].join("\n");
};

const codeOfConduct = (p: ProjectProfile, contact: string): string =>
  [
    "# Code of Conduct",
    "",
    "## Our pledge",
    "",
    `We as members, contributors, and maintainers of ${p.meta.name} pledge to make participation in our community a harassment-free experience for everyone, regardless of age, body size, visible or invisible disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, caste, color, religion, or sexual identity and orientation.`,
    "",
    "## Our standards",
    "",
    "Examples of behavior that contributes to a positive environment:",
    "",
    "- Demonstrating empathy and kindness toward other people",
    "- Being respectful of differing opinions, viewpoints, and experiences",
    "- Giving and gracefully accepting constructive feedback",
    "- Taking responsibility for our mistakes and learning from them",
    "- Focusing on what is best for the overall community",
    "",
    "Examples of unacceptable behavior:",
    "",
    "- Sexualized language or imagery, and sexual attention or advances of any kind",
    "- Trolling, insulting or derogatory comments, and personal or political attacks",
    "- Public or private harassment",
    "- Publishing others' private information without their explicit permission",
    "- Other conduct which could reasonably be considered inappropriate in a professional setting",
    "",
    "## Enforcement",
    "",
    `Instances of abusive, harassing, or otherwise unacceptable behavior may be reported to the maintainers at ${contact}. All complaints will be reviewed and investigated promptly and fairly, and the privacy of the reporter will be respected.`,
    "",
    "Maintainers may remove, edit, or reject comments, commits, code, issues, and other contributions that do not align with this Code of Conduct, and may temporarily or permanently ban anyone for behavior they deem inappropriate.",
    "",
    "## Scope",
    "",
    "This Code of Conduct applies within all project spaces, and when an individual is officially representing the project in public spaces.",
    "",
    "## Attribution",
    "",
    "This Code of Conduct is adapted from the [Contributor Covenant](https://www.contributor-covenant.org), version 2.1, available at <https://www.contributor-covenant.org/version/2/1/code_of_conduct.html>.",
    "",
  ].join("\n");

const security = (p: ProjectProfile, email: string | undefined): string => {
  const { owner, name } = p.meta;
  const advisory = `https://github.com/${owner}/${name}/security/advisories/new`;
  return [
    "# Security Policy",
    "",
    "## Supported versions",
    "",
    "Security fixes are applied to the latest release only.",
    "",
    "| Version | Supported |",
    "| --- | --- |",
    "| Latest | ✅ |",
    "| Older | ❌ |",
    "",
    "## Reporting a vulnerability",
    "",
    "**Please do not report security vulnerabilities through public issues, discussions, or pull requests.**",
    "",
    `Instead, report them privately through [GitHub's security advisory form](${advisory})${email ? ` or by email to ${email}` : ""}.`,
    "",
    "Please include:",
    "",
    "- The type of issue (e.g. XSS, injection, authentication bypass)",
    "- The affected file(s), version, or commit",
    "- Step-by-step instructions to reproduce",
    "- The potential impact, and how an attacker might exploit it",
    "",
    "## What to expect",
    "",
    "- We'll acknowledge your report within **3 business days**.",
    "- We'll keep you updated as we investigate and work on a fix.",
    "- Once fixed, we'll publish an advisory and credit you, unless you'd prefer to stay anonymous.",
    "",
    `> Maintainers: private vulnerability reporting must be enabled under **Settings → Code security** for the advisory link above to work.`,
    "",
  ].join("\n");
};

const bugReport = (p: ProjectProfile): string =>
  [
    "---",
    "name: Bug report",
    "about: Something isn't working as expected",
    "title: ''",
    "labels: bug",
    "assignees: ''",
    "---",
    "",
    "## Describe the bug",
    "",
    "A clear and concise description of what went wrong.",
    "",
    "## To reproduce",
    "",
    "1. ...",
    "2. ...",
    "3. See error",
    "",
    "## Expected behavior",
    "",
    "What you expected to happen instead.",
    "",
    "## Environment",
    "",
    `- ${p.meta.name} version:`,
    "- OS:",
    ...(p.ecosystem === "node" ? ["- Node.js version:"] : p.ecosystem === "python" ? ["- Python version:"] : []),
    ...(p.stack.some((s) => ["React", "Next.js", "Vue", "Svelte", "Angular", "Astro", "Nuxt"].includes(s)) ? ["- Browser:"] : []),
    "",
    "## Additional context",
    "",
    "Logs, screenshots, or anything else that helps.",
    "",
  ].join("\n");

const featureRequest = (): string =>
  [
    "---",
    "name: Feature request",
    "about: Suggest an idea for this project",
    "title: ''",
    "labels: enhancement",
    "assignees: ''",
    "---",
    "",
    "## The problem",
    "",
    "What are you trying to do, and what's getting in the way?",
    "",
    "## Proposed solution",
    "",
    "What you'd like to happen.",
    "",
    "## Alternatives considered",
    "",
    "Other approaches or workarounds you've thought about.",
    "",
    "## Additional context",
    "",
  ].join("\n");

const pullRequestTemplate = (p: ProjectProfile): string => {
  const test = testCmd(p);
  const lint = lintCmd(p);
  return [
    "## What does this change?",
    "",
    "<!-- A short summary of the change and why it's needed. -->",
    "",
    "Closes #",
    "",
    "## Type of change",
    "",
    "- [ ] Bug fix",
    "- [ ] New feature",
    "- [ ] Breaking change",
    "- [ ] Documentation",
    "",
    "## Checklist",
    "",
    ...(test ? [`- [ ] \`${test}\` passes`] : p.hasTests ? ["- [ ] Tests pass"] : []),
    ...(lint ? [`- [ ] \`${lint}\` passes`] : []),
    "- [ ] I added or updated tests where it makes sense",
    "- [ ] I updated the docs / README if behavior changed",
    "",
  ].join("\n");
};

const changelog = (p: ProjectProfile): string =>
  [
    "# Changelog",
    "",
    `All notable changes to ${p.meta.name} are documented in this file.`,
    "",
    "The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).",
    "",
    "## [Unreleased]",
    "",
    "### Added",
    "",
    "- ",
    "",
    "### Changed",
    "",
    "- ",
    "",
    "### Fixed",
    "",
    "- ",
    "",
    `[Unreleased]: https://github.com/${p.meta.owner}/${p.meta.name}/commits/${p.meta.defaultBranch}`,
    "",
  ].join("\n");

const support = (p: ProjectProfile, docs: Record<string, string>): string => {
  const { owner, name } = p.meta;
  return [
    "# Getting help",
    "",
    `Thanks for using ${name}! Here's where to go:`,
    "",
    ...(p.meta.homepage ? [`- **Documentation**: <${p.meta.homepage}>`] : []),
    `- **Questions and ideas**: [GitHub Discussions](https://github.com/${owner}/${name}/discussions) (if enabled) or an issue.`,
    `- **Bugs**: [open a bug report](https://github.com/${owner}/${name}/issues/new?template=bug_report.md).`,
    `- **Security issues**: please follow the [security policy](${docs.security}), not public issues.`,
    "",
    "Please search existing issues before opening a new one. Your question may already be answered.",
    "",
  ].join("\n");
};

export const generateDocsPack = (p: ProjectProfile, paths: string[], opts: DocsPackOptions = {}): DocFile[] => {
  const lower = new Map(paths.map((x) => [x.toLowerCase(), x]));
  const find = (...candidates: string[]) => {
    for (const c of candidates) {
      const hit = lower.get(c.toLowerCase());
      if (hit) return hit;
    }
    return null;
  };
  const inCommunityDirs = (file: string) => find(file, `.github/${file}`, `docs/${file}`);
  const issueDir = paths.filter((x) => x.toLowerCase().startsWith(".github/issue_template/"));
  const email = opts.contactEmail?.trim() || undefined;
  const conductContact = email ?? `the project maintainers via a [private security advisory](https://github.com/${p.meta.owner}/${p.meta.name}/security/advisories/new) or by contacting @${p.meta.owner} directly`;

  // Links between generated files point at existing files when the repo already has them.
  const docs = {
    coc: inCommunityDirs("CODE_OF_CONDUCT.md") ?? "CODE_OF_CONDUCT.md",
    security: inCommunityDirs("SECURITY.md") ?? "SECURITY.md",
  };

  const files: Omit<DocFile, "exists">[] = [
    {
      id: "contributing",
      path: "CONTRIBUTING.md",
      title: "Contributing guide",
      description: "Local setup, workflow and PR checklist using your real commands.",
      content: contributing(p, docs),
      existingPath: inCommunityDirs("CONTRIBUTING.md"),
    },
    {
      id: "coc",
      path: "CODE_OF_CONDUCT.md",
      title: "Code of Conduct",
      description: "Adapted from the Contributor Covenant 2.1.",
      content: codeOfConduct(p, conductContact),
      existingPath: inCommunityDirs("CODE_OF_CONDUCT.md"),
    },
    {
      id: "security",
      path: "SECURITY.md",
      title: "Security policy",
      description: "How to report vulnerabilities privately.",
      content: security(p, email),
      existingPath: inCommunityDirs("SECURITY.md"),
    },
    {
      id: "support",
      path: "SUPPORT.md",
      title: "Support",
      description: "Where to ask questions and report bugs.",
      content: support(p, docs),
      existingPath: inCommunityDirs("SUPPORT.md"),
    },
    {
      id: "bug",
      path: ".github/ISSUE_TEMPLATE/bug_report.md",
      title: "Bug report template",
      description: "Structured bug reports with the right environment fields.",
      content: bugReport(p),
      existingPath: issueDir.find((x) => /bug/i.test(x)) ?? null,
    },
    {
      id: "feature",
      path: ".github/ISSUE_TEMPLATE/feature_request.md",
      title: "Feature request template",
      description: "Problem-first feature requests.",
      content: featureRequest(),
      existingPath: issueDir.find((x) => /feature|enhancement/i.test(x)) ?? null,
    },
    {
      id: "pr",
      path: ".github/pull_request_template.md",
      title: "Pull request template",
      description: "Checklist wired to your test and lint commands.",
      content: pullRequestTemplate(p),
      existingPath: find(".github/pull_request_template.md", "pull_request_template.md", "docs/pull_request_template.md"),
    },
    {
      id: "changelog",
      path: "CHANGELOG.md",
      title: "Changelog",
      description: "Keep a Changelog skeleton, ready for your next release.",
      content: changelog(p),
      existingPath: find("CHANGELOG.md", "CHANGES.md", "HISTORY.md"),
    },
  ];

  return files.map((f) => ({ ...f, exists: f.existingPath !== null }));
};
