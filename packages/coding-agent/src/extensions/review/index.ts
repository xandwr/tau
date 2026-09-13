import type { AssistantMessage } from "@earendil-works/pi-ai";
import { contentText } from "@earendil-works/pi-ai";
import { getAgentDir } from "../../config.ts";
import type { ExtensionAPI, ExtensionCommandContext, ExtensionFactory } from "../../core/extensions/types.ts";
import { getModelRegistryRuntime } from "../../core/model-registry.ts";
import { DefaultResourceLoader } from "../../core/resource-loader.ts";
import { createAgentSession } from "../../core/sdk.ts";
import { SessionManager } from "../../core/session-manager.ts";
import { SettingsManager } from "../../core/settings-manager.ts";

const REVIEW_STATUS_KEY = "tau.review";

export interface ReviewRequest {
	focus: string;
	context: ExtensionCommandContext;
}

export type ReviewRunner = (request: ReviewRequest) => Promise<string>;

export function createReviewPrompt(focus: string): string {
	const focusSection = focus
		? `The user supplied this intended scope:\n\n${focus}`
		: "The user did not supply an intended scope. Infer the likely intent from the worktree and state uncertainty where intent cannot be established.";

	return `Independently review the current Git worktree. You have fresh conversation context and must form your own conclusions from repository evidence.

${focusSection}

Inspect repository instructions and relevant source files. Start by recording the complete worktree state, including staged, unstaged, and untracked files. Review the actual diff against HEAD and inspect enough surrounding code to judge integration and ownership boundaries. Use history only when it helps establish intent or conventions.

Run safe, proportionate diagnostics and tests when they materially improve confidence. Distinguish commands you ran from commands you only recommend. Do not edit, delete, generate, format, stage, stash, commit, or otherwise intentionally change repository files. Do not run auto-fix commands. Re-check the worktree before finishing and report any changes caused by diagnostics.

Answer all of these questions with concrete evidence:

1. What changed?
2. Is the implementation actually correct? Identify defects and risks before strengths, with file and line references where possible.
3. What diagnostics and tests should run? Include results for those you ran.
4. What behavior lacks coverage?
5. Does any changed work appear unrelated to the supplied or inferred intent?
6. Is the worktree ready to commit? Give a clear yes or no and list blockers.
7. What concise commit message best describes the ready changes? Follow repository commit conventions.

Use these headings exactly: Verdict, What changed, Correctness, Diagnostics and tests, Coverage gaps, Scope hygiene, Commit readiness, Suggested commit message. Do not modify the worktree.`;
}

async function runReviewAgent({ focus, context }: ReviewRequest): Promise<string> {
	const model = context.model;
	if (!model) throw new Error("Select a model before running /review.");

	const agentDir = getAgentDir();
	const settingsManager = SettingsManager.create(context.cwd, agentDir, {
		projectTrusted: context.isProjectTrusted(),
	});
	const resourceLoader = new DefaultResourceLoader({
		cwd: context.cwd,
		agentDir,
		settingsManager,
		noExtensions: true,
	});
	await resourceLoader.reload();

	const { session } = await createAgentSession({
		cwd: context.cwd,
		agentDir,
		modelRuntime: getModelRegistryRuntime(context.modelRegistry),
		model,
		thinkingLevel: context.thinkingLevel,
		tools: ["read", "bash", "grep", "find", "ls"],
		resourceLoader,
		sessionManager: SessionManager.inMemory(context.cwd),
		settingsManager,
	});

	try {
		await session.prompt(createReviewPrompt(focus));
		let response: AssistantMessage | undefined;
		for (let index = session.messages.length - 1; index >= 0; index--) {
			const message = session.messages[index];
			if (message.role === "assistant") {
				response = message;
				break;
			}
		}
		if (!response) throw new Error("The review agent returned no response.");
		const text = contentText(response.content).trim();
		if (response.stopReason === "error") throw new Error(text || "The review agent failed.");
		if (!text) throw new Error("The review agent returned no text.");
		return response.stopReason === "length" ? `${text}\n\nReview stopped at the model output limit.` : text;
	} finally {
		session.dispose();
	}
}

export function createReviewExtension(runReview: ReviewRunner = runReviewAgent): ExtensionFactory {
	return (pi: ExtensionAPI): void => {
		pi.registerCommand("review", {
			description: "Independently review the current worktree",
			handler: async (args, context) => {
				if (!context.isIdle()) {
					context.ui.notify("Wait for the current agent turn to finish before running /review.", "warning");
					return;
				}

				context.ui.setStatus(REVIEW_STATUS_KEY, "Reviewing worktree...");
				try {
					const report = await runReview({ focus: args.trim(), context });
					pi.sendMessage(
						{
							customType: REVIEW_STATUS_KEY,
							content: report,
							display: true,
						},
						{ triggerTurn: false },
					);
				} catch (error) {
					context.ui.notify(error instanceof Error ? error.message : String(error), "error");
				} finally {
					context.ui.setStatus(REVIEW_STATUS_KEY, undefined);
				}
			},
		});
	};
}

export default createReviewExtension();
