import chalk from "chalk";
import Table from "cli-table3";

export function formatError(message: string): string {
  return chalk.red(`Error: ${message}`);
}

export function formatSuccess(message: string): string {
  return chalk.green(`Success: ${message}`);
}

export function formatInfo(message: string): string {
  return chalk.blue(message);
}

export function formatWarning(message: string): string {
  return chalk.yellow(`Warning: ${message}`);
}

export function createTable(headers: string[]): Table.Table {
  return new Table({
    head: headers.map((h) => chalk.cyan(h)),
    style: { head: [], border: [] },
  });
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function formatDate(date: Date | string | undefined): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString();
}

export function truncateString(str: string, maxLength: number = 50): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + "...";
}
