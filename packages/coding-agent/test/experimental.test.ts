import { afterEach, describe, expect, it } from "vitest";
import { areExperimentalFeaturesEnabled } from "../src/core/experimental.ts";

describe("areExperimentalFeaturesEnabled", () => {
	const originalTauExperimental = process.env.TAU_EXPERIMENTAL;

	afterEach(() => {
		if (originalTauExperimental === undefined) {
			delete process.env.TAU_EXPERIMENTAL;
		} else {
			process.env.TAU_EXPERIMENTAL = originalTauExperimental;
		}
	});

	it("returns false when TAU_EXPERIMENTAL is unset", () => {
		delete process.env.TAU_EXPERIMENTAL;

		expect(areExperimentalFeaturesEnabled()).toBe(false);
	});

	it("returns false when TAU_EXPERIMENTAL is empty", () => {
		process.env.TAU_EXPERIMENTAL = "";

		expect(areExperimentalFeaturesEnabled()).toBe(false);
	});

	it("returns true when TAU_EXPERIMENTAL is set to 1", () => {
		process.env.TAU_EXPERIMENTAL = "1";

		expect(areExperimentalFeaturesEnabled()).toBe(true);
	});

	it("returns false when TAU_EXPERIMENTAL is set to 0", () => {
		process.env.TAU_EXPERIMENTAL = "0";

		expect(areExperimentalFeaturesEnabled()).toBe(false);
	});

	it("returns false when TAU_EXPERIMENTAL is set to a non-1 value", () => {
		process.env.TAU_EXPERIMENTAL = "true";

		expect(areExperimentalFeaturesEnabled()).toBe(false);
	});
});
