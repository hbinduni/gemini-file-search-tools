import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import { ai, MAX_DIRECT_UPLOAD_SIZE, CHUNK_SIZE, DEFAULT_MODEL } from "../client.ts";
import {
  formatSuccess,
  formatError,
  formatInfo,
  formatWarning,
  formatBytes,
  createTable,
  formatDate,
  truncateString,
} from "../utils/format.ts";
import { waitForOperation } from "../utils/operations.ts";
import { resolveStoreName } from "./store.ts";
import { basename } from "path";

export function registerFileCommands(program: Command): void {
  const file = program
    .command("file")
    .description("Manage files in File Search stores");

  // Upload file to store
  file
    .command("upload <storeName> <filePath>")
    .description("Upload a file to a File Search store (use Store ID or display name)")
    .option("-n, --name <displayName>", "Display name for the file")
    .option("--no-wait", "Don't wait for the upload to complete")
    .action(
      async (
        storeName: string,
        filePath: string,
        options: { name?: string; wait: boolean }
      ) => {
        try {
          // Get file info first
          const bunFile = Bun.file(filePath);
          const fileSize = bunFile.size;
          const fileName = options.name || basename(filePath);

          console.log(formatInfo(`File: ${filePath}`));
          console.log(formatInfo(`Size: ${formatBytes(fileSize)}`));
          console.log(formatInfo(`Display Name: ${fileName}`));
          console.log();

          // Resolve store name (supports ID or display name)
          const spinner = ora("Resolving store...").start();
          const fullStoreName = await resolveStoreName(storeName);
          spinner.text = "Uploading file...";

          // Check if we need chunked upload
          if (fileSize > MAX_DIRECT_UPLOAD_SIZE) {
            spinner.text = `Large file detected. Using chunked upload (${Math.ceil(fileSize / CHUNK_SIZE)} chunks)...`;

            // For large files, we use the Files API first, then import
            await uploadLargeFile(fullStoreName, filePath, fileName, spinner);
          } else {
            // Direct upload for smaller files
            let operation = await ai.fileSearchStores.uploadToFileSearchStore({
              file: filePath,
              fileSearchStoreName: fullStoreName,
              config: {
                displayName: fileName,
              },
            });

            spinner.succeed("File uploaded");

            if (options.wait && !operation.done) {
              operation = await waitForOperation(
                operation,
                "Processing file (chunking, indexing)..."
              );
            }
          }

          console.log(formatSuccess(`File "${fileName}" uploaded to store`));
        } catch (error: any) {
          console.error(formatError(error.message || String(error)));
          process.exit(1);
        }
      }
    );

  // Upload via Files API and import (alternative method)
  file
    .command("import <storeName> <filePath>")
    .description("Upload via Files API and import to store (for larger files)")
    .option("-n, --name <displayName>", "Display name for the file")
    .action(
      async (
        storeName: string,
        filePath: string,
        options: { name?: string }
      ) => {
        try {
          const fileName = options.name || basename(filePath);

          const bunFile = Bun.file(filePath);
          console.log(formatInfo(`File: ${filePath}`));
          console.log(formatInfo(`Size: ${formatBytes(bunFile.size)}`));
          console.log();

          // Resolve store name
          const resolveSpinner = ora("Resolving store...").start();
          const fullStoreName = await resolveStoreName(storeName);
          resolveSpinner.succeed(`Store: ${fullStoreName}`);

          // Step 1: Upload to Files API
          const spinner = ora("Uploading file to Files API...").start();
          const uploadedFile = await ai.files.upload({
            file: filePath,
            config: { displayName: fileName },
          });
          spinner.succeed(`File uploaded: ${uploadedFile.name}`);

          // Step 2: Import to File Search Store
          const importSpinner = ora(
            "Importing file to File Search store..."
          ).start();
          let operation = await ai.fileSearchStores.importFile({
            fileSearchStoreName: fullStoreName,
            fileName: uploadedFile.name!,
          });
          importSpinner.succeed("Import started");

          // Wait for operation to complete
          operation = await waitForOperation(
            operation,
            "Processing file (chunking, indexing)..."
          );

          console.log(formatSuccess(`File imported to store successfully`));
        } catch (error: any) {
          console.error(formatError(error.message || String(error)));
          process.exit(1);
        }
      }
    );

  // List files (via Files API - shows all uploaded files)
  file
    .command("list")
    .description("List all files in the Files API")
    .option("-l, --limit <number>", "Maximum number of files to list", "100")
    .action(async (options: { limit: string }) => {
      const spinner = ora("Fetching files...").start();
      try {
        const files = await ai.files.list({
          config: { pageSize: parseInt(options.limit) },
        });

        const fileList: any[] = [];
        for await (const f of files) {
          fileList.push(f);
        }

        spinner.stop();

        if (fileList.length === 0) {
          console.log("No files found.");
          return;
        }

        const table = createTable([
          "Name",
          "Display Name",
          "MIME Type",
          "Size",
          "State",
          "Created",
        ]);
        for (const f of fileList) {
          table.push([
            truncateString(f.name || "", 30),
            truncateString(f.displayName || "N/A", 20),
            f.mimeType || "N/A",
            f.sizeBytes ? formatBytes(Number(f.sizeBytes)) : "N/A",
            f.state || "N/A",
            formatDate(f.createTime),
          ]);
        }
        console.log(table.toString());
        console.log(`\nTotal: ${fileList.length} file(s)`);
      } catch (error: any) {
        spinner.fail("Failed to list files");
        console.error(formatError(error.message || String(error)));
        process.exit(1);
      }
    });

  // Get file details
  file
    .command("get <name>")
    .description("Get details of a file")
    .action(async (name: string) => {
      const spinner = ora("Fetching file details...").start();
      try {
        const fileName = name.startsWith("files/") ? name : `files/${name}`;
        const fileInfo = await ai.files.get({ name: fileName });
        spinner.stop();

        console.log("\nFile Details:");
        console.log(`  Name: ${fileInfo.name}`);
        console.log(`  Display Name: ${fileInfo.displayName || "N/A"}`);
        console.log(`  MIME Type: ${fileInfo.mimeType || "N/A"}`);
        console.log(
          `  Size: ${fileInfo.sizeBytes ? formatBytes(Number(fileInfo.sizeBytes)) : "N/A"}`
        );
        console.log(`  State: ${fileInfo.state || "N/A"}`);
        console.log(`  URI: ${fileInfo.uri || "N/A"}`);
        console.log(`  Created: ${formatDate(fileInfo.createTime)}`);
        console.log(`  Expires: ${formatDate(fileInfo.expirationTime)}`);
      } catch (error: any) {
        spinner.fail("Failed to get file details");
        console.error(formatError(error.message || String(error)));
        process.exit(1);
      }
    });

  // Delete file
  file
    .command("delete <name>")
    .description("Delete a file from the Files API")
    .action(async (name: string) => {
      const spinner = ora("Deleting file...").start();
      try {
        const fileName = name.startsWith("files/") ? name : `files/${name}`;
        await ai.files.delete({ name: fileName });
        spinner.succeed("File deleted");
        console.log(formatSuccess(`File "${name}" deleted successfully`));
      } catch (error: any) {
        spinner.fail("Failed to delete file");
        console.error(formatError(error.message || String(error)));
        process.exit(1);
      }
    });

  // List files in a store (using AI query)
  file
    .command("list-in-store <storeName>")
    .alias("ls")
    .description("List files indexed in a File Search store (uses AI to retrieve)")
    .action(async (storeName: string) => {
      try {
        const resolveSpinner = ora("Resolving store...").start();
        const fullStoreName = await resolveStoreName(storeName);
        resolveSpinner.succeed(`Store: ${fullStoreName}`);

        const spinner = ora("Querying store for indexed files...").start();

        const response = await ai.models.generateContent({
          model: DEFAULT_MODEL,
          contents: `List ALL the files/documents that are available in this file search store. 
                     For each file, provide:
                     - File name
                     - Brief description of content (1 sentence)
                     
                     Format as a numbered list. If no files are found, say "No files found in store."`,
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

        console.log(chalk.bold.cyan("\nFiles in Store:"));
        console.log();
        console.log(response.text || "Unable to retrieve file list");
        console.log();
        console.log(chalk.gray("Note: This list is generated by AI based on indexed content."));
        console.log(chalk.gray("The File Search API does not provide a direct file listing endpoint."));
      } catch (error: any) {
        console.error(formatError(error.message || String(error)));
        process.exit(1);
      }
    });

  // Show store content summary
  file
    .command("summary <storeName>")
    .description("Get a summary of all content in a File Search store")
    .action(async (storeName: string) => {
      try {
        const resolveSpinner = ora("Resolving store...").start();
        const fullStoreName = await resolveStoreName(storeName);
        resolveSpinner.succeed(`Store: ${fullStoreName}`);

        const spinner = ora("Analyzing store content...").start();

        const response = await ai.models.generateContent({
          model: DEFAULT_MODEL,
          contents: `Provide a comprehensive summary of ALL content in this file search store:
                     1. List all documents/files with their names
                     2. Main topics covered
                     3. Key information highlights
                     4. Total estimated document count
                     
                     Be thorough and include everything you can find.`,
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

        console.log(chalk.bold.cyan("\nStore Content Summary:"));
        console.log();
        console.log(response.text || "Unable to generate summary");
      } catch (error: any) {
        console.error(formatError(error.message || String(error)));
        process.exit(1);
      }
    });

  // Info about file management limitations
  file
    .command("help-store")
    .description("Show information about file management in stores")
    .action(() => {
      console.log(chalk.bold.cyan("\nFile Management in File Search Stores"));
      console.log();
      console.log(chalk.yellow("Current API Limitations:"));
      console.log();
      console.log("  The Gemini File Search API has the following limitations:");
      console.log();
      console.log(`  ${chalk.red("✗")} List files in a store    - Not directly supported`);
      console.log(`  ${chalk.red("✗")} Delete file from store   - Not supported`);
      console.log(`  ${chalk.red("✗")} Update file in store     - Not supported`);
      console.log(`  ${chalk.green("✓")} Delete entire store      - Supported (store delete --force)`);
      console.log(`  ${chalk.green("✓")} List Files API uploads   - Supported (file list)`);
      console.log();
      console.log(chalk.yellow("Workarounds:"));
      console.log();
      console.log("  1. To see files in a store:");
      console.log(chalk.gray("     bun run start file list-in-store <store-name>"));
      console.log("     (Uses AI to query what files are indexed)");
      console.log();
      console.log("  2. To 'update' a file:");
      console.log("     - Delete the store and recreate it");
      console.log("     - Re-upload all files including the updated one");
      console.log();
      console.log("  3. To 'delete' a file from store:");
      console.log("     - Delete the store and recreate it");
      console.log("     - Re-upload only the files you want to keep");
      console.log();
      console.log(chalk.yellow("Files API vs Store:"));
      console.log();
      console.log("  - Files API uploads expire after 48 hours");
      console.log("  - Data imported into stores persists indefinitely");
      console.log("  - 'file list' shows Files API uploads (temporary)");
      console.log("  - 'file list-in-store' queries indexed store content");
      console.log();
    });
}

/**
 * Upload a large file using chunked upload via Files API and import
 */
async function uploadLargeFile(
  storeName: string,
  filePath: string,
  displayName: string,
  spinner: ReturnType<typeof ora>
): Promise<void> {
  const bunFile = Bun.file(filePath);
  const fileSize = bunFile.size;
  const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

  spinner.text = `Uploading large file (${totalChunks} chunks)...`;

  // For very large files, we still use the standard upload
  // The SDK handles resumable uploads internally
  const uploadedFile = await ai.files.upload({
    file: filePath,
    config: { displayName },
  });

  spinner.succeed(`File uploaded: ${uploadedFile.name}`);

  // Import to File Search Store
  spinner.start("Importing to File Search store...");
  let operation = await ai.fileSearchStores.importFile({
    fileSearchStoreName: storeName,
    fileName: uploadedFile.name!,
  });

  spinner.succeed("Import started");

  // Wait for operation
  await waitForOperation(operation, "Processing file (chunking, indexing)...");
}
