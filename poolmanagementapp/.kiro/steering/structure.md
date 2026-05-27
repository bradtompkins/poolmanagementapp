# Project Structure

> This project is in early setup. Update this file as the structure is established.

## Current Layout

```
poolmanagementapp/
└── .kiro/
    └── steering/       # AI assistant guidance files
```

## Recommended Structure (update as project grows)

```
poolmanagementapp/
├── .kiro/
│   └── steering/       # AI assistant guidance files
├── src/                # Application source code
│   ├── components/     # UI components (if frontend)
│   ├── pages/          # Page-level views or routes
│   ├── services/       # Business logic and API calls
│   ├── models/         # Data models / types / schemas
│   └── utils/          # Shared helper functions
├── tests/              # Test files mirroring src/ structure
├── public/             # Static assets (if web app)
└── docs/               # Additional documentation
```

## Conventions

- Mirror the `src/` structure inside `tests/` so test files are easy to locate
- Co-locate component-specific styles or tests with the component when practical
- Keep configuration files (env, lint, build) at the project root
- Do not commit secrets or `.env` files — use `.env.example` as a template

## Notes

- Update this file whenever significant structural decisions are made
- Document the rationale for non-obvious organizational choices
