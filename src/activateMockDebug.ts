'use strict';

import * as vscode from 'vscode';
import { FileAccessor } from './txnGroupWalkerRuntime';
import { TEALDebugAdapterDescriptorFactory } from './extension';
import { TealDebugConfigProvider } from './configuration';

export function activateTealDebug(context: vscode.ExtensionContext, factory: TEALDebugAdapterDescriptorFactory, config: vscode.DebugConfiguration) {

	context.subscriptions.push(
		vscode.commands.registerCommand('extension.teal-debug.runEditorContents', (resource: vscode.Uri) => {
			let targetResource = resource;
			if (!targetResource && vscode.window.activeTextEditor) {
				targetResource = vscode.window.activeTextEditor.document.uri;
			}
			if (targetResource) {
				// NOTE: SORRY FORCE TYPECAST
				let localConfig: vscode.DebugConfiguration = config;
				localConfig.name = 'Run File';
				localConfig.program = targetResource.fsPath;

				vscode.debug.startDebugging(undefined, localConfig,
					{ noDebug: true }
				);
			}
		}),
		vscode.commands.registerCommand('extension.teal-debug.debugEditorContents', (resource: vscode.Uri) => {
			let targetResource = resource;
			if (!targetResource && vscode.window.activeTextEditor) {
				targetResource = vscode.window.activeTextEditor.document.uri;
			}
			if (targetResource) {
				// NOTE: SORRY FORCE TYPECAST
				let localConfig: vscode.DebugConfiguration = config;
				localConfig.name = 'Debug File';
				localConfig.program = targetResource.fsPath;

				vscode.debug.startDebugging(undefined, localConfig);
			}
		})
	);

	// register a configuration provider for 'teal' debug type
	const provider = new TealDebugConfigProvider();
	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('teal', provider));

	context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('teal', factory));
	// https://vscode-docs.readthedocs.io/en/stable/extensions/patterns-and-principles/#events
	// see events, by the end of subscription, call `dispose()` to release resource.
	context.subscriptions.push(factory);

	// override VS Code's default implementation of the debug hover
	// here we match only Mock "variables", that are words starting with an '$'
	context.subscriptions.push(vscode.languages.registerEvaluatableExpressionProvider('markdown', {
		provideEvaluatableExpression(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.EvaluatableExpression> {

			const VARIABLE_REGEXP = /\$[a-z][a-z0-9]*/ig;
			const line = document.lineAt(position.line).text;

			let m: RegExpExecArray | null;
			while (m = VARIABLE_REGEXP.exec(line)) {
				const varRange = new vscode.Range(position.line, m.index, position.line, m.index + m[0].length);

				if (varRange.contains(position)) {
					return new vscode.EvaluatableExpression(varRange);
				}
			}
			return undefined;
		}
	}));
}

export const workspaceFileAccessor: FileAccessor = {
	isWindows: false,
	async readFile(path: string): Promise<Uint8Array> {
		let uri: vscode.Uri;
		try {
			uri = pathToUri(path);
		} catch (e) {
			return new TextEncoder().encode(`cannot read '${path}'`);
		}

		return await vscode.workspace.fs.readFile(uri);
	},
	async writeFile(path: string, contents: Uint8Array) {
		await vscode.workspace.fs.writeFile(pathToUri(path), contents);
	}
};

function pathToUri(path: string) {
	try {
		return vscode.Uri.file(path);
	} catch (e) {
		return vscode.Uri.parse(path);
	}
}
