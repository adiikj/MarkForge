import axios from "axios";

const IMPORTANT_FILES = [
  // Readme & License
  "README.md",
  "README",
  "LICENSE",
  "LICENSE.md",

  // Node.js
  "package.json",
  "index.js",
  "server.js",
  "main.js",
  "app.js",
  "cli.js",

  // Environment
  ".env",
  ".env.example",
  ".env.sample",

  // Python
  "requirements.txt",
  "setup.py",
  "pyproject.toml",

  // PHP
  "composer.json",

  // Go
  "go.mod",

  // Rust
  "Cargo.toml",

  // Docker
  "Dockerfile",
  "docker-compose.yml",

  // Documentation
  "docs.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md",

  // Configurations
  "tsconfig.json",
  "webpack.config.js",
  "babel.config.js",
  ".eslintrc",
  ".prettierrc",
  ".editorconfig"
];

const fetchAllContents = async (username, repo, path = "") => {
  const url = `https://api.github.com/repos/${username}/${repo}/contents/${path}`;
  const { data } = await axios.get(url, {
    headers: {
      "Accept": "application/vnd.github.v3+json"
    }
  });

  let files = [];

  for (const item of data) {
    if (item.type === "file") {
      files.push(item);
    } else if (item.type === "dir") {
      // Recursively fetch nested directories
      const nested = await fetchAllContents(username, repo, item.path);
      files = files.concat(nested);
    }
  }

  return files;
};

export const getRepoData = async (req, res) => {
  const { username, repo } = req.params;

  try {
    // 1. Recursively get all files
    const allFiles = await fetchAllContents(username, repo);

    // 2. Filter important files (by filename, regardless of folder)
    const importantFiles = allFiles.filter(file =>
      IMPORTANT_FILES.includes(file.name)
    );

    // 3. Download contents
    const downloaded = [];
    for (const file of importantFiles) {
      const response = await axios.get(file.download_url);
      downloaded.push({
        name: file.name,
        path: file.path,
        content: response.data
      });
    }

    return res.json({
      allFiles: allFiles.map(f => ({
        name: f.name,
        path: f.path,
        download_url: f.download_url
      })),
      importantFiles: downloaded
    });
  } catch (error) {
    const status = error?.response?.status || 500;
    const message = error?.response?.data?.message || error.message;

    console.error("GitHub API error:", message);

    return res.status(status).json({
      error: "Failed to fetch repository contents.",
      details: message
    });
  }
};
