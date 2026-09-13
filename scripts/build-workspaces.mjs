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

export class WorkspaceBuildError extends Error {
	constructor(buildName, reason, output) {
		super(`${buildName} failed with ${reason}`);
		this.name = "WorkspaceBuildError";
		this.buildName = buildName;
		this.output = output;
	}
}

function runCommand(build, signal, quiet) {
	return new Promise((resolve, reject) => {
		const output = [];
		const child = spawn(build.command, build.args, {
			signal,
			stdio: quiet ? ["ignore", "pipe", "pipe"] : "inherit",
		});
		child.stdout?.on("data", (chunk) => output.push(chunk));
		child.stderr?.on("data", (chunk) => output.push(chunk));
		child.on("error", (error) => {
			reject(new WorkspaceBuildError(build.name, error.message, error.stack ?? error.message));
		});
		child.on("close", (code, exitSignal) => {
			if (code === 0) {
				resolve();
				return;
			}
			const reason = exitSignal ? `signal ${exitSignal}` : `exit code ${code ?? 1}`;
			reject(new WorkspaceBuildError(build.name, reason, Buffer.concat(output).toString("utf8")));
		});
	});
}

export async function runWorkspaceBuilds({ builds = workspaceBuilds, quiet = false } = {}) {
	const buildByName = new Map(builds.map((build) => [build.name, build]));
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
			if (!quiet) console.log(`\n[build] ${build.name}`);
			const startedAt = performance.now();
			try {
				await runCommand(build, controller.signal, quiet);
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
		return await Promise.all(builds.map(runBuild));
	} catch (error) {
		throw firstError ?? error;
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const args = new Set(process.argv.slice(2));
	try {
		for (const argument of args) {
			if (argument !== "--pretty") throw new Error(`Unknown argument: ${argument}`);
		}
		const pretty = args.has("--pretty");
		const startedAt = performance.now();
		if (pretty) console.log(`Building Tau harness for ${process.platform}-${process.arch}...`);
		await runWorkspaceBuilds({ quiet: pretty });
		if (pretty) console.log(`Finished building Tau harness in ${((performance.now() - startedAt) / 1000).toFixed(2)}s.`);
	} catch (error) {
		if (args.has("--pretty") && error instanceof WorkspaceBuildError) {
			console.error(`Build failed while building ${error.buildName}.`);
			if (error.output.trim()) console.error(`\n${error.output.trimEnd()}`);
		} else {
			console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
		}
		process.exitCode = 1;
	}
}
