const path = require("path");
const vscode = require("vscode");
const { ESLint } = require("eslint");
const StatusBarItem = require("./StatusBarItem");

const statusBar = new StatusBarItem();

function showEslintExtensionWarning() {
    const eslintExtensionId = 'dbaeumer.vscode-eslint';
    const eslintExtension = vscode.extensions.getExtension(eslintExtensionId);

    if (eslintExtension && eslintExtension.isActive) {
        vscode.window.showWarningMessage('The ESLint is active and may conflict with this extension. Consider disabling it.');
    }
}

async function runEslintOnProject(diagnosticCollection) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage("No workspace is open.");
        return;
    }

    showEslintExtensionWarning();

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Window,
        cancellable: false,
        title: 'Running Global ESLint Diagnostic',
    }, async (progress) => {
        statusBar.hide();
        progress.report({ increment: 0 });

        const projectPath = workspaceFolders[0].uri.fsPath;
        const eslint = new ESLint()
        const results = await eslint.lintFiles([path.join(projectPath, "**/*.{js,jsx,ts,tsx}")]);

        const diagnosticsMap = new Map();

        results.forEach((result) => {
            const diagnostics = result.messages.map((item) => {
                const range = new vscode.Range(
                    new vscode.Position(item.line - 1, item.column - 1),
                    item.endLine
                        ? new vscode.Position(item.endLine - 1, item.endColumn - 1)
                        : new vscode.Position(item.line - 1, item.column)
                );
                return new vscode.Diagnostic(
                    range,
                    item.message,
                    item.severity === 2
                        ? vscode.DiagnosticSeverity.Error
                        : vscode.DiagnosticSeverity.Warning
                );
            });

            const uri = vscode.Uri.file(result.filePath);
            diagnosticsMap.set(uri, diagnostics);
        });

        diagnosticsMap.forEach((diagnostics, uri) => {
            diagnosticCollection.set(uri, diagnostics);
        });

        statusBar.change(true);

        progress.report({ increment: 100 });
    });

}

let onDidSaveTextDocumentDisposable;
function activate(context) {
    const diagnosticCollection = vscode.languages.createDiagnosticCollection("eslintDiagnostics");
    context.subscriptions.push(diagnosticCollection);

    const enableCommand = vscode.commands.registerCommand(
        "extension.global-eslint-diagnostic.enable",
        async () => {
            onDidSaveTextDocumentDisposable = vscode.workspace.onDidSaveTextDocument(async () => {
                await runEslintOnProject(diagnosticCollection);
            });

            runEslintOnProject(diagnosticCollection)
        }
    );
    context.subscriptions.push(enableCommand);

    const disableCommand = vscode.commands.registerCommand(
        "extension.global-eslint-diagnostic.disable",
        async () => {
            onDidSaveTextDocumentDisposable.dispose();
            onDidSaveTextDocumentDisposable = undefined;
            statusBar.change(false);
            diagnosticCollection.clear();
        }
    );
    context.subscriptions.push(disableCommand);
}

function deactivate() {
    statusBar.change(false);
}

module.exports = {
    activate,
    deactivate,
};
