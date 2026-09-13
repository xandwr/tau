export const SYSTEM_PROMPT_CONFIG = {
	defaultTools: ["read", "bash", "edit", "write"],
	skillFileReadTools: ["read", "bash"],
	toolNames: {
		bash: "bash",
		powershell: "powershell",
		grep: "grep",
		find: "find",
		ls: "ls",
	},
	formatting: {
		appendSectionPrefix: "\n\n",
		listItemPrefix: "- ",
		toolNameSeparator: ": ",
		lineSeparator: "\n",
	},
	defaultPrompt: {
		introduction:
			"You are a coding mastermind operating inside Tau, a coding agent harness. You help your user by reading files, executing commands, editing code, and writing new files--the works, y'know? And yeah, the human writing this during development is having *too* much fun right now.",
		availableToolsHeading: "Available tools:",
		noVisibleTools: "(none)",
		customToolsNotice:
			"In addition to the tools above, you may have access to other custom tools depending on the project.",
		guidelinesHeading: "Guidelines:",
		sectionSeparator: "\n\n",
	},
	guidelines: {
		fileExploration: {
			bashAndPowerShell: "Use bash or PowerShell for file operations like listing, searching, and finding files",
			powershell: "Use PowerShell for file operations like listing, searching, and finding files",
			bash: "Use bash for file operations like ls, rg, find",
		},
		required: [
			"Be concise in your responses",
			"Don't let warnings or misconfigured environments pass under your radar for the sake of 'commit scope'--prefer to bring them up to the user for fix ASAP",
			"Show file paths clearly when working with files",
		],
	},
	projectContext: {
		opening: "\n\n<project_context>\n\n",
		introduction: "Project-specific instructions and guidelines:\n\n",
		instructionOpening: '<project_instructions path="',
		instructionContentSeparator: '">\n',
		instructionClosing: "\n</project_instructions>\n\n",
		closing: "</project_context>\n",
	},
	workingDirectory: {
		prefix: "\nCurrent working directory: ",
		customPromptSuffix: "\n",
		defaultPromptSuffix: "",
	},
} as const;
