import assert from "node:assert/strict";
import test from "node:test";

import { runWorkspaceBuilds, WorkspaceBuildError } from "./build-workspaces.mjs";

test("quiet failures contain output from only the failed build", async () => {
	const builds = [
		{
			name: "successful",
			command: process.execPath,
			args: ["-e", "console.log('successful build history')"],
			dependencies: [],
		},
		{
			name: "failing",
			command: process.execPath,
			args: ["-e", "console.error('relevant failure stack'); process.exit(1)"],
			dependencies: ["successful"],
		},
	];

	await assert.rejects(runWorkspaceBuilds({ builds, quiet: true }), (error) => {
		assert.ok(error instanceof WorkspaceBuildError);
		assert.equal(error.buildName, "failing");
		assert.match(error.output, /relevant failure stack/);
		assert.doesNotMatch(error.output, /successful build history/);
		return true;
	});
});
