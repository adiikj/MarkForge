export interface Template {
  id: string;
  name: string;
  kind: "profile" | "project";
  description: string;
  content: string;
}

export const templates: Template[] = [
  {
    id: "classic",
    name: "Classic",
    kind: "profile",
    description: "About me, stats and skills.",
    content: `# 🚀 Welcome to My GitHub Profile!

## 📝 About Me
- 🔭 I’m currently working on **cool projects**
- 🌱 I’m learning **JavaScript, React, and more**
- 💬 Ask me about **Web Development**
- 📫 How to reach me: [Your Email or Social Links]

## 📊 GitHub Stats
![GitHub Stats](https://github-readme-stats.vercel.app/api?username=yourusername&show_icons=true&theme=dark)

## 🛠 Skills
- **Languages:** JavaScript, TypeScript, C++
- **Frameworks:** React, Next.js, Node.js
- **Tools:** Git, VS Code, Docker
`,
  },
  {
    id: "minimal",
    name: "Minimal",
    kind: "profile",
    description: "A few lines. Lets the pinned repos talk.",
    content: `### Hi, I'm Your Name 👋

Software engineer building developer tools. Currently working on [project](https://github.com/yourusername/project).

- 🌍 Based in Your City
- ✍️ Writing at [yourblog.dev](https://yourblog.dev)
- 📫 Reach me at you@example.com
`,
  },
  {
    id: "card",
    name: "Dev Card",
    kind: "profile",
    description: "Centered header, skill icons, socials.",
    content: `<h1 align="center">Hey, I'm Your Name</h1>
<p align="center"><em>Full-stack developer · open-source contributor · coffee enthusiast</em></p>

<p align="center">
  <a href="https://twitter.com/yourusername"><img alt="Twitter" src="https://img.shields.io/badge/Twitter-000000?style=for-the-badge&logo=x&logoColor=white"></a>
  <a href="https://linkedin.com/in/yourusername"><img alt="LinkedIn" src="https://img.shields.io/badge/LinkedIn-000000?style=for-the-badge&logo=linkedin&logoColor=white"></a>
  <a href="https://yourusername.dev"><img alt="Website" src="https://img.shields.io/badge/Website-000000?style=for-the-badge&logo=googlechrome&logoColor=white"></a>
</p>

## Tech I use

<p align="center">
  <img alt="Skills" src="https://skillicons.dev/icons?i=ts,react,nextjs,nodejs,tailwind,postgres,docker,git" />
</p>

## Stats

<p align="center">
  <img alt="GitHub stats" height="160" src="https://github-readme-stats.vercel.app/api?username=yourusername&show_icons=true&theme=transparent&hide_border=true" />
  <img alt="Top languages" height="160" src="https://github-readme-stats.vercel.app/api/top-langs/?username=yourusername&layout=compact&theme=transparent&hide_border=true" />
</p>
`,
  },
  {
    id: "library",
    name: "Library",
    kind: "project",
    description: "Install, quick example, API, license.",
    content: `# package-name

[![npm](https://img.shields.io/npm/v/package-name?style=flat-square)](https://www.npmjs.com/package/package-name)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

> One sentence on what this does and why you'd reach for it.

## Install

\`\`\`bash
npm install package-name
\`\`\`

## Usage

\`\`\`js
import { doThing } from "package-name";

doThing({ fast: true });
\`\`\`

## API

### \`doThing(options)\`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| \`fast\` | \`boolean\` | \`false\` | Skip the slow path. |

## Contributing

Issues and pull requests are welcome.

## License

MIT
`,
  },
  {
    id: "webapp",
    name: "Web App",
    kind: "project",
    description: "Screenshot, features, local setup, env.",
    content: `# App Name

> A short pitch: what problem it solves and for whom.

![Screenshot of App Name](docs/screenshot.png)

## Features

- **Feature one**: what it does for the user
- **Feature two**: what it does for the user

## Getting Started

\`\`\`bash
git clone https://github.com/yourusername/app-name.git
cd app-name
npm install
cp .env.example .env
npm run dev
\`\`\`

## Environment Variables

| Variable | Description |
| --- | --- |
| \`DATABASE_URL\` | Postgres connection string |

## Deployment

Describe how to deploy, or link to the guide.

## License

MIT
`,
  },
];
