// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as childProcess from 'node:child_process';
import {Neovim, NeovimClient, attach, findNvim} from 'neovim';
import * as mc from './vscode-neovim/src/main_controller';
import * as vsc from './vscode-neovim/src/utils';

var nvimClient: NeovimClient | undefined = undefined;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	async function tryGetVscodeNeovim() {
		await vscode.commands.executeCommand("_getNeovimClient").then((res) => {
			nvimClient = res as NeovimClient;
		}); 
	}

	await tryGetVscodeNeovim();

	context.subscriptions.push(vscode.commands.registerCommand('vscode-neovim-registers.toggleHide', async () => {
		let setting = vscode.workspace.getConfiguration('vscode-neovim-registers');
		if (setting.get('hideOnPick')) { setting.update('hideOnPick', false); }
		else { setting.update('hideOnPick', true); }
	}));

	context.subscriptions.push(vscode.commands.registerCommand('vscode-neovim-registers.showRegisters', async () => { 
		let registers = await getRegisters(false);

		let items = new Array<RegisterQuickPickItem>();
		for (let r of registers) {
			let item = new RegisterQuickPickItem();
			item.label = r.split('\t|\t')[0];
			item.detail = r.split('\t|\t')[1];
			items.push(item);
		}

		let pick = vscode.window.createQuickPick();
		pick.placeholder = "Start typing to search your registers...";
		pick.items = items;

		pick.onDidAccept(() => {
			let item = pick.selectedItems[0];
			let editor = vscode.window.activeTextEditor!
			let edit = new vscode.WorkspaceEdit();
			edit.insert(editor.document.uri, editor.selection.start, item.detail!);
			vscode.workspace.applyEdit(edit);
			let hide = vscode.workspace.getConfiguration('vscode-neovim-registers').get('hideOnPick');
			if (hide) { pick.hide(); }
		});
		
		pick.onDidHide(() => {
			pick.dispose();
		});
		pick.show();

	}));

	//IMPL: Implement additional functionality for testing other methods of displaying

	context.subscriptions.push(vscode.commands.registerCommand('vscode-neovim-registers.showRegistersInline', async () => {
		let registers = await getRegisters(true);
		let languages = await vscode.languages.getLanguages();

		// let provider = new RegisterActionProvider();

		//TODO: Implement a fix for ActionProvider to test if this solution will work

		for (let reg of registers) {
			// provider.validFixes = provider.createFix()
		}

		for (let lan of languages) {
			let selector = { language: lan };
			// let provider = new RegisterActionProvider();

			//vscode.languages.registerCodeActionsProvider(selector, new RegisterActionProvider())
		}

		let text = await vscode.workspace.openTextDocument({
			content: registers.join('\n')
		}).then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
	}));
}

// This method is called when your extension is deactivated
export async function deactivate() {}

export class RegisterQuickPickItem implements vscode.QuickPickItem {
	public detail?: string | undefined;
	public label: string = '';
}

/* export class RegisterActionProvider implements vscode.CodeActionProvider {
	public static readonly providedCodeActionKinds = [vscode.CodeActionKind.RefactorExtract];

	validFixes: Array<vscode.CodeAction> = new Array<vscode.CodeAction>();

	public RegisterActionProvider(registers: Array<string>) {
		for (let r of registers) {
		}
	}

	public provideCodeActions(
		document: vscode.TextDocument,
		range: vscode.Range | vscode.Selection,
		context: vscode.CodeActionContext,
		token: vscode.CancellationToken
	): {};

	public createFix(
		document: vscode.TextDocument,
		range: vscode.Range,
		line: string
	): vscode.CodeAction {
		const fix = new vscode.CodeAction('');
		return fix;
	}
} */

async function getRegisters(clean: boolean = false) {
	let cmd_out = await nvimClient!.commandOutput('reg');
	let dirtyRegisters = cmd_out.split('\n').slice(1);
	let registers: Array<string> = new Array<string>();

	if (clean === false) {
		for (let r of dirtyRegisters) {
			let find = r.substring(6, 7);
			if (Number(find)) {
				registers.push(
					'$(symbol-number)\t' + r.substring(5, 9) + '\t|\t' + r.substring(9).trimStart()
				);
			} else if (find.match(/[a-z]/i)) {
				registers.push(
					'$(case-sensitive)\t' + r.substring(5, 9) + '\t|\t' + r.substring(9).trimStart()
				);
			} else {
				registers.push(
					'$(chip)\t' + r.substring(5, 9) + '\t|\t' + r.substring(9).trimStart()
				);
			}
		}
	}
	else {
		for (let r of dirtyRegisters) {
			registers.push(r.substring(5, 9) + '\t|\t' + r.substring(9).trimStart());
		}
	}

	return registers;
}
