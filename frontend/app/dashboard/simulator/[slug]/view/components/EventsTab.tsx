"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { InterfaceAbi } from "ethers";
import { decodeEventLog, RawEventLog } from "@/lib/eventDecoder";


type EventItem = RawEventLog;

type ContractMeta = {
  address: string;
  ABI?: string | InterfaceAbi;
  ContractName?: string;
  Proxy?: string | number;
  Implementation?: string;
};

type ContractsMap = Record<string, ContractMeta>;


function tryParseAbiString(s: string): InterfaceAbi | null {
  try {
    return JSON.parse(s);
  } catch {
    try {
      const once = JSON.parse(s);
      return JSON.parse(once);
    } catch {
      return null;
    }
  }
}

function normalizeAbi(abiLike: string | InterfaceAbi | null | undefined): InterfaceAbi | null {
  if (!abiLike) return null;
  if (Array.isArray(abiLike)) return abiLike as InterfaceAbi;
  if (typeof abiLike === "string") return tryParseAbiString(abiLike);
  return abiLike as InterfaceAbi;
}

function normAddr(a?: string) {
  return (a ?? "").toLowerCase();
}

function resolveAbiForAddress(
  addr: string,
  contracts: ContractsMap
): { abi: InterfaceAbi | null; name: string | null } {
  const key = normAddr(addr);
  const rec =
    contracts[key] ||
    Object.values(contracts).find((c) => normAddr(c.address) === key);

  if (!rec) return { abi: null, name: null };

  const isProxy = String(rec.Proxy ?? "0") === "1";
  if (isProxy && rec.Implementation) {
    const implKey = normAddr(rec.Implementation);
    const implRec =
      contracts[implKey] ||
      Object.values(contracts).find((c) => normAddr(c.address) === implKey);
    const implAbi = normalizeAbi(implRec?.ABI);
    if (implAbi) {
      return { abi: implAbi, name: implRec?.ContractName ?? rec.ContractName ?? null };
    }
  }

  const abi = normalizeAbi(rec.ABI);
  return { abi, name: rec.ContractName ?? null };
}

