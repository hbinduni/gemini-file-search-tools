import ora from "ora";
import { ai, POLL_INTERVAL } from "../client.ts";

/**
 * Wait for an async operation to complete with a spinner
 */
export async function waitForOperation(
  operation: any,
  message: string = "Processing..."
): Promise<any> {
  const spinner = ora(message).start();

  try {
    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
      
      if (operation.name) {
        operation = await ai.operations.get({ operation });
      } else {
        break;
      }
    }

    if (operation.error) {
      spinner.fail(`Operation failed: ${operation.error.message || JSON.stringify(operation.error)}`);
      throw new Error(operation.error.message || "Operation failed");
    }

    spinner.succeed("Operation completed");
    return operation;
  } catch (error) {
    spinner.fail("Operation failed");
    throw error;
  }
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
