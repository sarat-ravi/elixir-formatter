import { languages, ExtensionContext } from "vscode";
import { workspace, Range, TextDocument, TextEdit, window } from "vscode";
import cp = require("child_process");
var path = require('path')

function fullDocumentRange(document: TextDocument): Range {
  const lastLineId = document.lineCount - 1;
  return new Range(0, 0, lastLineId, document.lineAt(lastLineId).text.length);
}

function format(document: TextDocument): Promise<TextEdit[]> {
  return new Promise((resolve, reject) => {
    // Create mix command
    const mixCommandPath: string = workspace.getConfiguration("elixir.formatter").get("mixCommandPath") || "mix";
    const mixFormatArgs: string = workspace.getConfiguration("elixir.formatter").get("mixFormatArgs") || "";
    const cmd = `${mixCommandPath} format ${mixFormatArgs} ${document.fileName}`;

    // Figure out the working directory to run mix format in
    const workspaceRootPath = workspace.rootPath ? workspace.rootPath : "";
    const relativePath: string = workspace.getConfiguration("elixir.formatter").get("formatterCwd") || "";
    const cwd = path.resolve(workspaceRootPath, relativePath);

    // Run the command
    cp.exec(
      cmd,
      {
        cwd
      },
      function(error, stdout, stderr) {
        if (error !== null) {
          const message = `Cannot format due to syntax errors.: ${stderr}`;
          window.showErrorMessage(message);
          return reject(message);
        } else {
          return [TextEdit.replace(fullDocumentRange(document), stdout)];
        }
      }
    );
  });
}

export function activate(context: ExtensionContext) {
  languages.registerDocumentFormattingEditProvider('elixir', {
    provideDocumentFormattingEdits(document: TextDocument): Thenable<TextEdit[]> {
      return document.save().then(() => {
        return format(document);
      });
    }
  });
}
