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

# Run tests (if configured)
test:
    npm run test:unit
