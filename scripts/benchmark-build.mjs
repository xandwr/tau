#!/usr/bin/env node

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { performance } from "node:perf_hooks";

import { runWorkspaceBuilds } from "./build-workspaces.mjs";

const npmCli = join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
const npmCommand = process.platform === "win32" ? process.execPath : "npm";
const npmArgs = (...args) => (process.platform === "win32" ? [npmCli, ...args] : args);
const benchmarkArgs = new Set(process.argv.slice(2));
const steps = [];

for (const argument of benchmarkArgs) {
	if (argument !== "--include-native" && argument !== "--refresh-models") {
		throw new Error(`Unknown argument: ${argument}`);
	}
}

if (benchmarkArgs.has("--include-native") && process.platform === "win32") {
	steps.push({
		name: `native:win32-${process.arch}`,
		command: npmCommand,
		args: npmArgs("run", "build:native:win32"),
		env: { PI_TUI_WIN32_ARCH: process.arch },
	});
}

if (benchmarkArgs.has("--refresh-models")) {
	steps.push({ name: "ai:model-generation", command: npmCommand, args: npmArgs("run", "generate:models") });
}

function formatDuration(milliseconds) {
	return `${(milliseconds / 1000).toFixed(2)}s`;
}

function printSummary(results, totalMilliseconds) {
	const nameWidth = Math.max("Step".length, ...results.map((result) => result.name.length));
	const durationWidth = Math.max("Duration".length, ...results.map((result) => formatDuration(result.milliseconds).length));
	const header = `${"Step".padEnd(nameWidth)}  ${"Duration".padStart(durationWidth)}`;

	console.log("\nBuild benchmark summary");
	console.log(header);
	console.log("-".repeat(header.length));
	for (const result of results) {
		console.log(`${result.name.padEnd(nameWidth)}  ${formatDuration(result.milliseconds).padStart(durationWidth)}`);
	}
	console.log("-".repeat(header.length));
	console.log(`${"wall-clock total".padEnd(nameWidth)}  ${formatDuration(totalMilliseconds).padStart(durationWidth)}`);
}

function runStep(step) {
	return new Promise((resolve, reject) => {
		console.log(`\n[benchmark] ${step.name}`);
		const startedAt = performance.now();
		const child = spawn(step.command, step.args, {
			env: { ...process.env, ...step.env },
			stdio: "inherit",
		});
		child.on("error", reject);
		child.on("exit", (code, signal) => {
			const milliseconds = performance.now() - startedAt;
			if (code === 0) {
				resolve({ name: step.name, milliseconds });
				return;
			}
			const reason = signal ? `signal ${signal}` : `exit code ${code ?? 1}`;
			reject(new Error(`${step.name} failed with ${reason}`));
		});
	});
}

const results = [];
const benchmarkStartedAt = performance.now();

try {
	console.log(`Build benchmark on ${process.platform}-${process.arch}, Node ${process.version}`);
	for (const step of steps) results.push(await runStep(step));
	results.push(...(await runWorkspaceBuilds()));
	printSummary(results, performance.now() - benchmarkStartedAt);
} catch (error) {
	const totalMilliseconds = performance.now() - benchmarkStartedAt;
	if (results.length > 0) printSummary(results, totalMilliseconds);
	console.error(`\n${error instanceof Error ? error.message : String(error)}`);
	process.exitCode = 1;
}
