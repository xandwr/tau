export function areExperimentalFeaturesEnabled(): boolean {
	return process.env.TAU_EXPERIMENTAL === "1";
}
