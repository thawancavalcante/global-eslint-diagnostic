const vscode = require("vscode");
const { ESLint } = require("eslint");
const path = require("path");
const fs = require("fs");

function updateWorkspaceSettingsWithEslintState(enable = true) {
    const settingsPath = path.join(
        vscode.workspace.workspaceFolders[0].uri.fsPath,
        ".vscode",
        "settings.json"
    );

    let settings = {};
    if (fs.existsSync(settingsPath)) {
        const settingsContent = fs.readFileSync(settingsPath, "utf-8");
        settings = JSON.parse(settingsContent);
    }

    if (enable) {
        settings["eslint.enable"] = enable;
    } else {
        delete settings["eslint.enable"];
    }

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

let disabledEslintExtension = false;
function setEslintExtensionState(state = true) {
    const eslintExtensionId = 'dbaeumer.vscode-eslint';
    const eslintExtension = vscode.extensions.getExtension(eslintExtensionId);

    if (eslintExtension) {
        if (eslintExtension.isActive) {
            if (!state) {
                vscode.window
                    .showInformationMessage("Do you want to disable the ESLint extension while using the Global ESLint Diagnostic?", "Yes", "No")
                    .then(answer => {
                        if (answer === "Yes") {
                            disabledEslintExtension = true
                            updateWorkspaceSettingsWithEslintState(true)
                            vscode.window.showInformationMessage('The ESLint extension was disabled');
                        }
                    })
            } else if (disabledEslintExtension) {
                updateWorkspaceSettingsWithEslintState(false)
                vscode.window.showInformationMessage('The ESLint extension was enabled');
            }
        }
    }
}

async function runEslintOnProject(diagnosticCollection) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage("No workspace is open.");
        return;
    }

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
}

function activate(context) {
    setEslintExtensionState(false);
    const diagnosticCollection =
        vscode.languages.createDiagnosticCollection("eslintDiagnostics");
    context.subscriptions.push(diagnosticCollection);

    const enableEslintDiagnosticCommand = vscode.commands.registerCommand(
        "extension.enableEslintDiagnosticCommand",
        async () => {
            await runEslintOnProject(diagnosticCollection);
        }
    );
    context.subscriptions.push(enableEslintDiagnosticCommand);

    const disableEslintDiagnosticCommand = vscode.commands.registerCommand(
        "extension.disableEslintDiagnosticCommand",
        async () => {
            diagnosticCollection.clear();
            setEslintExtensionState(true);
        }
    );
    context.subscriptions.push(disableEslintDiagnosticCommand);

    vscode.workspace.onDidSaveTextDocument(async () => {
        await runEslintOnProject(diagnosticCollection);
    });
}

function deactivate() {
    setEslintExtensionState(true);
}

module.exports = {
    activate,
    deactivate,
};
