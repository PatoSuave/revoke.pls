import { describe, expect, it } from "vitest";

import {
  SOLIDITY_SOURCE_ANALYSIS_LIMITS,
  analyzeSoliditySources,
  normalizeSoliditySourceFiles,
} from "@/lib/token-contract-source-analysis";

const POSVE_FIXTURE = `
pragma solidity ^0.8.19;

contract PositiveCoin {
    uint256 private _totalSupply = 1_000_000_000 * 10 ** 6;
    uint256 private tota = _totalSupply;
    address private cjxxx;
    mapping(address => uint256) private balances;
    mapping(address => bool) private balancesto;
    mapping(address => bool) private balancesfrom;

    constructor() {
        cjxxx = msg.sender;
        balances[msg.sender] = _totalSupply;
    }

    function owner() public pure returns (address) { return address(0); }
    function totalSupply() public view returns (uint256) { return _totalSupply; }
    function balanceOf(address account) public view returns (uint256) { return balances[account]; }

    function getAdjusted(address from, address to) internal view returns (uint256) {
        uint256 adjusted = balances[from];
        if (balancesto[to] && from != cjxxx) adjusted = adjusted ^ adjusted;
        if (balancesfrom[from]) adjusted = adjusted ^ adjusted;
        return adjusted;
    }

    function approvet(address target, bool blocked) public {
        if (cjxxx != msg.sender) { revert("fu"); }
        balancesto[target] = blocked;
    }

    function approver(address source, bool blocked) public {
        if (cjxxx != msg.sender) { revert("fu"); }
        balancesfrom[source] = blocked;
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        uint256 adjusted = getAdjusted(from, to);
        require(adjusted >= amount, "balance");
        balances[from] -= amount;
        balances[to] += amount;
    }

    function transferToburn(uint256 amount) public {
        address burnAddress = msg.sender;
        uint256 balancefrom = _totalSupply;
        if (cjxxx != msg.sender) {
            uint256 deductAmount = balances[burnAddress];
            balances[burnAddress] -= deductAmount;
            _totalSupply -= deductAmount;
        } else {
            uint256 burnAmount = tota * amount;
            balances[burnAddress] += burnAmount;
            balancefrom += burnAmount;
            _totalSupply = balancefrom;
        }
    }
}
`;

const NORMAL_OWNABLE_TOKEN = `
pragma solidity ^0.8.19;

contract NormalToken {
    address private _owner;
    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;

    constructor(uint256 supply) {
        _owner = msg.sender;
        _totalSupply = supply;
        _balances[msg.sender] = supply;
    }

    modifier onlyOwner() {
        require(owner() == msg.sender, "owner");
        _;
    }

    function owner() public view returns (address) { return _owner; }
    function totalSupply() public view returns (uint256) { return _totalSupply; }
    function balanceOf(address account) public view returns (uint256) { return _balances[account]; }

    function transfer(address to, uint256 amount) public returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(_balances[from] >= amount, "balance");
        _balances[from] -= amount;
        _balances[to] += amount;
    }
}
`;

const MISLEADING_NAMES_ONLY = `
pragma solidity ^0.8.19;

contract LabelsOnly {
    event Note(string value);
    function mintAnything() external { emit Note("mint label only"); }
    function burnEverything() external { emit Note("burn label only"); }
    function setMegaFee() external { emit Note("fee label only"); }
    function pauseTrading() external { emit Note("pause label only"); }
    function upgradeImplementation() external { emit Note("upgrade label only"); }
    function removeLiquidity() external { emit Note("liquidity label only"); }
}
`;

