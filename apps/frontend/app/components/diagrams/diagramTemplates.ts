export const diagramTemplates: { id: string; name: string; code: string }[] = [
  {
    id: "flowchart",
    name: "Flowchart",
    code: `flowchart LR
  A[Open a PR] --> B{Checks pass?}
  B -- Yes --> C[Review]
  B -- No --> D[Fix and push]
  D --> B
  C --> E[(Merge to main)]
`,
  },
  {
    id: "sequence",
    name: "Sequence",
    code: `sequenceDiagram
  participant U as User
  participant W as Web app
  participant A as API
  U->>W: Paste repo link
  W->>A: POST /api/readme/generate
  A-->>W: README draft
  W-->>U: Show in editor
`,
  },
  {
    id: "class",
    name: "Class",
    code: `classDiagram
  class Repo {
    +string owner
    +string name
    +analyze() Profile
  }
  class Profile {
    +string[] stack
    +EnvVar[] envVars
  }
  Repo --> Profile : produces
`,
  },
  {
    id: "er",
    name: "Entity relationship",
    code: `erDiagram
  USER ||--o{ PROJECT : owns
  PROJECT ||--|{ README : has
  USER {
    string id
    string email
  }
  PROJECT {
    string id
    string repo
  }
`,
  },
  {
    id: "state",
    name: "State",
    code: `stateDiagram-v2
  [*] --> Draft
  Draft --> Review : submit
  Review --> Draft : changes requested
  Review --> Published : approve
  Published --> [*]
`,
  },
  {
    id: "gantt",
    name: "Gantt",
    code: `gantt
  title Release plan
  dateFormat YYYY-MM-DD
  section Build
  Design      :done,   d1, 2026-10-01, 5d
  Implement   :active, d2, after d1, 10d
  section Ship
  Beta        :        d3, after d2, 7d
  Launch      :milestone, after d3, 0d
`,
  },
  {
    id: "pie",
    name: "Pie",
    code: `pie title Where time goes
  "Writing code" : 45
  "Reviewing" : 25
  "Writing docs" : 15
  "Meetings" : 15
`,
  },
  {
    id: "git",
    name: "Git graph",
    code: `gitGraph
  commit
  branch feature
  checkout feature
  commit
  commit
  checkout main
  merge feature
  commit
`,
  },
  {
    id: "mindmap",
    name: "Mindmap",
    code: `mindmap
  root((MarkForge))
    Studio
      Templates
      Blocks
    Health Score
    Badges
    Docs Pack
`,
  },
  {
    id: "timeline",
    name: "Timeline",
    code: `timeline
  title Project history
  2024 : Idea
  2025 : First release
  2026 : Monorepo : Toolkit
`,
  },
];
