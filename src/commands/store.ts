import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import { ai } from "../client.ts";
import {
  formatSuccess,
  formatError,
  createTable,
  formatDate,
  formatBytes,
} from "../utils/format.ts";

/**
 * Extract store ID from full name (e.g., "fileSearchStores/abc123" -> "abc123")
 */
function extractStoreId(fullName: string): string {
  return fullName.replace("fileSearchStores/", "");
}

/**
 * Find a store by display name (case-insensitive partial match)
 */
async function findStoreByDisplayName(displayName: string): Promise<string | null> {
  const stores = await ai.fileSearchStores.list({ config: { pageSize: 20 } });
  const lowerName = displayName.toLowerCase();
  
  for await (const store of stores) {
    if (store.displayName?.toLowerCase().includes(lowerName)) {
      return store.name || null;
    }
  }
  return null;
}

/**
 * Resolve store name - handles full names, IDs, or display names
 */
export async function resolveStoreName(input: string): Promise<string> {
  // Already a full name
  if (input.startsWith("fileSearchStores/")) {
    return input;
  }
  
  // Try as direct ID first
  const directName = `fileSearchStores/${input}`;
  try {
    await ai.fileSearchStores.get({ name: directName });
    return directName;
  } catch {
    // Not found by ID, try by display name
  }
  
  // Try finding by display name
  const foundName = await findStoreByDisplayName(input);
  if (foundName) {
    return foundName;
  }
  
  // Return the direct name anyway, let the API give the error
  return directName;
}

export function registerStoreCommands(program: Command): void {
  const store = program
    .command("store")
    .description("Manage File Search stores");

  // Create store
  store
    .command("create <name>")
    .description("Create a new File Search store")
    .action(async (name: string) => {
      const spinner = ora("Creating File Search store...").start();
      try {
        const store = await ai.fileSearchStores.create({
          config: { displayName: name },
        });
        spinner.succeed("File Search store created");
        
        const storeId = extractStoreId(store.name || "");
        
        console.log(formatSuccess(`Store created successfully`));
        console.log();
        console.log(`  ${chalk.gray("Full Name:")}   ${store.name}`);
        console.log(`  ${chalk.gray("Store ID:")}    ${chalk.cyan(storeId)}`);
        console.log(`  ${chalk.gray("Display Name:")} ${name}`);
        console.log();
        console.log(chalk.yellow("Use the Store ID for file uploads and queries:"));
        console.log(chalk.gray(`  bun run start file upload ${storeId} ./your-file.txt`));
        console.log(chalk.gray(`  bun run start query ${storeId} "your question"`));
      } catch (error: any) {
        spinner.fail("Failed to create store");
        console.error(formatError(error.message || String(error)));
        process.exit(1);
      }
    });

  // List stores
  store
    .command("list")
    .description("List all File Search stores")
    .option("-l, --limit <number>", "Maximum number of stores to list (max 20)", "20")
    .action(async (options: { limit: string }) => {
      const spinner = ora("Fetching File Search stores...").start();
      try {
        const pageSize = Math.min(parseInt(options.limit), 20); // API max is 20
        const stores = await ai.fileSearchStores.list({
          config: { pageSize },
        });

        const storeList: any[] = [];
        for await (const s of stores) {
          storeList.push(s);
        }

        spinner.stop();

        if (storeList.length === 0) {
          console.log("No File Search stores found.");
          return;
        }

        const table = createTable(["Store ID", "Display Name", "Documents", "Size", "Created"]);
        for (const s of storeList) {
          const storeData = s as Record<string, any>;
          table.push([
            chalk.cyan(extractStoreId(s.name || "")),
            s.displayName || "N/A",
            storeData.activeDocumentsCount || "0",
            storeData.sizeBytes ? formatBytes(Number(storeData.sizeBytes)) : "0 Bytes",
            formatDate(s.createTime),
          ]);
        }
        console.log(table.toString());
        console.log(`\nTotal: ${storeList.length} store(s)`);
        console.log(chalk.gray("\nUse Store ID or Display Name for file uploads and queries."));
      } catch (error: any) {
        spinner.fail("Failed to list stores");
        console.error(formatError(error.message || String(error)));
        process.exit(1);
      }
    });

  // Get store details
  store
    .command("get <name>")
    .description("Get details of a File Search store (by ID or display name)")
    .action(async (name: string) => {
      const spinner = ora("Fetching store details...").start();
      try {
        const storeName = await resolveStoreName(name);
        const storeInfo = await ai.fileSearchStores.get({ name: storeName });
        spinner.stop();

        const storeId = extractStoreId(storeInfo.name || "");

        console.log("\nStore Details:");
        console.log(`  ${chalk.gray("Full Name:")}    ${storeInfo.name}`);
        console.log(`  ${chalk.gray("Store ID:")}     ${chalk.cyan(storeId)}`);
        console.log(`  ${chalk.gray("Display Name:")} ${storeInfo.displayName || "N/A"}`);
        console.log(`  ${chalk.gray("Created:")}      ${formatDate(storeInfo.createTime)}`);
        console.log(`  ${chalk.gray("Updated:")}      ${formatDate(storeInfo.updateTime)}`);

        // Show storage info (these fields exist but aren't in TypeScript types)
        const storeData = storeInfo as Record<string, any>;
        console.log();
        console.log(chalk.bold("  Storage Info:"));
        console.log(`  ${chalk.gray("Documents:")}    ${storeData.activeDocumentsCount || "0"}`);
        console.log(`  ${chalk.gray("Size:")}         ${storeData.sizeBytes ? formatBytes(Number(storeData.sizeBytes)) : "0 Bytes"}`);
      } catch (error: any) {
        spinner.fail("Failed to get store details");
        console.error(formatError(error.message || String(error)));
        process.exit(1);
      }
    });

  // Delete store
  store
    .command("delete <name>")
    .description("Delete a File Search store (by ID or display name)")
    .option("-f, --force", "Force delete even if store contains files")
    .action(async (name: string, options: { force?: boolean }) => {
      const spinner = ora("Resolving store...").start();
      try {
        const storeName = await resolveStoreName(name);
        spinner.text = "Deleting File Search store...";
        
        await ai.fileSearchStores.delete({
          name: storeName,
          config: { force: options.force ?? false },
        });
        spinner.succeed("File Search store deleted");
        console.log(formatSuccess(`Store "${extractStoreId(storeName)}" deleted successfully`));
      } catch (error: any) {
        spinner.fail("Failed to delete store");
        console.error(formatError(error.message || String(error)));
        process.exit(1);
      }
    });
}