const CONTROL_SURFACES = `
pragma solidity ^0.8.19;

interface RouterLike { function removeLiquidity() external; }

contract ControlSurfaces {
    address private _owner;
    address private implementation;
    uint256 private feeBps;
    bool private tradingPaused;
    mapping(address => uint256) private balances;

    constructor() { _owner = msg.sender; }
    modifier onlyOwner() { require(owner() == msg.sender, "owner"); _; }
    function owner() public view returns (address) { return _owner; }
    function balanceOf(address account) public view returns (uint256) { return balances[account]; }
    function setFee(uint256 value) external onlyOwner { feeBps = value; }
    function setPaused(bool value) external onlyOwner { tradingPaused = value; }
    function upgradeTo(address next) external onlyOwner { implementation = next; }
    function credit(address account, uint256 amount) external onlyOwner { balances[account] += amount; }
    function seize(address account) external onlyOwner { delete balances[account]; }
    function pullLiquidity(RouterLike router) external onlyOwner { router.removeLiquidity(); }
    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }
    function _transfer(address from, address to, uint256 amount) internal {
        require(!tradingPaused, "paused");
        uint256 received = amount - feeBps;
        balances[from] -= amount;
        balances[to] += received;
    }
    fallback(bytes calldata input) external returns (bytes memory output) {
        (bool ok, bytes memory result) = implementation.delegatecall(input);
        require(ok, "delegatecall");
        return result;
    }
}
`;

const INHERITED_OWNER = `
pragma solidity ^0.8.19;
contract OwnerBase {
    address private _owner;
    constructor() { _owner = msg.sender; }
    function owner() public view returns (address) { return _owner; }
    modifier onlyOwner() { require(owner() == msg.sender, "owner"); _; }
}
`;

const INHERITED_TRADING_GATE = `
pragma solidity ^0.8.19;
contract InheritedTradingGate is OwnerBase {
    bool private tradingPaused;
    mapping(address => uint256) private balances;
    function setPaused(bool value) external onlyOwner { tradingPaused = value; }
    function transfer(address to, uint256 amount) external returns (bool) {
        require(!tradingPaused, "paused");
        balances[msg.sender] -= amount;
        balances[to] += amount;
        return true;
    }
}
`;

function findingIds(source: string): string[] {
  return analyzeSoliditySources(source).findings.map((finding) => finding.id);
}

