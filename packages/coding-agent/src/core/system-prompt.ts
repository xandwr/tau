/**
 * System prompt construction and project context loading
 */

import { formatSkillsForPrompt, type Skill } from "./skills.ts";
import { SYSTEM_PROMPT_CONFIG } from "./system-prompt.config.ts";

export interface BuildSystemPromptOptions {
	/** Custom system prompt (replaces default). */
	customPrompt?: string;
	/** Tools to include in prompt. Default: [read, bash, edit, write] */
	selectedTools?: string[];
	/** Optional one-line tool snippets keyed by tool name. */
	toolSnippets?: Record<string, string>;
	/** Additional guideline bullets appended to the default system prompt guidelines. */
	promptGuidelines?: string[];
	/** Text to append to system prompt. */
	appendSystemPrompt?: string;
	/** Working directory. */
	cwd: string;
	/** Pre-loaded context files. */
	contextFiles?: Array<{ path: string; content: string }>;
	/** Pre-loaded skills. */
	skills?: Skill[];
}

function renderProjectContext(contextFiles: Array<{ path: string; content: string }>): string {
	const config = SYSTEM_PROMPT_CONFIG.projectContext;
	let section = config.opening + config.introduction;
	for (const { path, content } of contextFiles) {
		section += config.instructionOpening + path + config.instructionContentSeparator;
		section += content + config.instructionClosing;
	}
	return section + config.closing;
}

/** Build the system prompt with tools, guidelines, and context */
export function buildSystemPrompt(options: BuildSystemPromptOptions): string {
	const {
		customPrompt,
		selectedTools,
		toolSnippets,
		promptGuidelines,
		appendSystemPrompt,
		cwd,
		contextFiles: providedContextFiles,
		skills: providedSkills,
	} = options;
	const promptCwd = cwd.replace(/\\/g, "/");

	const appendSection = appendSystemPrompt
		? SYSTEM_PROMPT_CONFIG.formatting.appendSectionPrefix + appendSystemPrompt
		: "";

	const contextFiles = providedContextFiles ?? [];
	const skills = providedSkills ?? [];
	const tools = selectedTools || [...SYSTEM_PROMPT_CONFIG.defaultTools];
	const skillFileReadTool = SYSTEM_PROMPT_CONFIG.skillFileReadTools.find((tool) => tools.includes(tool));

	if (customPrompt) {
		let prompt = customPrompt;

		if (appendSection) {
			prompt += appendSection;
		}

		// Append project context files
		if (contextFiles.length > 0) {
			prompt += renderProjectContext(contextFiles);
		}

		// Append skills when a tool capable of reading their files is available.
		if (skillFileReadTool && skills.length > 0) {
			prompt += formatSkillsForPrompt(skills, skillFileReadTool);
		}

		prompt +=
			SYSTEM_PROMPT_CONFIG.workingDirectory.prefix +
			promptCwd +
			SYSTEM_PROMPT_CONFIG.workingDirectory.customPromptSuffix;

		return prompt;
	}

	// Build tools list based on selected tools.
	// A tool appears in Available tools only when the caller provides a one-line snippet.
	const visibleTools = tools.filter((name) => !!toolSnippets?.[name]);
	const toolsList =
		visibleTools.length > 0
			? visibleTools
					.map(
						(name) =>
							SYSTEM_PROMPT_CONFIG.formatting.listItemPrefix +
							name +
							SYSTEM_PROMPT_CONFIG.formatting.toolNameSeparator +
							toolSnippets![name],
					)
					.join(SYSTEM_PROMPT_CONFIG.formatting.lineSeparator)
			: SYSTEM_PROMPT_CONFIG.defaultPrompt.noVisibleTools;

	// Build guidelines based on which tools are actually available
	const guidelinesList: string[] = [];
	const guidelinesSet = new Set<string>();
	const addGuideline = (guideline: string): void => {
		if (guidelinesSet.has(guideline)) {
			return;
		}
		guidelinesSet.add(guideline);
		guidelinesList.push(guideline);
	};

	const hasBash = tools.includes(SYSTEM_PROMPT_CONFIG.toolNames.bash);
	const hasPowerShell = tools.includes(SYSTEM_PROMPT_CONFIG.toolNames.powershell);
	const hasGrep = tools.includes(SYSTEM_PROMPT_CONFIG.toolNames.grep);
	const hasFind = tools.includes(SYSTEM_PROMPT_CONFIG.toolNames.find);
	const hasLs = tools.includes(SYSTEM_PROMPT_CONFIG.toolNames.ls);

	// File exploration guidelines
	if ((hasBash || hasPowerShell) && !hasGrep && !hasFind && !hasLs) {
		if (hasBash && hasPowerShell) {
			addGuideline(SYSTEM_PROMPT_CONFIG.guidelines.fileExploration.bashAndPowerShell);
		} else if (hasPowerShell) {
			addGuideline(SYSTEM_PROMPT_CONFIG.guidelines.fileExploration.powershell);
		} else {
			addGuideline(SYSTEM_PROMPT_CONFIG.guidelines.fileExploration.bash);
		}
	}

	for (const guideline of promptGuidelines ?? []) {
		const normalized = guideline.trim();
		if (normalized.length > 0) {
			addGuideline(normalized);
		}
	}

	for (const guideline of SYSTEM_PROMPT_CONFIG.guidelines.required) {
		addGuideline(guideline);
	}

	const guidelines = guidelinesList
		.map((guideline) => SYSTEM_PROMPT_CONFIG.formatting.listItemPrefix + guideline)
		.join(SYSTEM_PROMPT_CONFIG.formatting.lineSeparator);

	const defaultPromptSections = [
		SYSTEM_PROMPT_CONFIG.defaultPrompt.introduction,
		SYSTEM_PROMPT_CONFIG.defaultPrompt.availableToolsHeading +
			SYSTEM_PROMPT_CONFIG.formatting.lineSeparator +
			toolsList,
		SYSTEM_PROMPT_CONFIG.defaultPrompt.customToolsNotice,
		SYSTEM_PROMPT_CONFIG.defaultPrompt.guidelinesHeading + SYSTEM_PROMPT_CONFIG.formatting.lineSeparator + guidelines,
	];
	let prompt = defaultPromptSections.join(SYSTEM_PROMPT_CONFIG.defaultPrompt.sectionSeparator);

	if (appendSection) {
		prompt += appendSection;
	}

	// Append project context files
	if (contextFiles.length > 0) {
		prompt += renderProjectContext(contextFiles);
	}

	// Append skills when a tool capable of reading their files is available.
	if (skillFileReadTool && skills.length > 0) {
		prompt += formatSkillsForPrompt(skills, skillFileReadTool);
	}

	prompt +=
		SYSTEM_PROMPT_CONFIG.workingDirectory.prefix +
		promptCwd +
		SYSTEM_PROMPT_CONFIG.workingDirectory.defaultPromptSuffix;

	return prompt;
}
