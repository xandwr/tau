import type { Model } from "@earendil-works/pi-ai";
import { describe, expect, it, vi } from "vitest";
import { createEventBus } from "../src/core/event-bus.ts";
import { createExtensionRuntime, loadExtensionFromFactory } from "../src/core/extensions/loader.ts";
import type { ExtensionAPI, ExtensionCommandContext, RegisteredCommand } from "../src/core/extensions/types.ts";
import { builtInExtensions } from "../src/extensions/index.ts";
import { createReviewExtension, createReviewPrompt, type ReviewRequest } from "../src/extensions/review/index.ts";

function createContext(overrides: Partial<ExtensionCommandContext> = {}): ExtensionCommandContext {
	return {
		cwd: "/workspace",
		model: { provider: "faux", id: "reviewer" } as Model<"openai-responses">,
		thinkingLevel: "high",
		isIdle: () => true,
		ui: {
			notify: vi.fn(),
			setStatus: vi.fn(),
		},
		...overrides,
	} as unknown as ExtensionCommandContext;
}

describe("review extension", () => {
	it("ships as a hidden built-in extension", async () => {
		const definition = builtInExtensions.find(
			(extension) => typeof extension !== "function" && extension.name === "review",
		);
		expect(definition).toMatchObject({ name: "review", hidden: true });
		if (!definition || typeof definition === "function") throw new Error("Review extension is not registered");

		const extension = await loadExtensionFromFactory(
			definition.factory,
			process.cwd(),
			createEventBus(),
			createExtensionRuntime(),
			"<inline:review>",
		);
		expect(extension.commands.get("review")?.description).toBe("Independently review the current worktree");
	});

	it("asks for an evidence-based, read-only worktree review", () => {
		const prompt = createReviewPrompt("Add a first-party /review command");

		expect(prompt).toContain("Add a first-party /review command");
		expect(prompt).toContain("staged, unstaged, and untracked files");
		expect(prompt).toContain("Do not edit, delete, generate, format, stage, stash, commit");
		expect(prompt).toContain("What behavior lacks coverage?");
		expect(prompt).toContain("Suggested commit message");
	});

	it("runs with fresh review input and publishes the report without triggering the implementation agent", async () => {
		let command:
			| {
					handler: (args: string, context: ExtensionCommandContext) => Promise<void>;
			  }
			| undefined;
		const sendMessage = vi.fn();
		let request: ReviewRequest | undefined;
		const extensionApi = {
			registerCommand: (_name: string, options: Omit<RegisteredCommand, "name" | "sourceInfo">) => {
				command = options;
			},
			sendMessage,
		} as unknown as ExtensionAPI;
		createReviewExtension(async (value) => {
			request = value;
			return "# Verdict\n\nReady.";
		})(extensionApi);
		const context = createContext();

		await command?.handler("  command scope  ", context);

		expect(request?.focus).toBe("command scope");
		expect(request?.context).toBe(context);
		expect(sendMessage).toHaveBeenCalledWith(
			{
				customType: "tau.review",
				content: "# Verdict\n\nReady.",
				display: true,
			},
			{ triggerTurn: false },
		);
		expect(context.ui.setStatus).toHaveBeenNthCalledWith(1, "tau.review", "Reviewing worktree...");
		expect(context.ui.setStatus).toHaveBeenLastCalledWith("tau.review", undefined);
	});

	it("refuses to review while implementation is still running", async () => {
		const runReview = vi.fn(async () => "unused");
		let handler: ((args: string, context: ExtensionCommandContext) => Promise<void>) | undefined;
		const extensionApi = {
			registerCommand: (_name: string, options: Omit<RegisteredCommand, "name" | "sourceInfo">) => {
				handler = options.handler;
			},
		} as unknown as ExtensionAPI;
		createReviewExtension(runReview)(extensionApi);
		const context = createContext({ isIdle: () => false });

		await handler?.("", context);

		expect(runReview).not.toHaveBeenCalled();
		expect(context.ui.notify).toHaveBeenCalledWith(
			"Wait for the current agent turn to finish before running /review.",
			"warning",
		);
	});
});