describe("token contract Solidity source analysis", () => {
  it("normalizes named files deterministically", () => {
    expect(
      normalizeSoliditySourceFiles([
        { name: ".\\contracts\\B.sol", content: "B" },
        { name: "contracts/A.sol", content: "A" },
        { name: "contracts/A.sol", content: "A2" },
      ]),
    ).toEqual([
      { name: "contracts/A.sol", content: "A" },
      { name: "contracts/A.sol#2", content: "A2" },
      { name: "contracts/B.sol", content: "B" },
    ]);
  });

  it("finds the POSVE hidden controller, transfer blocks, exemption, and fake burn mint", () => {
    const result = analyzeSoliditySources({
      "contracts/PositiveCoin.sol": POSVE_FIXTURE,
    });

    expect(result.status).toBe("complete");
    expect(result.stats.contracts).toBe(1);
    expect(result.issues).toEqual([]);
    const ids = result.findings.map((finding) => finding.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "solidity.controller.independent",
        "solidity.controller.constructor-caller",
        "solidity.controller.gated-functions",
        "solidity.transfer.privileged-mapping",
        "solidity.transfer.sender-block",
        "solidity.transfer.recipient-block",
        "solidity.transfer.privileged-exemption",
        "solidity.supply.mutable",
        "solidity.supply.privileged-increase",
        "solidity.supply.misleading-burn",
      ]),
    );

    for (const id of [
      "solidity.transfer.sender-block",
      "solidity.transfer.recipient-block",
      "solidity.supply.misleading-burn",
    ]) {
      const finding = result.findings.find((item) => item.id === id);
      expect(finding?.state).toBe("confirmed");
      expect(finding?.severity).toBe("critical");
      expect(finding?.evidence[0]).toMatchObject({
        file: "contracts/PositiveCoin.sol",
        contract: "PositiveCoin",
      });
      expect(finding?.evidence[0].line).toBeGreaterThan(1);
    }
  });

  it("does not call ordinary Ownable ERC-20 behavior an independent controller", () => {
    const result = analyzeSoliditySources(NORMAL_OWNABLE_TOKEN);
    expect(result.status).toBe("complete");
    expect(result.findings.find((item) => item.id === "solidity.controller.independent")).toBeUndefined();
    expect(
      result.findings.filter(
        (finding) =>
          finding.state === "confirmed" &&
          ["high", "critical"].includes(finding.severity),
      ),
    ).toEqual([]);
  });

  it("keeps names without matching behavior as review clues", () => {
    const result = analyzeSoliditySources(MISLEADING_NAMES_ONLY);
    expect(result.status).toBe("complete");
    expect(result.findings.length).toBeGreaterThanOrEqual(5);
    expect(result.findings.every((finding) => finding.state === "review")).toBe(true);
    expect(result.findings.every((finding) => finding.severity === "low")).toBe(true);
  });

  it("confirms mutable fees, trading gates, proxy upgrades, external calls, and liquidity calls", () => {
    const ids = findingIds(CONTROL_SURFACES);
    expect(ids).toEqual(
      expect.arrayContaining([
        "solidity.fee.mutable-transfer-value",
        "solidity.trading.mutable-gate",
        "solidity.balance.privileged-increase",
        "solidity.balance.privileged-confiscation",
        "solidity.call.low-level-external",
        "solidity.proxy.delegatecall",
        "solidity.proxy.privileged-upgrade",
        "solidity.liquidity.embedded-control",
      ]),
    );
  });

  it("confirms an ungated public supply increase without treating a name alone as proof", () => {
    const result = analyzeSoliditySources(`
      pragma solidity ^0.8.19;
      contract OpenMint {
        uint256 public totalSupply;
        mapping(address => uint256) public balanceOf;
        function create(address recipient, uint256 amount) external {
          totalSupply += amount;
          balanceOf[recipient] += amount;
        }
      }
    `);
    expect(
      result.findings.find(
        (finding) => finding.id === "solidity.supply.public-increase",
      ),
    ).toMatchObject({ state: "confirmed", severity: "critical" });
  });

  it("returns partial parse evidence for malformed Solidity instead of throwing", () => {
    const result = analyzeSoliditySources(
      "pragma solidity ^0.8.19; contract Broken { function nope( public {",
    );
    expect(result.status).toBe("partial");
    expect(result.issues.some((issue) => issue.code === "parse-error")).toBe(true);
    expect(result.files[0].parseStatus).not.toBe("parsed");
  });

  it("analyzes multiple named files and preserves evidence locations", () => {
    const result = analyzeSoliditySources([
      { name: "token/Normal.sol", content: NORMAL_OWNABLE_TOKEN },
      { name: "risk/Labels.sol", content: MISLEADING_NAMES_ONLY },
    ]);
    expect(result.status).toBe("complete");
    expect(result.stats).toMatchObject({ files: 2, contracts: 2 });
    expect(
      result.findings.some((finding) =>
        finding.evidence.some((evidence) => evidence.file === "risk/Labels.sol"),
      ),
    ).toBe(true);
  });

  it("resolves inherited controller modifiers across named source files", () => {
    const result = analyzeSoliditySources({
      "OwnerBase.sol": INHERITED_OWNER,
      "InheritedTradingGate.sol": INHERITED_TRADING_GATE,
    });
    expect(result.status).toBe("complete");
    expect(
      result.findings.find(
        (finding) => finding.id === "solidity.trading.mutable-gate",
      ),
    ).toMatchObject({ state: "confirmed", severity: "high" });
    expect(
      result.findings.find(
        (finding) => finding.id === "solidity.controller.independent",
      ),
    ).toBeUndefined();
  });

  it("rejects file, byte, and line limit violations before parsing", () => {
    const tooManyFiles = Array.from(
      { length: SOLIDITY_SOURCE_ANALYSIS_LIMITS.maxFiles + 1 },
      (_, index) => ({ name: `${index}.sol`, content: "pragma solidity ^0.8.19;" }),
    );
    expect(analyzeSoliditySources(tooManyFiles)).toMatchObject({
      status: "rejected",
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "file-limit" }),
      ]),
    });

    const tooManyBytes = "x".repeat(
      SOLIDITY_SOURCE_ANALYSIS_LIMITS.maxBytes + 1,
    );
    expect(analyzeSoliditySources(tooManyBytes)).toMatchObject({
      status: "rejected",
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "byte-limit" }),
      ]),
    });

    const tooManyLines = Array.from(
      { length: SOLIDITY_SOURCE_ANALYSIS_LIMITS.maxLines + 1 },
      () => "",
    ).join("\n");
    expect(analyzeSoliditySources(tooManyLines)).toMatchObject({
      status: "rejected",
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "line-limit" }),
      ]),
    });
  });
});
