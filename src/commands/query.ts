import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import { ai, DEFAULT_MODEL } from "../client.ts";
import { formatError, formatInfo } from "../utils/format.ts";
import { resolveStoreName } from "./store.ts";

export function registerQueryCommands(program: Command): void {
  // Query command - search documents in a store
  program
    .command("query <storeName> <question>")
    .description("Query documents in a File Search store using AI (use Store ID or display name)")
    .option("-m, --model <model>", "Model to use", DEFAULT_MODEL)
    .option("--show-citations", "Show citations in the response")
    .option("--json", "Output raw JSON response")
    .action(
      async (
        storeName: string,
        question: string,
        options: { model: string; showCitations?: boolean; json?: boolean }
      ) => {
        try {
          // Resolve store name (supports ID or display name)
          const resolveSpinner = ora("Resolving store...").start();
          const fullStoreName = await resolveStoreName(storeName);
          resolveSpinner.stop();

          console.log(formatInfo(`Store: ${fullStoreName}`));
          console.log(formatInfo(`Model: ${options.model}`));
          console.log(formatInfo(`Question: ${question}`));
          console.log();

          const spinner = ora("Searching documents...").start();

          const response = await ai.models.generateContent({
            model: options.model,
            contents: question,
            config: {
              tools: [
                {
                  fileSearch: {
                    fileSearchStoreNames: [fullStoreName],
                  },
                },
              ],
            },
          });

          spinner.stop();

          if (options.json) {
            console.log(JSON.stringify(response, null, 2));
            return;
          }

          // Display the response
          console.log(chalk.bold.green("Answer:"));
          console.log();
          console.log(response.text || "No response generated");

          // Show citations if requested
          if (options.showCitations) {
            console.log();
            console.log(chalk.bold.cyan("Citations:"));
            displayCitations(response);
          }
        } catch (error: any) {
          console.error(formatError(error.message || String(error)));
          process.exit(1);
        }
      }
    );

  // Search command - alias for query with different semantics
  program
    .command("search <storeName> <query>")
    .description("Search for information in a File Search store (use Store ID or display name)")
    .option("-m, --model <model>", "Model to use", DEFAULT_MODEL)
    .option("-c, --context", "Show document context/citations")
    .action(
      async (
        storeName: string,
        query: string,
        options: { model: string; context?: boolean }
      ) => {
        try {
          // Resolve store name
          const resolveSpinner = ora("Resolving store...").start();
          const fullStoreName = await resolveStoreName(storeName);
          resolveSpinner.stop();

          const spinner = ora("Searching...").start();

          const response = await ai.models.generateContent({
            model: options.model,
            contents: `Search and find relevant information about: ${query}. 
                       Provide a concise summary of what you find in the documents.`,
            config: {
              tools: [
                {
                  fileSearch: {
                    fileSearchStoreNames: [fullStoreName],
                  },
                },
              ],
            },
          });

          spinner.stop();

          console.log(chalk.bold.green("Search Results:"));
          console.log();
          console.log(response.text || "No results found");

          if (options.context) {
            console.log();
            console.log(chalk.bold.cyan("Sources:"));
            displayCitations(response);
          }
        } catch (error: any) {
          console.error(formatError(error.message || String(error)));
          process.exit(1);
        }
      }
    );

  // Interactive chat mode
  program
    .command("chat <storeName>")
    .description("Start an interactive chat session with documents (use Store ID or display name)")
    .option("-m, --model <model>", "Model to use", DEFAULT_MODEL)
    .action(async (storeName: string, options: { model: string }) => {
      try {
        // Resolve store name
        const resolveSpinner = ora("Resolving store...").start();
        const fullStoreName = await resolveStoreName(storeName);
        resolveSpinner.stop();

        console.log(chalk.bold.cyan("Interactive Document Chat"));
        console.log(formatInfo(`Store: ${fullStoreName}`));
        console.log(formatInfo(`Model: ${options.model}`));
        console.log(formatInfo('Type "exit" or "quit" to end the session'));
        console.log(formatInfo('Type "clear" to clear chat history'));
        console.log();

        const readline = await import("readline");
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const chatHistory: Array<{ role: string; parts: Array<{ text: string }> }> = [];

        const askQuestion = () => {
          rl.question(chalk.green("You: "), async (input: string) => {
            const trimmedInput = input.trim();

            if (
              trimmedInput.toLowerCase() === "exit" ||
              trimmedInput.toLowerCase() === "quit"
            ) {
              console.log(chalk.yellow("\nGoodbye!"));
              rl.close();
              process.exit(0);
            }

            if (trimmedInput.toLowerCase() === "clear") {
              chatHistory.length = 0;
              console.log(chalk.yellow("Chat history cleared."));
              askQuestion();
              return;
            }

            if (!trimmedInput) {
              askQuestion();
              return;
            }

            // Add user message to history
            chatHistory.push({
              role: "user",
              parts: [{ text: trimmedInput }],
            });

            const spinner = ora("Thinking...").start();

            try {
              const response = await ai.models.generateContent({
                model: options.model,
                contents: chatHistory,
                config: {
                  tools: [
                    {
                      fileSearch: {
                        fileSearchStoreNames: [fullStoreName],
                      },
                    },
                  ],
                },
              });

              spinner.stop();

              const assistantMessage = response.text || "No response";

              // Add assistant response to history
              chatHistory.push({
                role: "model",
                parts: [{ text: assistantMessage }],
              });

              console.log(chalk.blue("\nAssistant: ") + assistantMessage);
              console.log();
            } catch (error: any) {
              spinner.stop();
              console.error(chalk.red(`\nError: ${error.message}`));
              // Remove the failed user message from history
              chatHistory.pop();
            }

            askQuestion();
          });
        };

        askQuestion();
      } catch (error: any) {
        console.error(formatError(error.message || String(error)));
        process.exit(1);
      }
    });
}

/**
 * Display citations from a response
 */
function displayCitations(response: any): void {
  try {
    // Try to extract grounding metadata from the response
    const candidates = response.candidates || [];
    
    for (const candidate of candidates) {
      const groundingMetadata = candidate.groundingMetadata;
      
      if (groundingMetadata?.groundingChunks) {
        for (const chunk of groundingMetadata.groundingChunks) {
          if (chunk.retrievedContext) {
            console.log(`  - ${chunk.retrievedContext.title || chunk.retrievedContext.uri || "Unknown source"}`);
          }
        }
      }
      
      if (groundingMetadata?.groundingSupports) {
        console.log("\n  Grounding Supports:");
        for (const support of groundingMetadata.groundingSupports) {
          if (support.segment?.text) {
            console.log(`    "${support.segment.text.substring(0, 100)}..."`);
          }
        }
      }
    }

    // Check for inline citations
    if (response.text?.includes("[")) {
      console.log("\n  (Citations may be embedded in the response text)");
    }
  } catch {
    console.log("  Unable to parse citations from response");
  }
}
