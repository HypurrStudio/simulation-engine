/*
 * Trace Decoder – Manual/Offline Mode (proxy-aware + global selector fallback)
 * Ethers v6
 */

import { Interface, getAddress } from "ethers";

/* ----------------------------- Types ----------------------------- */
export type RawCall = {
  from: string;
  to: string;
  input: string;          // 0x...
  output?: string;        // 0x...
  error?: string;
  type?: string;
  gas?: string | number; // hex or decimal
  gasUsed?: string | number; // hex or decimal
  value?: string | number; // hex or decimal
  calls?: RawCall[]; // child frames
};

export type DecodedNode = {
  from: string;
  to: string;
  gas?: string;
  gasUsed?: string;
  value?: string;         // decimal string (wei)

  // function metadata
  functionSelector?: string; // 0xXXXXXXXX
  functionName?: string; // e.g., transfer
  signature?: string; // e.g., transfer(address,uint256)
  type?: string;

  // decoded I/O
  inputRaw?: string;
  outputRaw?: string;
  inputDecoded?: any;
  outputDecoded?: any;

  children?: DecodedNode[];
  error?: string;
};

export type LocalContractRecord = {
  address: string;
  ABI?: string | any[];
  Proxy?: string | number;
  Implementation?: string;
};

/* ----------------------------- Utils ----------------------------- */
function toDecString(x?: string | number | null): string | undefined {
  if (x === undefined || x === null) return undefined;
  if (typeof x === "number") return String(x);
  const s = String(x);
  return s.startsWith("0x") ? BigInt(s).toString() : s;
}

function jsonSafe(v: any): any {
  if (typeof v === "bigint") return v.toString();
  if (Array.isArray(v)) return v.map(jsonSafe);
  if (v && typeof v === "object") {
    const o: Record<string, any> = {};
    for (const [k, val] of Object.entries(v)) o[k] = jsonSafe(val);
    return o;
  }
  return v;
}

/* ----------------------------- Decoder ----------------------------- */
export class TraceDecoderManual {
  private ifaceCacheByAddr = new Map<string, Interface>();   // normalized address -> iface (proxy-aware resolution)
  private ifacePool: Interface[] = [];                        // every ABI we could build, for selector fallback

  constructor(private contracts: Record<string, LocalContractRecord>) {
    // Prebuild a pool of interfaces from every ABI we can parse
    for (const [_addr, rec] of Object.entries(contracts)) {
      const abi = this.parseAbi(rec?.ABI);
      if (!abi) continue;
      try {
        const iface = new Interface(abi);
        this.ifacePool.push(iface);
      } catch {}
    }
  }

  private norm(addr: string): string {
    try { return getAddress(addr); } catch { return (addr || "").toLowerCase(); }
  }

  private parseAbi(abiLike?: string | any[]): any[] | null {
    if (!abiLike) return null;
    if (Array.isArray(abiLike)) return abiLike as any[];
    // string → JSON, sometimes double-encoded
    try { return JSON.parse(abiLike); } catch {}
    try {
      const once = JSON.parse(abiLike);
      return JSON.parse(once);
    } catch {}
    return null;
  }

  private getRecord(addr: string): LocalContractRecord | undefined {
    const target = this.norm(addr);
    for (const [k, rec] of Object.entries(this.contracts)) {
      if (this.norm(k) === target) return rec as LocalContractRecord;
    }
    return undefined;
  }

  private isProxy(rec?: LocalContractRecord): boolean {
    return String(rec?.Proxy ?? "0") === "1";
  }

  /** If proxy, prefer Implementation address; otherwise original addr */
  private resolveTargetAddress(addr: string): string {
    const rec = this.getRecord(addr);
    if (rec && this.isProxy(rec) && rec.Implementation) {
      return this.norm(rec.Implementation);
    }
    return this.norm(addr);
  }

  /** Build or fetch the interface “expected” for an address, proxy-aware */
  private resolveInterface(addr: string): Interface | null {
    const normAddr = this.norm(addr);
    if (this.ifaceCacheByAddr.has(normAddr)) return this.ifaceCacheByAddr.get(normAddr)!;

    const rec = this.getRecord(normAddr);
    const implAddr = this.resolveTargetAddress(normAddr);

    // try implementation record first, then proxy record
    const implRec = this.getRecord(implAddr);
    const abi =
      this.parseAbi(implRec?.ABI) ??
      this.parseAbi(rec?.ABI);

    if (!abi) return null;

    try {
      const iface = new Interface(abi);
      // cache on both keys so subsequent resolves are cheap
      this.ifaceCacheByAddr.set(normAddr, iface);
      this.ifaceCacheByAddr.set(implAddr, iface);
      return iface;
    } catch {
      return null;
    }
  }

