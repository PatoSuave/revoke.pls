import { describe, expect, it } from "vitest";

import { normalizeRevokeError } from "./errors";
import { BSC_GAS_CAP_ERROR } from "./preflight";

describe("revoke error normalization", () => {
  it("normalizes BSC Osaka/Mendel gas-cap wallet errors", () => {
    const result = normalizeRevokeError(
      new Error(
        "mainnet passes Osaka hardfork, transaction gas cannot exceed 16777216",
      ),
    );

    expect(result).toEqual({
      message: BSC_GAS_CAP_ERROR,
      rejected: false,
    });
  });

  it("normalizes maximum transaction gas wording", () => {
    const result = normalizeRevokeError(
      new Error("execution rejected: exceeds maximum transaction gas"),
    );

    expect(result).toEqual({
      message: BSC_GAS_CAP_ERROR,
      rejected: false,
    });
  });
});
