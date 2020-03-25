import * as path from "path";

import { ExtensionContext, languages, window } from "vscode";
import { Range, TextDocument, TextEdit, workspace } from "vscode";

import { spawn } from "child_process";

function fullDocumentRange(document: TextDocument): Range {
  const lastLineId = document.lineCount - 1;
  return new Range(0, 0, lastLineId, document.lineAt(lastLineId).text.length);
}

function helpfulMixErrorMessage(error: any): string {
  if (error.code === "ENOENT") {
    return (
      "mix command not found. It was expected to be in $PATH: " +
      process.env.PATH +
      ". Note that VSCode is running in an environment different from your terminal, " +
      "and it doesn't read your shell rc files."
    );
  }
  // Get rid of standard header to leave space in the error popup
  // for the actual line number
  return error.message.replace("mix format failed for stdin\n", "");
}

function format(document: TextDocument): Promise<string> {
  return new Promise((resolve, reject) => {
    // Create mix command
    const mixFormatArgsSetting: string = workspace
      .getConfiguration("elixir.formatter")
      .get("mixFormatArgs");
    const mixFormatArgs =
      typeof mixFormatArgsSetting === "string" && mixFormatArgsSetting !== ""
        ? mixFormatArgsSetting.split(" ")
        : [];

    // Figure out the working directory to run mix format in
    const workspaceRootPath = workspace.rootPath ? workspace.rootPath : "";
    const relativePath: string =
      workspace.getConfiguration("elixir.formatter").get("formatterCwd") || "";
    const cwd = path.resolve(workspaceRootPath, relativePath);

    const proc = spawn("mix", ["format", ...mixFormatArgs, "-"], { cwd });
    proc.on("error", reject);

    // If process fails to start, write syscall will fail synchronously and
    // will mask the original error message. Let's postpone writing until
    // all event handlers are setup and NodeJS had a chance to call the
    // on("error") callback.
    process.nextTick(() => {
      proc.stdin.write(document.getText(), "utf8", error =>
        error ? "reject(error)" : proc.stdin.end()
      );
    });

    const stdout = [];
    const stderr = [];
    proc.stdout.setEncoding("utf8");
    proc.stderr.setEncoding("utf8");
    proc.stdout.on("data", data => stdout.push(data));
    proc.stderr.on("data", data => stderr.push(data));

    proc.on("exit", code => {
      if (code === 0) {
        resolve(stdout.join(""));
      } else {
        const error: any = new Error(stderr.join(""));
        error.code = code;
        reject(error);
      }
    });
  });
}

export function activate(context: ExtensionContext) {
  languages.registerDocumentFormattingEditProvider("elixir", {
    provideDocumentFormattingEdits(
      document: TextDocument
    ): Thenable<TextEdit[]> {
      return format(document).then(
        formatted => {
          return [TextEdit.replace(fullDocumentRange(document), formatted)];
        },
        error => {
          window.showErrorMessage(helpfulMixErrorMessage(error));
          throw error;
        }
      );
    }
  });
}
