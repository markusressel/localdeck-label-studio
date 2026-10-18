default:
    @just --list

# Install dependencies
install:
    npm install

# Run the Vite development server (with hot module replacement)
dev:
    npm run dev

# Build the production bundle
build:
    npm run build

# Run the TypeScript type-checker
typecheck:
    npm run type-check

# Lint JS and Vue files (catches undefined/unused names, Vue template errors)
lint:
    npm run lint

# Run tests (if configured)
test:
    npm run test:unit
coverage:
    npm run test:coverage
