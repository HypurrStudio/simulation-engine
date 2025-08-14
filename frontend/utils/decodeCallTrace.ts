/*
 * Trace Decoder – Manual/Offline Mode
 * Decodes entire call trace trees using local contract metadata (ABI, Proxy, Implementation)
 * No network calls needed - everything comes from your local data
 *
 * Works with: geth/parity style traces that have { from, to, gas, gasUsed, input, output, calls[] }
 * Ethers: v6
 */

import { Interface, getAddress } from "ethers";

// ----------------------------- Types -----------------------------
export type RawCall = {
  from: string;
  to: string;
  input: string; // 0x...
  output?: string; // 0x...
  gas?: string | number; // hex or decimal
  gasUsed?: string | number; // hex or decimal
  value?: string | number; // hex or decimal
  calls?: RawCall[]; // child frames
};

export type DecodedNode = {
  from: string;
  to: string;
  gas?: string; // decimal string
  gasUsed?: string; // decimal string
  value?: string; // decimal string (wei)

  // function metadata
  functionSelector?: string; // 0xXXXXXXXX
  functionName?: string; // e.g., transfer
  signature?: string; // e.g., transfer(address,uint256)

  // decoded I/O
  inputRaw?: string;
  outputRaw?: string;
  inputDecoded?: any; // JSON-safe, bigints -> strings
  outputDecoded?: any; // JSON-safe, bigints -> strings

  children?: DecodedNode[];
};

export type LocalContractRecord = {
  address: string; // checksummed or lowercase ok
  ABI?: string | any[]; // may be a JSON string with escapes
  Proxy?: string | number; // "1" means proxy, "0" or undefined means not a proxy
  Implementation?: string; // implementation address if proxy
};

// ----------------------------- Utilities -----------------------------
function toDecString(x?: string | number | null): string | undefined {
  if (x === undefined || x === null) return undefined;
  if (typeof x === "number") return String(x);
  const s = String(x);
  if (s.startsWith("0x")) return BigInt(s).toString();
  return s;
}

function jsonSafe(v: any): any {
  if (typeof v === "bigint") return v.toString();
  if (Array.isArray(v)) return v.map(x => jsonSafe(x));
  if (v && typeof v === "object") {
    const o: Record<string, any> = {};
    for (const [k, val] of Object.entries(v)) o[k] = jsonSafe(val);
    return o;
  }
  return v;
}

// ----------------------------- Manual Decoder -----------------------------
export class TraceDecoderManual {
  private ifaceCache = new Map<string, Interface>(); // normalized address -> Interface

  constructor(private contracts: Record<string, LocalContractRecord>) {}

  private norm(addr: string): string {
    try { return getAddress(addr); } catch { return addr.toLowerCase(); }
  }

  private parseAbi(abiLike?: string | any[]): any[] | null {
    if (!abiLike) return null;
    if (Array.isArray(abiLike)) return abiLike as any[];
    // It's a string – could be double-escaped
    try { return JSON.parse(abiLike); } catch {}
    try {
      const once = JSON.parse(abiLike);
      return JSON.parse(once);
    } catch {}
    return null;
  }

  private getRecord(addr: string): LocalContractRecord | undefined {
    const keys = Object.keys(this.contracts);
    const target = this.norm(addr);
    return this.contracts[keys.find(k => this.norm(k) === target) ?? ""];
  }

  private resolveTargetAddress(addr: string): string {
    const rec = this.getRecord(addr);
    if (!rec) return this.norm(addr);
    const isProxy = String(rec.Proxy ?? "0") === "1";
    if (isProxy && rec.Implementation) return this.norm(rec.Implementation);
    return this.norm(addr);
  }

