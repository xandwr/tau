#!/usr/bin/env node

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const npmCli = process.env.npm_execpath ?? join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
const npmCommand = process.platform === "win32" ? process.execPath : "npm";
const npmArgs = (...args) => (process.platform === "win32" ? [npmCli, ...args] : args);
const npmBuild = (name, prefix, dependencies = [], script = "build") => ({
	name,
	command: npmCommand,
	args: npmArgs("--prefix", prefix, "run", script),
	dependencies,
});

export const workspaceBuilds = [
	npmBuild("chord", "packages/chord"),
	npmBuild("tui", "packages/tui"),
	npmBuild("telemetry", "packages/telemetry"),
	npmBuild("ai", "packages/ai", ["telemetry"], "build:offline"),
	npmBuild("agent", "packages/agent", ["chord", "telemetry", "ai"]),
	npmBuild("session-backend:sqlite-node", "packages/session-backends/sqlite-node", ["ai", "agent"]),
	npmBuild("protocol", "packages/protocol", ["chord"]),
	npmBuild("client", "packages/client", ["chord", "protocol"]),
	npmBuild("server", "packages/server", ["chord", "agent", "protocol"]),
	npmBuild("coding-agent:compile", "packages/coding-agent", ["chord", "tui", "ai", "agent"], "build:unbundled"),
	{
		name: "coding-agent:bundle",
		command: process.execPath,
		args: ["scripts/build-coding-agent-bundle.mjs"],
		dependencies: ["coding-agent:compile"],
	},
];

function runCommand(build, signal) {
	return new Promise((resolve, reject) => {
		const child = spawn(build.command, build.args, { signal, stdio: "inherit" });
		child.on("error", reject);
		child.on("exit", (code, exitSignal) => {
			if (code === 0) {
				resolve();
				return;
			}
			const reason = exitSignal ? `signal ${exitSignal}` : `exit code ${code ?? 1}`;
			reject(new Error(`${build.name} failed with ${reason}`));
		});
	});
}

export async function runWorkspaceBuilds() {
	const buildByName = new Map(workspaceBuilds.map((build) => [build.name, build]));
	const promises = new Map();
	const controller = new AbortController();
	let firstError;

	function runBuild(build) {
		const existing = promises.get(build.name);
		if (existing) return existing;

		const promise = Promise.all(
			build.dependencies.map((dependency) => {
				const dependencyBuild = buildByName.get(dependency);
				if (!dependencyBuild) throw new Error(`${build.name} has unknown dependency ${dependency}`);
				return runBuild(dependencyBuild);
			}),
		).then(async () => {
			if (firstError) throw firstError;
			console.log(`\n[build] ${build.name}`);
			const startedAt = performance.now();
			try {
				await runCommand(build, controller.signal);
			} catch (error) {
				if (!firstError) {
					firstError = error instanceof Error ? error : new Error(String(error));
					controller.abort();
				}
				throw firstError;
			}
			const result = { name: build.name, milliseconds: performance.now() - startedAt };
			return result;
		});

		promises.set(build.name, promise);
		return promise;
	}

	try {
		return await Promise.all(workspaceBuilds.map(runBuild));
	} catch (error) {
		throw firstError ?? error;
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	try {
		await runWorkspaceBuilds();
	} catch (error) {
		console.error(`\n${error instanceof Error ? error.message : String(error)}`);
		process.exitCode = 1;
	}
}
