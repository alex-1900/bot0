# AGENTS.md

This document provides guidelines for AI agents working in this repository.

## Project Overview

- **Runtime**: Bun
- **Module System**: ES Modules (type: "module" in package.json)
- **Language**: TypeScript (peer dependency)
- **Main Entry**: dist/index.js

## Build, Lint, and Test Commands

### Install Dependencies
```bash
bun install
```

### Build
```bash
# No build step required - Bun handles TypeScript natively
# For production build:
bun build ./src/index.ts --outfile ./dist/index.js --target bun
```

### Lint
```bash
# Bun's built-in linting
bun lint

# Or use TypeScript compiler for type checking
npx tsc --noEmit
```

### Test
```bash
# No tests configured yet
bun test

# Run a single test file
bun test path/to/test/file.test.ts

# Run tests matching a pattern
bun test --test-name-pattern="pattern"
```

## Code Style Guidelines

### General Principles
- Write clean, self-documenting code
- Follow TypeScript best practices
- Keep functions small and focused (single responsibility)
- Use meaningful variable and function names

### Imports
- Use named imports for clarity: `import { something } from 'module'`
- Avoid default exports when possible
- Group imports: external modules, internal modules
- Use absolute imports with path aliases (configured in jsconfig.json)

```typescript
import { something } from 'module';
import { localModule } from '@/local/module';
```

### Formatting
- Use TypeScript's strict mode settings (see jsconfig.json)
- Prefer const over let, avoid var
- Use template literals instead of string concatenation
- Use arrow functions for anonymous functions

### Types
- Enable strict mode (strict: true in tsconfig)
- Prefer interfaces over type aliases for object types
- Use explicit return types for public functions
- Avoid any, use unknown instead when type is truly unknown
- Use `noUncheckedIndexedAccess: true` for safer array/object access

```typescript
interface User {
    id: string;
    name: string;
}

function getUser(id: string): User {
    // ...
}
```

### Naming Conventions
- **Variables/Properties**: camelCase (e.g., `userName`, `isActive`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Classes**: PascalCase (e.g., `UserService`)
- **Functions**: camelCase (e.g., `fetchData`)
- **Files**: kebab-case for files (e.g., `user-service.ts`)
- **Booleans**: prefix with is/are/has (e.g., `isValid`, `hasAccess`)

### Error Handling
- Use try/catch with specific error types
- Create custom error classes for domain-specific errors
- Log errors appropriately using the configured logger (tslog)
- Never swallow errors silently
- Propagate errors to appropriate handlers

```typescript
import { Logger } from 'tslog';

const logger: Logger = new Logger();

try {
    // operation
} catch (error) {
    logger.error('Operation failed', error);
    throw error;
}
```

### Async/Await
- Use async/await over raw promises
- Always handle promise rejections
- Avoid async void functions (except for event handlers)

### Comments
- Write self-documenting code, avoid redundant comments
- Use JSDoc for public APIs and complex functions
- Explain why, not what

### File Organization
- Keep files small (<300 lines when possible)
- Use barrel exports (index.ts) for directory modules
- Group related files in directories

### Dependencies
- Use established, well-maintained libraries
- Avoid unnecessary dependencies
- Use `ajv` for validation
- Use `express` for HTTP servers
- Use `tslog` for logging
- Use `sqlite-vec` for vector storage

## Project Structure

```
/home/gray/src/github/bot0
├── src/
│   ├── index.ts          # Main entry point
│   └── terminal/         # Terminal-related code
│       └── web/
│           └── api/      # API endpoints
├── dist/                 # Compiled output
├── package.json          # Dependencies and scripts
├── jsconfig.json         # TypeScript/JavaScript configuration
└── bun.lock              # Bun lock file
```

## Important Configuration

### jsconfig.json Settings
- Target: ESNext
- Module: Preserve (Bun-native)
- Strict: true
- noUncheckedIndexedAccess: true
- noImplicitOverride: true

## Common Tasks

### Adding a New Endpoint
1. Create handler in `src/terminal/web/api/`
2. Register with Express app
3. Add validation using ajv if needed
4. Add appropriate logging

### Running Development Server
```bash
bun run src/index.ts
```

### Type Checking
```bash
npx tsc --noEmit
```

## Additional Notes

- This project uses Bun's native TypeScript support
- Express 5.x is used for the web framework
- sqlite-vec is used for vector similarity search
- moment is used for date/time handling
- ajv is used for JSON schema validation