function shortAddr(a: string) {
  if (!a || a.length < 10) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
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

/* ----------------------- GLOBAL FALLBACK DECODE ----------------------- */

function tryDecodeWithAnyAbi(
  log: EventItem,
  contracts: ContractsMap
): { success: boolean; decoded?: ReturnType<typeof decodeEventLog>; name?: string | null } {
  for (const meta of Object.values(contracts)) {
    const abi = normalizeAbi(meta.ABI);
    if (!abi) continue;
    try {
      const decoded = decodeEventLog(log, abi);
      if (!decoded.name.startsWith("unknown(")) {
        return { success: true, decoded, name: meta.ContractName ?? null };
      }
    } catch {
      // keep trying
    }
  }
  return { success: false };
}

/* ------------------------------ Component ------------------------------ */

export default function EventsTab({ responseData }: { responseData: any }) {
  const events: EventItem[] =
    responseData?.transaction?.events ?? responseData?.events ?? [];

  const contracts: ContractsMap = responseData?.contracts ?? {};

  const decoded = useMemo(() => {
    return events.map((evt) => {
      const direct = resolveAbiForAddress(evt.address, contracts);

      let decoded:
        | ReturnType<typeof decodeEventLog>
        | {
            name: string;
            signature?: string;
            argNames: string[];
            argValues: any[];
            address: string;
            index?: number;
            topic0?: string;
          };

      let contractName: string | null = direct.name ?? null;

      if (direct.abi) {
        try {
          decoded = decodeEventLog(evt, direct.abi);
        } catch {
          decoded = {
            name: `unknown(${evt.topics?.[0] ?? ""})`,
            argNames: [],
            argValues: [],
            address: evt.address,
            index: evt.index,
            topic0: evt.topics?.[0],
          };
        }
      } else {
        decoded = {
          name: `unknown(${evt.topics?.[0] ?? ""})`,
          argNames: [],
          argValues: [],
          address: evt.address,
          index: evt.index,
          topic0: evt.topics?.[0],
        };
      }

      if (decoded.name.startsWith("unknown(")) {
        const alt = tryDecodeWithAnyAbi(evt, contracts);
        if (alt.success && alt.decoded) {
          decoded = alt.decoded;
          if (!contractName) contractName = alt.name ?? null;
        }
      }

      const args = decoded.argNames.map((n, i) => ({
        name: n,
        value: jsonSafe(decoded.argValues[i]),
      }));

      // display title rules: if unknown(xxx) => show just xxx (no brackets/label)
      let displayTitle = decoded.name;
      if (displayTitle.startsWith("unknown(")) {
        const topic = (decoded as any).topic0 ?? evt.topics?.[0] ?? "";
        displayTitle = topic || "0x";
      }

      return {
        raw: evt,
        pretty: {
          title: displayTitle,
          // signature removed per request
          args,
        },
        contractName: contractName ?? "Unknown",
        contractAddr: evt.address,
      };
    });
  }, [events, contracts]);

  if (!events?.length) {
    return (
      <div className="text-gray-400 text-center py-12">
        No events were emitted.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {decoded.map((row, i) => (
        <EventCard key={`${row.contractAddr}-${row.raw.index ?? i}-${i}`} row={row} />
      ))}
    </div>
  );
}


function EventCard({
  row,
}: {
  row: {
    raw: EventItem;
    pretty: { title: string; args: Array<{ name: string; value: any }> };
    contractName: string;
    contractAddr: string;
  };
}) {
  const [openRaw, setOpenRaw] = useState(false);

  return (
    <Card
      className="border"
      style={{ backgroundColor: "rgba(30,30,30,0.6)", borderColor: "var(--border)" }}
    >
      <CardContent className="p-3 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="text-lg font-semibold text-white">
              {row.pretty.title}
            </div>
          </div>

          <div className="text-right">
            <div
              className="inline-flex items-center px-2 py-1 rounded-md border text-xs"
              style={{ borderColor: "var(--border)" }}
            >
              <span className="text-gray-300 mr-2">{row.contractName}</span>
              <span className="text-gray-500 break-all">
                {shortAddr(row.contractAddr)}
              </span>
            </div>
          </div>
        </div>

        {/* Decoded args */}
        {row.pretty.args.length ? (
          <div
            className="rounded-lg border p-1"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "rgba(20,20,20,0.5)",
            }}
          >
            <pre className="text-sm text-gray-300 leading-6 whitespace-pre-wrap">
              {`{`}
              {row.pretty.args.map((p, idx) => (
                <div key={`${p.name}-${idx}`} className="flex">
                  <span className="text-gray-400">{`  `}</span>
                  <span className="text-green-300">{`"${p.name}"`}</span>
                  <span className="text-gray-300">{`: `}</span>
                  <span className="text-yellow-300">{`"`}</span>
                  <ValueClamp text={String(p.value)} />
                  <span className="text-yellow-300">{`"`}</span>
                  {idx < row.pretty.args.length - 1 && (
                    <span className="text-gray-300">{`,`}</span>
                  )}
                </div>
              ))}
              {`}`}
            </pre>
          </div>
        ) : (
          <div className="text-gray-400 text-sm">No indexed/decoded arguments.</div>
        )}

        {/* Raw toggle */}
        <div className="">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpenRaw((v) => !v)}
            className="px-2 text-gray-300 hover:text-white hover:bg-gray-800"
          >
            {openRaw ? (
              <ChevronUp className="h-4 w-4 mr-1" />
            ) : (
              <ChevronDown className="h-4 w-4 mr-1" />
            )}
            Show raw data and topics
          </Button>
        </div>

        {openRaw && (
          <div
            className="rounded-lg border p-4 space-y-3"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "rgba(20,20,20,0.5)",
            }}
          >
            <Section label="address" value={row.raw.address} />
            {"index" in row.raw && (
              <Section label="index" value={String(row.raw.index)} />
            )}
            <Section label="topics" value={row.raw.topics} isArray />
            <Section label="data" value={row.raw.data} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}


function ValueClamp({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const LIMIT = 66;

  const isLong = text.length > LIMIT;
  const shown = open ? text : isLong ? `${text.slice(0, 62)}…` : text;

  return (
    <div
      className={`text-blue-400 break-all inline cursor-pointer ${
        !open && isLong ? "underline decoration-dotted" : ""
      }`}
      onClick={() => setOpen((v) => !v)}
      title={isLong ? (open ? "Click to collapse" : "Click to expand") : undefined}
    >
      {shown}
    </div>
  );
}

function Section({
  label,
  value,
  isArray = false,
}: {
  label: string;
  value: string | string[];
  isArray?: boolean;
}) {
  return (
    <div className="text-xs">
      <div className="text-gray-400 mb-1">{label}</div>
      {isArray ? (
        <div className="space-y-1">
          {(value as string[]).map((v, i) => (
            <MonoClamp key={`${label}-${i}`} text={v} />
          ))}
        </div>
      ) : (
        <MonoClamp text={value as string} />
      )}
    </div>
  );
}

function MonoClamp({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const LIMIT = 66;
  const isLong = text.length > LIMIT;
  const shown = open ? text : isLong ? `${text.slice(0, 62)}…` : text;

  return (
    <div
      className={`text-gray-300 break-all font-mono cursor-pointer ${
        !open && isLong ? "underline decoration-dotted" : ""
      }`}
      onClick={() => setOpen((v) => !v)}
      title={isLong ? (open ? "Click to collapse" : "Click to expand") : undefined}
    >
      {shown}
    </div>
  );
}
