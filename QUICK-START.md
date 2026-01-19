# Quick Start Guide

Get up and running with Gemini File Search CLI in 5 minutes.

## 1. Setup

```bash
# Install dependencies
bun install

# Set your API key
export GEMINI_API_KEY=your_api_key_here
```

## 2. Create a Store

```bash
bun run start store create my-docs
```

Output:
```
✔ File Search store created
Success: Store created successfully

  Full Name:   fileSearchStores/mydocs-abc123xyz
  Store ID:    mydocs-abc123xyz
  Display Name: my-docs

Use the Store ID for file uploads and queries:
  bun run start file upload mydocs-abc123xyz ./your-file.txt
  bun run start query mydocs-abc123xyz "your question"
```

## 3. Upload Files

```bash
# Upload a file (you can use display name or store ID)
bun run start file upload my-docs ./sample.txt

# Upload with custom display name
bun run start file upload my-docs ./document.pdf --name "Project Report"
```

## 4. List Stores (with Storage Info)

```bash
bun run start store list
```

Output:
```
┌─────────────────────┬──────────────┬───────────┬─────────┬────────────────────────┐
│ Store ID            │ Display Name │ Documents │ Size    │ Created                │
├─────────────────────┼──────────────┼───────────┼─────────┼────────────────────────┤
│ mydocs-abc123xyz    │ my-docs      │ 2         │ 15.3 KB │ 1/19/2026, 6:52:19 PM  │
└─────────────────────┴──────────────┴───────────┴─────────┴────────────────────────┘
```

## 5. View Files in Store

```bash
# List files indexed in a store (AI-powered)
bun run start file list-in-store my-docs

# Get detailed content summary
bun run start file summary my-docs
```

## 6. Query Your Documents

```bash
# Ask questions about your documents
bun run start query my-docs "What is the main topic?"

# Get answers with source citations
bun run start query my-docs "Summarize the key points" --show-citations

# Search for specific information
bun run start search my-docs "important dates" --context
```

## 7. Interactive Chat

```bash
bun run start chat my-docs
```

```
Interactive Document Chat
Store: fileSearchStores/mydocs-abc123xyz
Model: gemini-2.5-flash
Type "exit" or "quit" to end the session
Type "clear" to clear chat history

You: What topics are covered in these documents?
⠋ Thinking...
Assistant: Based on the indexed documents, the main topics covered are...

You: Tell me more about the technical details
Assistant: The technical details include...

You: exit
Goodbye!
```

## 8. Store Details

```bash
bun run start store get my-docs
```

Output:
```
Store Details:
  Full Name:    fileSearchStores/mydocs-abc123xyz
  Store ID:     mydocs-abc123xyz
  Display Name: my-docs
  Created:      1/19/2026, 6:52:19 PM
  Updated:      1/19/2026, 7:15:42 PM

  Storage Info:
  Documents:    2
  Size:         15.3 KB
```

## 9. Cleanup

```bash
# Delete a store (use --force if it contains files)
bun run start store delete my-docs --force
```

## Command Reference

| Command | Description |
|---------|-------------|
| `store create <name>` | Create a new File Search store |
| `store list` | List all stores with document count and size |
| `store get <name>` | Get detailed store info |
| `store delete <name>` | Delete a store (--force to force) |
| `file upload <store> <path>` | Upload file to store |
| `file import <store> <path>` | Import large file (>20MB) |
| `file list-in-store <store>` | List files in store (AI-powered) |
| `file summary <store>` | Get content summary of store |
| `file list` | List Files API uploads |
| `file help-store` | Show file management limitations |
| `query <store> <question>` | Query documents with AI |
| `search <store> <query>` | Semantic search |
| `chat <store>` | Interactive chat session |

## Tips

- **Use display names**: You can use `my-docs` instead of `mydocs-abc123xyz`
- **Large files**: Use `file import` for files >20MB
- **Citations**: Add `--show-citations` to see source references
- **JSON output**: Add `--json` to get raw API response
- **Help**: Run any command with `--help` for options
