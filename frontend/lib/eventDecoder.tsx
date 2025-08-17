// utils/eventDecoder.ts
import {
    Interface,
    EventFragment,
    Fragment,
    Result,
    InterfaceAbi,
    id,
  } from "ethers";
  
  export type RawEventLog = {
    index?: number;
    address: string;
    topics: string[];
    data: string;
  };
  
  export type DecodedEvent = {
    name: string;            // e.g. "Transfer"
    signature?: string;      // e.g. "Transfer(address,address,uint256)"
    argNames: string[];      // ["from","to","value"]
    argValues: any[];        // values (bigints stringified)
    address: string;
    index?: number;
    topic0?: string;
  };
  
  /** Parse "string | InterfaceAbi" safely into InterfaceAbi */
  function parseAbi(abiLike: InterfaceAbi | string): InterfaceAbi {
    if (Array.isArray(abiLike)) return abiLike as InterfaceAbi;
    if (typeof abiLike === "string") {
      try {
        return JSON.parse(abiLike) as InterfaceAbi;
      } catch {
        // sometimes ABIs are double-encoded strings
        try {
          const once = JSON.parse(abiLike) as string;
          return JSON.parse(once) as InterfaceAbi;
        } catch {
          throw new Error("Invalid ABI input: not a valid JSON string");
        }
      }
    }
    return abiLike;
  }
  
  function jsonSafe(v: any): any {
    if (typeof v === "bigint") return v.toString();
    if (Array.isArray(v)) return v.map(jsonSafe);
    if (v && typeof v === "object") {
      if ((v as Result)?.length !== undefined) {
        return Array.from(v as Result).map(jsonSafe);
      }
      const o: Record<string, any> = {};
      for (const [k, val] of Object.entries(v)) o[k] = jsonSafe(val);
      return o;
    }
    return v;
  }
  
  function eventSignature(frag: EventFragment): string {
    const types = frag.inputs.map((i) => i.type).join(",");
    return `${frag.name}(${types})`;
  }
  
  function eventTopicHash(frag: EventFragment): string {
    return id(eventSignature(frag)).toLowerCase();
  }
  
  /**
   * Decode a single event log using a provided ABI (string or InterfaceAbi).
   * Falls back to anonymous/manual topic matching if parseLog fails.
   */
  export function decodeEventLog(
    log: RawEventLog,
    abiLike: InterfaceAbi | string
  ): DecodedEvent {
    const abi = parseAbi(abiLike);
    const iface = new Interface(abi);
    const topic0 = log.topics?.[0]?.toLowerCase();
  
    // 1) Fast path: parseLog
    try {
      const desc = iface.parseLog({ topics: log.topics, data: log.data });
      if (desc) {
        const frag = desc.fragment as EventFragment;
        const argNames = frag.inputs.map((inp, i) => inp.name || `arg${i}`);
        const values = Array.from(desc.args).map(jsonSafe);
        return {
          name: frag.name,
          signature: eventSignature(frag),
          argNames,
          argValues: values,
          address: log.address,
          index: log.index,
          topic0,
        };
      }
    } catch {
      /* fall through to manual */
    }
  
    // 2) Manual match by topic0 across event fragments
    const eventFragments = iface.fragments.filter(
      (f: Fragment): f is EventFragment => f.type === "event"
    );
  
    if (topic0) {
      for (const frag of eventFragments) {
        try {
          if (!frag.anonymous) {
            const sigHash = eventTopicHash(frag);
            if (sigHash !== topic0) continue;
          }
          const decoded = iface.decodeEventLog(frag, log.data, log.topics);
          const argNames = frag.inputs.map((inp, i) => inp.name || `arg${i}`);
          const values = Array.from(decoded).map(jsonSafe);
          return {
            name: frag.name,
            signature: eventSignature(frag),
            argNames,
            argValues: values,
            address: log.address,
            index: log.index,
            topic0,
          };
        } catch {
          /* try next */
        }
      }
    }
  
    // 3) Anonymous-only attempt
    for (const frag of eventFragments.filter((f) => f.anonymous)) {
      try {
        const decoded = iface.decodeEventLog(frag, log.data, log.topics);
        const argNames = frag.inputs.map((inp, i) => inp.name || `arg${i}`);
        const values = Array.from(decoded).map(jsonSafe);
        return {
          name: frag.name,
          signature: eventSignature(frag),
          argNames,
          argValues: values,
          address: log.address,
          index: log.index,
          topic0,
        };
      } catch {
        /* continue */
      }
    }
  
    // 4) Could not decode
    return {
      name: `unknown${topic0 ? `(${topic0})` : ""}`,
      argNames: [],
      argValues: [],
      address: log.address,
      index: log.index,
      topic0,
    };
  }
  
  /** Batch helper */
  export function decodeEventLogs(
    logs: RawEventLog[],
    abiLike: InterfaceAbi | string
  ): DecodedEvent[] {
    return logs.map((l) => decodeEventLog(l, abiLike));
  }
  