  private resolveInterface(addr: string): Interface | null {
    const normAddr = this.norm(addr);
    if (this.ifaceCache.has(normAddr)) return this.ifaceCache.get(normAddr)!;

    // If proxy, use implementation ABI
    const implAddr = this.resolveTargetAddress(normAddr);
    const implRec = this.getRecord(implAddr) ?? this.getRecord(normAddr);
    const abi = this.parseAbi(implRec?.ABI);
    if (!abi) return null;

    const iface = new Interface(abi);
    this.ifaceCache.set(normAddr, iface);
    this.ifaceCache.set(implAddr, iface);
    return iface;
  }

  private async decodeFrame(node: RawCall): Promise<DecodedNode> {
    const out: DecodedNode = {
      from: node.from,
      to: node.to,
      gas: toDecString(node.gas),
      gasUsed: toDecString(node.gasUsed),
      value: toDecString(node.value),
      inputRaw: node.input,
      outputRaw: node.output,
    };

    const iface = this.resolveInterface(out.to);
    const input = (node.input ?? "0x").toLowerCase();
    if (input && input !== "0x" && input.length >= 10) out.functionSelector = "0x" + input.slice(2, 10);

    if (iface && input && input !== "0x") {
      try {
        const parsed = iface.parseTransaction({ data: input });
        if (parsed) {
          out.functionName = parsed.name;
          out.signature = parsed.signature;
          out.inputDecoded = jsonSafe(parsed.args);

          if (node.output && node.output !== "0x") {
            try {
              const fn = iface.getFunction(parsed.name);
              if (fn) {
                const decodedOut = iface.decodeFunctionResult(fn, node.output);
                out.outputDecoded = jsonSafe(decodedOut);
              }
            } catch {}
          }
        }
      } catch {}
    }

    // Recurse through all children
    if (node.calls?.length) {
      out.children = [];
      for (const c of node.calls) {
        const childNode = await this.decodeFrame(c);
        out.children.push(childNode);
      }
    }

    return out;
  }

  async decodeTrace(trace: RawCall[] | RawCall): Promise<DecodedNode[] | DecodedNode> {
    if (Array.isArray(trace)) {
      const res: DecodedNode[] = [];
      for (const t of trace) res.push(await this.decodeFrame(t));
      return res;
    }
    return await this.decodeFrame(trace);
  }
}

// Legacy compatibility function for existing code
export function decodeWholeExport(data: any): any {
  // Convert the old format to the new format
  const contracts: Record<string, LocalContractRecord> = {};
  
  if (data.contracts) {
    Object.entries(data.contracts).forEach(([addr, contract]: [string, any]) => {
      contracts[addr] = {
        address: addr,
        ABI: contract.ABI,
        Implementation: contract.Implementation,
        Proxy: contract.Proxy || (contract.Implementation ? "1" : "0")
      };
    });
  }

  const manual = new TraceDecoderManual(contracts);
  
  // Convert callTrace to RawCall format
  const convertCallTrace = (trace: any): RawCall => ({
    from: trace.from || "",
    to: trace.to || "",
    input: trace.input || "0x",
    output: trace.output || "0x",
    gas: trace.gas,
    gasUsed: trace.gas_used,
    value: trace.value,
    calls: trace.calls ? trace.calls.map(convertCallTrace) : undefined
  });

  const rawTrace = data.transaction?.callTrace ? convertCallTrace(data.transaction.callTrace[0]) : null;
  
  return {
    meta: {
      decoder: "ethers-v6-manual",
      proxyAware: true,
      skipWhenAbiMissing: true,
    },
    transaction: {
      from: data.transaction?.from,
      to: data.transaction?.to,
      selector: (data.transaction?.input || "").slice(0, 10),
      value: data.transaction?.value,
      gas: data.transaction?.gas,
      outputRaw: data.transaction?.output || "0x",
      timestamp: data.transaction?.timestamp,
      blockHeader: data.transaction?.blockHeader || {},
    },
    decodedTree: rawTrace ? manual.decodeTrace(rawTrace) : null,
  };
}

export default decodeWholeExport;
