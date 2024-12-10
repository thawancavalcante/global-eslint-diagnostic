const vscode = require("vscode");

module.exports = class StatusBarItem {
    constructor() {
        this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this.change();
    }

    change(isActivated = false) {
        if (isActivated) {
            this.statusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.background');
            this.statusBar.text = "Global Diagnostic";
            this.statusBar.tooltip = "Disable Global ESLint Diagnostic";
            this.statusBar.command = "extension.global-eslint-diagnostic.disable";
        } else {
            this.statusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            this.statusBar.text = "Global Diagnostic";
            this.statusBar.tooltip = "Enable Global ESLint Diagnostic";
            this.statusBar.command = "extension.global-eslint-diagnostic.enable";
        }

        this.statusBar.show();
    }

    hide() {
        this.statusBar.hide();
    }
}