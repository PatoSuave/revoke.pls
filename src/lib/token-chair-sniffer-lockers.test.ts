import { describe, expect, it, vi } from "vitest";
import { getAddress, type Hex } from "viem";

import { fetchTokenChairLpLockerData } from "@/lib/token-chair-sniffer-lockers";

const PAIR = getAddress("0x165C3410fC91EF562C50559f7d2289fEbed552d9");
const LOCKER = getAddress("0xD6C5765295ac081cD513fF9C71586B59e83E0aA7");
const OWNER = getAddress("0x3333333333333333333333333333333333333333");
const OTHER = getAddress("0x4444444444444444444444444444444444444444");

function reader({
  totalLocks = 3n,
  locks = {},
  code = "0x1234" as Hex,
  logs = [],
}: {
  totalLocks?: bigint;
  locks?: Record<string, unknown[]>;
  code?: Hex;
  logs?: unknown[];
} = {}) {
  return {
    getCode: vi.fn(async () => code),
    getStorageAt: vi.fn(),
    getBlockNumber: vi.fn(async () => 20_000_000n),
    getLogs: vi.fn(async () => logs),
    readContract: vi.fn(async ({ functionName, args }) => {
      if (functionName === "totalLocks") return totalLocks;
      if (functionName === "getLockInfo") {
        const id = String(args?.[0] ?? "");
        const value = locks[id];
        if (!value) throw new Error(`Missing lock ${id}`);
        return value;
      }
      throw new Error(`Unexpected read ${functionName}`);
    }),
  };
}

describe("Token Chair LP locker reads", () => {
  it("reads active PulseLaunch lock records for the selected pair", async () => {
    const result = await fetchTokenChairLpLockerData(PAIR, LOCKER, "1000", {
      reader: reader({
        locks: {
          "0": [OTHER, OWNER, 100n, 1_800_000_000n, false, true],
          "1": [PAIR, OWNER, 250n, 1_900_000_000n, false, true],
          "2": [PAIR, OWNER, 50n, 1_700_000_000n, false, false],
        },
      }),
    });

    expect(result.status).toBe("success");
    expect(result.lockerLabel).toBe("PulseLaunch Pro LP Locker");
    expect(result.checkedLockCount).toBe(3);
    expect(result.matchedLocks).toHaveLength(2);
    expect(result.activeLocks).toHaveLength(1);
    expect(result.withdrawableLocks).toHaveLength(1);
    expect(result.lockedAmountRaw).toBe("250");
    expect(result.lockedPercent).toBe(25);
    expect(result.nextUnlockTime).toBe("1900000000");
    expect(result.ownerAddresses).toEqual([OWNER]);
    expect(result.warnings).toEqual([]);
  });

  it("uses LockCreated events to read older matching lock IDs outside the recent sample", async () => {
    const fakeReader = reader({
      totalLocks: 100n,
      locks: {
        "5": [PAIR, OWNER, 300n, 1_900_000_000n, false, true],
        "98": [OTHER, OWNER, 100n, 1_900_000_000n, false, true],
        "99": [OTHER, OWNER, 100n, 2_000_000_000n, false, true],
      },
      logs: [
        { args: { lockId: 5n, owner: OWNER, token: PAIR } },
        { args: { lockId: 9n, owner: OWNER, token: OTHER } },
      ],
    });

    const result = await fetchTokenChairLpLockerData(PAIR, LOCKER, "1000", {
      reader: fakeReader,
      maxLocks: 2,
    });

    expect(result.checkedLockCount).toBe(3);
    expect(result.activeLocks).toHaveLength(1);
    expect(result.lockedAmountRaw).toBe("300");
    expect(result.lockedPercent).toBe(30);
    expect(result.warnings.join(" ")).not.toContain("most recent");
    expect(fakeReader.readContract).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "getLockInfo", args: [5n] }),
    );
    expect(fakeReader.getLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        address: LOCKER,
        fromBlock: 0n,
        toBlock: 20_000_000n,
      }),
    );
  });

  it("caps locker scans to the most recent records", async () => {
    const fakeReader = reader({
      totalLocks: 5n,
      locks: {
        "3": [PAIR, OWNER, 100n, 1_900_000_000n, false, true],
        "4": [PAIR, OWNER, 100n, 2_000_000_000n, false, true],
      },
    });

    const result = await fetchTokenChairLpLockerData(PAIR, LOCKER, "1000", {
      reader: fakeReader,
      maxLocks: 2,
    });

    expect(result.checkedLockCount).toBe(2);
    expect(result.maxLocksReached).toBe(true);
    expect(result.lockedPercent).toBe(20);
    expect(result.warnings.join(" ")).toContain("capped");
    expect(fakeReader.readContract).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "getLockInfo", args: [3n] }),
    );
  });

  it("stays not-applicable when the LP holder is not a known locker", async () => {
    const result = await fetchTokenChairLpLockerData(PAIR, OWNER, "1000", {
      reader: reader(),
    });

    expect(result.status).toBe("not-applicable");
    expect(result.checkedLockCount).toBe(0);
    expect(result.matchedLocks).toEqual([]);
  });

  it("returns unable-to-verify when the locker total cannot be read", async () => {
    const brokenReader = reader();
    brokenReader.readContract = vi.fn(async () => {
      throw new Error("RPC nope");
    });

    const result = await fetchTokenChairLpLockerData(PAIR, LOCKER, "1000", {
      reader: brokenReader,
    });

    expect(result.status).toBe("unable-to-verify");
    expect(result.errors.join(" ")).toContain("RPC nope");
  });
});
