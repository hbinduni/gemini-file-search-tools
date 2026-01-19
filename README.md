# Gemini File Search CLI

A CLI demo application for the [Google Gemini File Search API](https://ai.google.dev/gemini-api/docs/file-search), built with Bun and TypeScript.

## Features

- **Store Management**: Create, list, get, and delete File Search stores with storage info (documents count, size)
- **File Upload**: Upload files with automatic chunking support for large files
- **File Listing**: View files indexed in stores using AI-powered queries
- **Query & Search**: Semantic search and Q&A over your documents using Gemini AI
- **Interactive Chat**: Chat with your documents in an interactive session
- **Citations**: View source citations for AI responses
- **Smart Name Resolution**: Use store display names or IDs interchangeably

## Prerequisites

- [Bun](https://bun.sh/) runtime (v1.0+)
- Google Gemini API key ([Get one here](https://aistudio.google.com/apikey))

## Installation

```bash
bun install
```

## Setup

Set your Gemini API key as an environment variable:

```bash
export GEMINI_API_KEY=your_api_key_here
```

Or create a `.env` file:

```
GEMINI_API_KEY=your_api_key_here
```

## Usage

### Run the CLI

```bash
bun run start
# or
bun run src/cli.ts
```

### Store Management

```bash
# Create a new File Search store
bun run start store create my-knowledge-base

# List all stores (shows documents count and size)
bun run start store list

# Get store details with storage info
bun run start store get my-knowledge-base

# Delete a store (use --force to delete even with files)
bun run start store delete my-knowledge-base --force
```

Example output for `store list`:
```
┌─────────────────────┬──────────────────┬───────────┬─────────┬────────────────────────┐
│ Store ID            │ Display Name     │ Documents │ Size    │ Created                │
├─────────────────────┼──────────────────┼───────────┼─────────┼────────────────────────┤
│ mydocs-abc123xyz    │ my-docs          │ 3         │ 45.2 KB │ 1/19/2026, 6:52:19 PM  │
└─────────────────────┴──────────────────┴───────────┴─────────┴────────────────────────┘
```

### File Management

```bash
# Upload a file to a store (direct upload, best for <20MB files)
bun run start file upload my-knowledge-base ./document.pdf

# Upload with a custom display name
bun run start file upload my-knowledge-base ./data.txt --name "My Important Data"

# Import a large file (>20MB) - uses Files API + import
bun run start file import my-knowledge-base ./large-file.pdf

# List files indexed in a store (AI-powered)
bun run start file list-in-store my-knowledge-base

# Get a summary of all content in a store
bun run start file summary my-knowledge-base

# List all files in the Files API (temporary uploads)
bun run start file list

# Get file details
bun run start file get <file-id>

# Delete a file from Files API
bun run start file delete <file-id>

# Show file management help and limitations
bun run start file help-store
```

### Query & Search

```bash
# Query documents with a question
bun run start query my-knowledge-base "What is the main topic of this document?"

# Query with citations shown
bun run start query my-knowledge-base "Summarize the key points" --show-citations

# Output raw JSON response
bun run start query my-knowledge-base "What are the findings?" --json

# Search for specific information
bun run start search my-knowledge-base "important dates" --context

# Use a specific model
bun run start query my-knowledge-base "Explain the methodology" --model gemini-2.5-flash
```

### Interactive Chat

```bash
# Start an interactive chat session with your documents
bun run start chat my-knowledge-base

# In chat mode:
# - Type your questions to chat with documents
# - Type "clear" to clear chat history
# - Type "exit" or "quit" to end the session
```

## Store Name Resolution

You can use either the **Store ID** or **Display Name** when referencing stores:

```bash
# These are equivalent:
bun run start query mydocs-abc123xyz "What is this about?"
bun run start query my-docs "What is this about?"
```

## Supported File Types

The File Search API supports various file formats including:
- PDF documents
- Text files (.txt)
- Word documents (.docx)
- And more

## API Behavior & Limitations

### Storage
- **File Search Stores**: Persist indefinitely until deleted
- **Files API Uploads**: Temporary files that expire after 48 hours
- **Imported Data**: Once imported to a store, the data persists indefinitely
- **Large Files**: Use the `import` command for files >20MB for better reliability

### Current API Limitations
| Operation | Supported? |
|-----------|------------|
| List files in a store | No (use `file list-in-store` workaround) |
| Delete file from store | No (must recreate store) |
| Update file in store | No (must recreate store) |
| Delete entire store | Yes |
| List Files API uploads | Yes |

### Workarounds

To **update or delete** a file from a store:
1. Delete the store: `bun run start store delete my-store --force`
2. Recreate the store: `bun run start store create my-store`
3. Re-upload only the files you want to keep

## Project Structure

```
src/
├── cli.ts              # Main CLI entry point
├── client.ts           # Gemini API client configuration
├── commands/
│   ├── store.ts        # Store management commands
│   ├── file.ts         # File management commands
│   └── query.ts        # Query and chat commands
└── utils/
    ├── format.ts       # Output formatting utilities
    └── operations.ts   # Async operation helpers
```

## Development

```bash
# Run with watch mode
bun run dev

# Type check
bun run typecheck
```

## License

MIT
