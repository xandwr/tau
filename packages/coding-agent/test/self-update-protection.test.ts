import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENV_AGENT_DIR, PACKAGE_NAME } from "../src/config.ts";
import { handlePackageCommand } from "../src/package-manager-cli.ts";

describe("self-update protection", () => {
	let tempDir: string;
	let originalCwd: string;
	let originalExitCode: typeof process.exitCode;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "tau-self-update-"));
		originalCwd = process.cwd();
		originalExitCode = process.exitCode;
		process.chdir(tempDir);
		process.exitCode = undefined;
		vi.stubEnv(ENV_AGENT_DIR, join(tempDir, "agent"));
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
		process.chdir(originalCwd);
		process.exitCode = originalExitCode;
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("refuses to fetch or install the upstream-named package", async () => {
		expect(PACKAGE_NAME).toBe("@earendil-works/pi-coding-agent");
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		expect(await handlePackageCommand(["update", "--self"])).toBe(true);

		expect(fetchMock).not.toHaveBeenCalled();
		expect(errorSpy.mock.calls.map(([message]) => String(message)).join("\n")).toContain(
			"tau cannot self-update because that would overwrite or reinstall @earendil-works/pi-coding-agent.",
		);
		expect(process.exitCode).toBe(1);
	});
});
