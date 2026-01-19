#!/usr/bin/env bun
import { Command } from "commander";
import chalk from "chalk";
import { registerStoreCommands } from "./commands/store.ts";
import { registerFileCommands } from "./commands/file.ts";
import { registerQueryCommands } from "./commands/query.ts";

const program = new Command();

program
  .name("gemini-file-search")
  .description("CLI tool for Gemini File Search API")
  .version("1.0.0");

// Display banner
console.log(
  chalk.cyan(`
╔═══════════════════════════════════════════╗
║     Gemini File Search CLI Demo           ║
║     Semantic Search & RAG with Gemini     ║
╚═══════════════════════════════════════════╝
`)
);

// Register command groups
registerStoreCommands(program);
registerFileCommands(program);
registerQueryCommands(program);

// Add examples to help
program.addHelpText(
  "after",
  `
${chalk.bold("Examples:")}
  ${chalk.gray("# Store Management")}
  $ gemini-file-search store create my-knowledge-base
  $ gemini-file-search store list
  $ gemini-file-search store get my-store-id
  $ gemini-file-search store delete my-store-id --force

  ${chalk.gray("# File Management")}
  $ gemini-file-search file upload my-store-id ./document.pdf
  $ gemini-file-search file upload my-store-id ./data.txt --name "Important Data"
  $ gemini-file-search file import my-store-id ./large-file.pdf
  $ gemini-file-search file list
  $ gemini-file-search file get file-id
  $ gemini-file-search file delete file-id

  ${chalk.gray("# Query & Search")}
  $ gemini-file-search query my-store-id "What is the main topic?"
  $ gemini-file-search query my-store-id "Summarize the document" --show-citations
  $ gemini-file-search search my-store-id "important dates" --context
  $ gemini-file-search chat my-store-id

${chalk.bold("Environment Variables:")}
  GEMINI_API_KEY  - Your Google Gemini API key (required)

${chalk.bold("Notes:")}
  - File Search stores persist indefinitely until deleted
  - Uploaded files via Files API expire after 48 hours
  - Imported file data in stores persists indefinitely
  - Use 'import' for large files (>20MB) for better reliability
`
);

program.parse();