  /** Global fallback: scan every interface and pick the first that can parse this calldata */
  private findInterfaceForData(data: string): { iface: Interface; parsed: ReturnType<Interface["parseTransaction"]> } | null {
    for (const iface of this.ifacePool) {
      try {
        const parsed = iface.parseTransaction({ data });
        if (parsed) return { iface, parsed };
      } catch {
        // try next
      }
    }
    return null;
  }

  private decodeOutputs(iface: Interface, parsedName: string, rawOut?: string): any | undefined {
    if (!rawOut || rawOut === "0x") return undefined;
    try {
      const fn = iface.getFunction(parsedName);
      if (!fn) return undefined;
      const decoded = iface.decodeFunctionResult(fn, rawOut);
      return jsonSafe(decoded);
    } catch {
      return undefined;
    }
  }

  private async decodeFrame(node: RawCall): Promise<DecodedNode> {
    const out: DecodedNode = {
      from: node.from,
      to: node.to,
      gas: toDecString(node.gas),
      gasUsed: toDecString(node.gasUsed),
      value: toDecString(node.value),
      type: node.type,
      error: node.error,
      inputRaw: node.input ?? "0x",
      outputRaw: node.output ?? "0x",
    };

    const data = (node.input ?? "0x").toLowerCase();
    if (data && data !== "0x" && data.length >= 10) {
      out.functionSelector = "0x" + data.slice(2, 10);
    }

    // 1) Try proxy-aware interface for the "to" address
    let iface = this.resolveInterface(out.to);
    let parsed: ReturnType<Interface["parseTransaction"]> | null = null;

    if (iface) {
      try {
        parsed = iface.parseTransaction({ data });
      } catch {
        parsed = null;
      }
    }

    // 2) If that failed, try global selector-based fallback pool
    if (!parsed) {
      const fallback = this.findInterfaceForData(data);
      if (fallback) {
        iface = fallback.iface;
        parsed = fallback.parsed;
      }
    }

    // 3) If we managed to parse inputs, also decode outputs with the *same* iface
    if (parsed && iface) {
      out.functionName = parsed.name;
      out.signature = parsed.signature;
      out.inputDecoded = jsonSafe(parsed.args);

      const outDecoded = this.decodeOutputs(iface, parsed.name, node.output);
      if (outDecoded !== undefined) {
        out.outputDecoded = outDecoded;
      }
    }

    // 4) Recurse children
    if (Array.isArray(node.calls) && node.calls.length) {
      out.children = [];
      for (const c of node.calls) {
        out.children.push(await this.decodeFrame(c));
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

/* -------- Legacy convenience (unchanged shape for callers) -------- */
export function decodeWholeExport(data: any): any {
  const contracts: Record<string, LocalContractRecord> = {};

  if (data.contracts) {
    Object.entries(data.contracts).forEach(([addr, contract]: [string, any]) => {
      contracts[addr] = {
        address: addr,
        ABI: contract.ABI,
        Implementation: contract.Implementation,
        Proxy: contract.Proxy || (contract.Implementation ? "1" : "0"),
      };
    });
  }

  const manual = new TraceDecoderManual(contracts);

  const convertCallTrace = (trace: any): RawCall => ({
    from: trace?.from || "",
    to: trace?.to || "",
    input: trace?.input || "0x",
    output: trace?.output || "0x",
    gas: trace?.gas ?? trace?.gasUsed ?? trace?.gas_used,
    gasUsed: trace?.gas_used ?? trace?.gasUsed ?? trace?.gas,
    error: trace?.error,
    value: trace?.value,
    calls: Array.isArray(trace?.calls) ? trace.calls.map(convertCallTrace) : undefined,
  });

  const rawTrace = data.transaction?.callTrace ? convertCallTrace(data.transaction.callTrace[0]) : null;

  return {
    meta: { decoder: "ethers-v6-manual", proxyAware: true, selectorFallback: true },
    transaction: {
      from: data.transaction?.from,
      to: data.transaction?.to,
      selector: (data.transaction?.input || "").slice(0, 10),
      value: data.transaction?.value,
      gas: data.transaction?.gas,
      error: data.transaction?.error,
      outputRaw: data.transaction?.output || "0x",
      timestamp: data.transaction?.timestamp,
      blockHeader: data.transaction?.blockHeader || {},
    },
    decodedTree: rawTrace ? manual.decodeTrace(rawTrace) : null,
  };
}

export default decodeWholeExport;
