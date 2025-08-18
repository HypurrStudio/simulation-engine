"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Loader2, Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import {
  fetchContractABI,
  ContractABI,
  EtherscanFunction,
  getFunctionDisplayName,
  encodeFunctionCall,
} from "@/lib/etherscan";

function serializeToQuery(
  form: {
    from: string;
    to: string;
    input: string;
    value: string;
    gas: string;
    gasPrice: string;
    blockNumber: string;
  },
  hypeBalanceOverrides: Array<{ key: string; value: string }>,
  stateOverrideContracts: Array<{
    address: string;
    storageOverrides: Array<{ key: string; value: string }>;
  }>
) {
  // Build stateObjects like your submit path does
  const stateObjects: Record<
    string,
    { balance?: string; stateDiff?: Record<string, string> }
  > = {};
  const ensure0x = (v: string) =>
    v?.startsWith("0x") || v?.startsWith("0X") ? v : `0x${v || "0"}`;

  // balances
  for (const { key, value } of hypeBalanceOverrides) {
    const addr = (key || "").trim();
    const bal = (value || "").trim();
    if (!addr || !bal) continue;
    if (!stateObjects[addr]) stateObjects[addr] = {};
    stateObjects[addr].balance = bal;
  }
  // storage
  for (const c of stateOverrideContracts) {
    const addr = (c.address || "").trim();
    if (!addr) continue;
    const diff: Record<string, string> = {};
    for (const { key, value } of c.storageOverrides || []) {
      const k = (key || "").trim();
      const v = (value || "").trim();
      if (!k || !v) continue;
      diff[ensure0x(k)] = ensure0x(v);
    }
    if (Object.keys(diff).length) {
      if (!stateObjects[addr]) stateObjects[addr] = {};
      stateObjects[addr].stateDiff = {
        ...(stateObjects[addr].stateDiff || {}),
        ...diff,
      };
    }
  }

  const qs = new URLSearchParams();
  if (form.blockNumber) qs.set("block", form.blockNumber.trim());
  if (form.from) qs.set("from", form.from.trim());
  if (form.to) qs.set("to", form.to.trim());
  if (form.gas) qs.set("gas", form.gas.trim());
  if (form.gasPrice) qs.set("gasPrice", form.gasPrice.trim());
  if (form.value) qs.set("value", form.value.trim());
  if (form.input) qs.set("input", form.input.trim());
  if (Object.keys(stateObjects).length) {
    qs.set("stateOverrides", JSON.stringify(stateObjects));
  }
  return qs.toString();
}

function deserializeFromQuery(searchParams: URLSearchParams) {
  const form = {
    from: searchParams.get("from") || "",
    to: searchParams.get("to") || "",
    input: searchParams.get("input") || "",
    value: searchParams.get("value") || "",
    gas: searchParams.get("gas") || "",
    gasPrice: searchParams.get("gasPrice") || "",
    blockNumber: searchParams.get("block") || "",
  };

  let hypeBalanceOverrides: Array<{ key: string; value: string }> = [];
  let stateOverrideContracts: Array<{
    address: string;
    storageOverrides: Array<{ key: string; value: string }>;
  }> = [];

  const so = searchParams.get("stateOverrides");
  if (so) {
    try {
      const parsed = JSON.parse(so) as Record<
        string,
        { balance?: string; stateDiff?: Record<string, string> }
      >;
      // balances → hypeBalanceOverrides
      hypeBalanceOverrides = Object.entries(parsed)
        .filter(([_, o]) => o.balance)
        .map(([address, o]) => ({ key: address, value: o.balance as string }));

      // stateDiff → stateOverrideContracts (group by address)
      const stor: Array<{
        address: string;
        balanceOverrides: Array<{ key: string; value: string }>;
        storageOverrides: Array<{ key: string; value: string }>;
      }> = [];

      for (const [address, o] of Object.entries(parsed)) {
        if (o.stateDiff && Object.keys(o.stateDiff).length) {
          stor.push({
            address,
            balanceOverrides: [], // <-- ensure this key exists per your state type
            storageOverrides: Object.entries(o.stateDiff).map(([k, v]) => ({
              key: k,
              value: v,
            })),
          });
        }
      }
      stateOverrideContracts = stor;
    } catch {}
  }
  return { form, hypeBalanceOverrides, stateOverrideContracts };
}

export default function SimulatorPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "v1";

  const [formData, setFormData] = useState({
    from: "",
    to: "",
    input: "",
    value: "",
    gas: "",
    gasPrice: "",
    blockNumber: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [inputType, setInputType] = useState<"function" | "raw">("function");
  const [transactionParamsExpanded, setTransactionParamsExpanded] =
    useState(true);
  const [inputOrigin, setInputOrigin] = useState<
    "hydrate" | "raw" | "function" | null
  >(null);

  // Etherscan ABI
  const [contractABI, setContractABI] = useState<ContractABI | null>(null);
  const [isLoadingABI, setIsLoadingABI] = useState(false);
  const [selectedFunction, setSelectedFunction] =
    useState<EtherscanFunction | null>(null);
  const [functionParameters, setFunctionParameters] = useState<
    Array<{ name: string; type: string; value: string }>
  >([]);

  // Hype Balance State
  const [hypeBalanceExpanded, setHypeBalanceExpanded] = useState(false);
  const [hypeBalanceOverrides, setHypeBalanceOverrides] = useState<
    Array<{ key: string; value: string }>
  >([]);

  // State Override (per-contract storage overrides)
  const [stateOverrideContracts, setStateOverrideContracts] = useState<
    Array<{
      address: string;
      balanceOverrides: Array<{ key: string; value: string }>;
      storageOverrides: Array<{ key: string; value: string }>;
    }>
  >([]);

  useEffect(() => {
    // Only hydrate if URL has meaningful params
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if ([...sp.keys()].length === 0) return;

    const {
      form,
      hypeBalanceOverrides: balances,
      stateOverrideContracts: stor,
    } = deserializeFromQuery(sp);

    setFormData((prev) => ({ ...prev, ...form }));
    setHypeBalanceOverrides(balances);
    // Ensure every contract object has balanceOverrides: []
    const storNorm = (
      stor as Array<{
        address: string;
        storageOverrides: { key: string; value: string }[];
        balanceOverrides?: { key: string; value: string }[];
      }>
    ).map((c) => ({
      address: c.address,
      storageOverrides: c.storageOverrides ?? [],
      balanceOverrides: c.balanceOverrides ?? [], // <-- add default
    }));

    setStateOverrideContracts(storNorm);
    setInputOrigin("hydrate");
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const qs = serializeToQuery(
        formData,
        hypeBalanceOverrides,
        stateOverrideContracts
      );
      const nextSlug = "v1";
      // avoid infinite replaces: only replace if URL differs
      const next = `/dashboard/simulator/${encodeURIComponent(nextSlug)}?${qs}`;
      const current = `${window.location.pathname}${window.location.search}`;
      if (next !== current) {
        // soft replace — same page, new URL
        router.replace(next, { scroll: false });
      }
    }, 350); // debounce a bit

    return () => clearTimeout(t);
  }, [formData, hypeBalanceOverrides, stateOverrideContracts, router]);

  useEffect(() => {
    const fetchABI = async () => {
      if (!formData.to.trim()) {
        setContractABI(null);
        setSelectedFunction(null);
        setFunctionParameters([]);
        return;
      }
      setIsLoadingABI(true);
      try {
        const abi = await fetchContractABI(formData.to);
        setContractABI(abi);
        setSelectedFunction(null);
        setFunctionParameters([]);
      } catch (error) {
        console.error("Error fetching ABI:", error);
        setContractABI(null);
      } finally {
        setIsLoadingABI(false);
      }
    };
    const timeoutId = setTimeout(fetchABI, 1000);
    return () => clearTimeout(timeoutId);
  }, [formData.to]);

  useEffect(() => {
    if (selectedFunction) {
      const params = selectedFunction.inputs.map((input, index) => ({
        name: input.name || `param${index}`,
        type: input.type,
        value: "",
      }));
      setFunctionParameters(params);
    } else {
      setFunctionParameters([]);
    }
  }, [selectedFunction]);

  useEffect(() => {
    if (selectedFunction && contractABI) {
      const encodedInput = encodeFunctionCall(
        selectedFunction.name,
        functionParameters,
        contractABI
      );
      setInputOrigin("function");

      setFormData((prev) => ({ ...prev, input: encodedInput }));
    }
  }, [selectedFunction, functionParameters, contractABI]);

  // replace your previous auto-raw effect with:
  useEffect(() => {
    if (!formData.input || formData.input.trim() === "") return;

    // Only flip to RAW if the latest writer was URL hydration or the user editing the raw box.
    if (inputOrigin === "hydrate" || inputOrigin === "raw") {
      setInputType("raw");
    }
    // If the function encoder wrote it, do nothing (stay on "function").
  }, [formData.input, inputOrigin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const qs = serializeToQuery(
        formData,
        hypeBalanceOverrides,
        stateOverrideContracts
      );
      const slug = "v1";
      router.push(
        `/dashboard/simulator/${encodeURIComponent(slug)}/view?${qs}`
      );
    } catch (err) {
      console.error(err);
      alert("Could not prepare the shareable URL.");
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------- UI Events ----------------
  const handleFunctionSelect = (functionName: string) => {
    if (contractABI) {
      const func = contractABI.functions.find((f) => f.name === functionName);
      setSelectedFunction(func || null);
    }
  };

  const handleParameterChange = (index: number, value: string) => {
    const updatedParams = [...functionParameters];
    updatedParams[index].value = value;
    setFunctionParameters(updatedParams);
  };

  const isLeftSideComplete =
    formData.to.trim() !== "" &&
    ((inputType === "function" && selectedFunction) ||
      (inputType === "raw" && formData.input.trim() !== ""));

  // ---------------- Render ----------------
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-2">
        <h1 className="text-3xl font-bold">New Simulation</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Left Column - Contract */}
          <div className="space-y-6">
            <Card
              className="border"
              style={{
                backgroundColor: "rgba(30, 30, 30, 0.6)",
                borderColor: "var(--border)",
                backdropFilter: "blur(10px)",
              }}
            >
              <CardHeader>
                <CardTitle
                  className="text-primary"
                  style={{ color: "var(--text-primary)" }}
                >
                  Contract
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label
                    className="text-secondary mb-2 block"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Contract Address
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="0x..."
                      value={formData.to}
                      onChange={(e) =>
                        setFormData({ ...formData, to: e.target.value })
                      }
                      className="border"
                      style={{
                        backgroundColor: "var(--bg-primary)",
                        borderColor: "var(--border)",
                        color: "var(--text-primary)",
                        opacity: 0.8,
                      }}
                      required
                    />
                    {isLoadingABI && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>
                  {contractABI && (
                    <p className="text-xs text-green-400 mt-1">
                      ✓ Contract verified on Etherscan
                    </p>
                  )}
                  {formData.to.trim() && !isLoadingABI && !contractABI && (
                    <p className="text-xs text-yellow-400 mt-1">
                      ⚠ Contract not verified or not found
                    </p>
                  )}
                </div>

                <div>
                  <Label
                    className="text-secondary mb-2 block"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Network
                  </Label>
                  <Select>
                    <SelectTrigger
                      className="border"
                      style={{
                        backgroundColor: "var(--bg-primary)",
                        borderColor: "var(--border)",
                        color: "var(--text-primary)",
                        opacity: 0.8,
                      }}
                    >
                      <SelectValue placeholder="HyperEVM Mainnet" />
                    </SelectTrigger>
                    <SelectContent
                      className="border"
                      style={{
                        backgroundColor: "var(--bg-primary)",
                        borderColor: "var(--border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <SelectItem value="HyperEVM_Mainnet">
                        HyperEVM Mainnet
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Function / Raw */}
                {formData.to.trim() !== "" && (
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="function"
                          name="inputType"
                          checked={inputType === "function"}
                          onChange={() => {
                            setInputType("function");
                            setInputOrigin("function");
                          }}
                          style={{ accentColor: "var(--color-primary)" }}
                        />
                        <Label
                          htmlFor="function"
                          className="text-secondary"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Choose function and parameters
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="raw"
                          name="inputType"
                          checked={inputType === "raw"}
                          onChange={() => {
                            setInputType("raw");
                            setInputOrigin("raw");
                          }}
                          style={{ accentColor: "var(--color-primary)" }}
                        />
                        <Label
                          htmlFor="raw"
                          className="text-secondary"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Enter raw input data
                        </Label>
                      </div>
                    </div>

                    {inputType === "function" && (
                      <div>
                        <Label
                          className="text-secondary mb-2 block"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Select function
                        </Label>
                        {isLoadingABI ? (
                          <div
                            className="flex items-center space-x-2 p-3 border rounded"
                            style={{
                              backgroundColor: "var(--bg-primary)",
                              borderColor: "var(--border)",
                            }}
                          >
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm text-gray-400">
                              Loading functions...
                            </span>
                          </div>
                        ) : contractABI ? (
                          <Select onValueChange={handleFunctionSelect}>
                            <SelectTrigger
                              className="border"
                              style={{
                                backgroundColor: "var(--bg-primary)",
                                borderColor: "var(--border)",
                                color: "var(--text-primary)",
                                opacity: 0.8,
                              }}
                            >
                              <SelectValue placeholder="Select a function" />
                            </SelectTrigger>
                            <SelectContent
                              className="border"
                              style={{
                                backgroundColor: "var(--bg-primary)",
                                borderColor: "var(--border)",
                                color: "var(--text-primary)",
                              }}
                            >
                              {contractABI.functions.map((func, index) => (
                                <SelectItem key={index} value={func.name}>
                                  {getFunctionDisplayName(func)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div
                            className="p-3 border rounded text-sm text-gray-400"
                            style={{
                              backgroundColor: "var(--bg-primary)",
                              borderColor: "var(--border)",
                            }}
                          >
                            Enter a verified contract address to load functions
                          </div>
                        )}

                        {selectedFunction && functionParameters.length > 0 && (
                          <div className="mt-4">
                            <Label
                              className="text-secondary mb-2 block"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              Function Parameters
                            </Label>
                            <div className="space-y-2">
                              {functionParameters.map((param, index) => (
                                <div key={index}>
                                  <Label className="text-xs text-gray-400 block mb-1">
                                    {param.name} ({param.type})
                                  </Label>
                                  <Input
                                    placeholder={`Enter ${param.name}`}
                                    value={param.value}
                                    onChange={(e) =>
                                      handleParameterChange(
                                        index,
                                        e.target.value
                                      )
                                    }
                                    className="border text-sm"
                                    style={{
                                      backgroundColor: "var(--bg-primary)",
                                      borderColor: "var(--border)",
                                      color: "var(--text-primary)",
                                      opacity: 0.8,
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {inputType === "raw" && (
                      <div>
                        <Label
                          className="text-secondary mb-2 block"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Raw input data
                        </Label>
                        <Textarea
                          placeholder="Enter raw input data (hex format)"
                          value={formData.input}
                          onChange={(e) => {
                            setInputOrigin("raw");
                            setFormData({ ...formData, input: e.target.value });
                          }}
                          className="border"
                          style={{
                            backgroundColor: "var(--bg-primary)",
                            borderColor: "var(--border)",
                            color: "var(--text-primary)",
                            opacity: 0.8,
                            minHeight: "100px",
                          }}
                          required
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <Card
              className="border"
              style={{
                backgroundColor: "rgba(30, 30, 30, 0.6)",
                borderColor: "var(--border)",
                backdropFilter: "blur(10px)",
                opacity: isLeftSideComplete ? 1 : 0.5,
                pointerEvents: isLeftSideComplete ? "auto" : "none",
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle
                  className="text-primary"
                  style={{ color: "var(--text-primary)" }}
                >
                  Transaction Parameters
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setTransactionParamsExpanded(!transactionParamsExpanded);
                  }}
                  style={{ color: "var(--text-secondary)" }}
                  disabled={!isLeftSideComplete}
                >
                  {transactionParamsExpanded ? <ChevronUp /> : <ChevronDown />}
                </Button>
              </CardHeader>
              {transactionParamsExpanded && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label
                        className="text-secondary"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Block Number
                      </Label>
                      <Input
                        placeholder="/"
                        value={formData.blockNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            blockNumber: e.target.value,
                          })
                        }
                        className="border"
                        disabled={!isLeftSideComplete}
                        style={{
                          backgroundColor: "var(--bg-primary)",
                          borderColor: "var(--border)",
                          color: "var(--text-primary)",
                          opacity: 0.8,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <Label
                      className="text-secondary"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      From
                    </Label>
                    <Input
                      placeholder="0x..."
                      value={formData.from}
                      onChange={(e) =>
                        setFormData({ ...formData, from: e.target.value })
                      }
                      className="border"
                      disabled={!isLeftSideComplete}
                      style={{
                        backgroundColor: "var(--bg-primary)",
                        borderColor: "var(--border)",
                        color: "var(--text-primary)",
                        opacity: 0.8,
                      }}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label
                        className="text-secondary"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Gas
                      </Label>
                      <Input
                        defaultValue="8000000"
                        value={formData.gas}
                        onChange={(e) =>
                          setFormData({ ...formData, gas: e.target.value })
                        }
                        className="border"
                        disabled={!isLeftSideComplete}
                        style={{
                          backgroundColor: "var(--bg-primary)",
                          borderColor: "var(--border)",
                          color: "var(--text-primary)",
                          opacity: 0.8,
                        }}
                        required
                      />
                    </div>
                    <div>
                      <Label
                        className="text-secondary"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Gas Price
                      </Label>
                      <Input
                        defaultValue="0"
                        value={formData.gasPrice}
                        onChange={(e) =>
                          setFormData({ ...formData, gasPrice: e.target.value })
                        }
                        className="border"
                        disabled={!isLeftSideComplete}
                        style={{
                          backgroundColor: "var(--bg-primary)",
                          borderColor: "var(--border)",
                          color: "var(--text-primary)",
                          opacity: 0.8,
                        }}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label
                      className="text-secondary"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Value
                    </Label>
                    <Input
                      placeholder="Enter raw value (e.g., 41355259822160)"
                      value={formData.value}
                      onChange={(e) =>
                        setFormData({ ...formData, value: e.target.value })
                      }
                      className="border"
                      disabled={!isLeftSideComplete}
                      style={{
                        backgroundColor: "var(--bg-primary)",
                        borderColor: "var(--border)",
                        color: "var(--text-primary)",
                        opacity: 0.8,
                      }}
                      required
                    />
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Hype Balance State */}
            <Card
              className="border"
              style={{
                backgroundColor: "rgba(30, 30, 30, 0.6)",
                borderColor: "var(--border)",
                backdropFilter: "blur(10px)",
                opacity: isLeftSideComplete ? 1 : 0.5,
                pointerEvents: isLeftSideComplete ? "auto" : "none",
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pt-2 pb-2">
                <CardTitle
                  className="text-primary"
                  style={{ color: "var(--text-primary)" }}
                >
                  Hype Balance State
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setHypeBalanceExpanded(!hypeBalanceExpanded);
                  }}
                  className="h-8 w-8 p-0"
                  style={{ color: "var(--text-secondary)" }}
                  disabled={!isLeftSideComplete}
                >
                  {hypeBalanceExpanded ? <ChevronUp /> : <ChevronDown />}
                </Button>
              </CardHeader>
              {hypeBalanceExpanded && (
                <CardContent className="space-y-4">
                  {hypeBalanceOverrides.map((override, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        placeholder="Address (0x...)"
                        value={override.key}
                        onChange={(e) => {
                          const newOverrides = [...hypeBalanceOverrides];
                          newOverrides[index].key = e.target.value;
                          setHypeBalanceOverrides(newOverrides);
                        }}
                        className="border flex-1"
                        style={{
                          backgroundColor: "var(--bg-primary)",
                          borderColor: "var(--border)",
                          color: "var(--text-primary)",
                          opacity: 0.8,
                        }}
                      />
                      <Input
                        placeholder="Balance (wei, hex or decimal)"
                        value={override.value}
                        onChange={(e) => {
                          const newOverrides = [...hypeBalanceOverrides];
                          newOverrides[index].value = e.target.value;
                          setHypeBalanceOverrides(newOverrides);
                        }}
                        className="border flex-1"
                        style={{
                          backgroundColor: "var(--bg-primary)",
                          borderColor: "var(--border)",
                          color: "var(--text-primary)",
                          opacity: 0.8,
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const newOverrides = hypeBalanceOverrides.filter(
                            (_, i) => i !== index
                          );
                          setHypeBalanceOverrides(newOverrides);
                        }}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setHypeBalanceOverrides([
                        ...hypeBalanceOverrides,
                        { key: "", value: "" },
                      ]);
                    }}
                    className="w-full"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Hype Balance Override
                  </Button>
                </CardContent>
              )}
            </Card>

            {/* State Override */}
            <Card
              className="border"
              style={{
                backgroundColor: "rgba(30, 30, 30, 0.6)",
                borderColor: "var(--border)",
                backdropFilter: "blur(10px)",
                opacity: isLeftSideComplete ? 1 : 0.5,
                pointerEvents: isLeftSideComplete ? "auto" : "none",
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pt-4 pb-2">
                <CardTitle
                  className="text-primary"
                  style={{ color: "var(--text-primary)" }}
                >
                  State Override
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setStateOverrideContracts([
                      ...stateOverrideContracts,
                      {
                        address: "",
                        balanceOverrides: [],
                        storageOverrides: [],
                      },
                    ]);
                  }}
                  className="h-6"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contract
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {stateOverrideContracts.map((contract, contractIndex) => (
                  <div
                    key={contractIndex}
                    className="border border-gray-600 rounded-xl p-4 mt-1 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-white">
                        Contract {contractIndex + 1}
                      </h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const newContracts = stateOverrideContracts.filter(
                            (_, i) => i !== contractIndex
                          );
                          setStateOverrideContracts(newContracts);
                        }}
                        className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                      >
                        ×
                      </Button>
                    </div>

                    {/* Contract Address */}
                    <div>
                      <Label
                        className="text-secondary mb-2 block"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Contract Address
                      </Label>
                      <Input
                        placeholder="0x..."
                        value={contract.address}
                        onChange={(e) => {
                          const newContracts = [...stateOverrideContracts];
                          newContracts[contractIndex].address = e.target.value;
                          setStateOverrideContracts(newContracts);
                        }}
                        className="border"
                        style={{
                          backgroundColor: "var(--bg-primary)",
                          borderColor: "var(--border)",
                          color: "var(--text-primary)",
                          opacity: 0.8,
                        }}
                      />
                    </div>

                    {/* Storage Overrides */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label
                          className="text-secondary"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Storage Overrides
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const newContracts = [...stateOverrideContracts];
                            newContracts[contractIndex].storageOverrides.push({
                              key: "",
                              value: "",
                            });
                            setStateOverrideContracts(newContracts);
                          }}
                          className="h-6"
                          style={{
                            borderColor: "var(--border)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Storage
                        </Button>
                      </div>
                      <div className="space-y-2 pl-4 border-l-2 border-gray-600">
                        {contract.storageOverrides.map((override, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2"
                          >
                            <Input
                              placeholder="Storage Key (0x...)"
                              value={override.key}
                              onChange={(e) => {
                                const newContracts = [
                                  ...stateOverrideContracts,
                                ];
                                newContracts[contractIndex].storageOverrides[
                                  index
                                ].key = e.target.value;
                                setStateOverrideContracts(newContracts);
                              }}
                              className="border flex-1"
                              style={{
                                backgroundColor: "var(--bg-primary)",
                                borderColor: "var(--border)",
                                color: "var(--text-primary)",
                                opacity: 0.8,
                              }}
                            />
                            <Input
                              placeholder="Storage Value (0x...)"
                              value={override.value}
                              onChange={(e) => {
                                const newContracts = [
                                  ...stateOverrideContracts,
                                ];
                                newContracts[contractIndex].storageOverrides[
                                  index
                                ].value = e.target.value;
                                setStateOverrideContracts(newContracts);
                              }}
                              className="border flex-1"
                              style={{
                                backgroundColor: "var(--bg-primary)",
                                borderColor: "var(--border)",
                                color: "var(--text-primary)",
                                opacity: 0.8,
                              }}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const newContracts = [
                                  ...stateOverrideContracts,
                                ];
                                newContracts[contractIndex].storageOverrides =
                                  newContracts[
                                    contractIndex
                                  ].storageOverrides.filter(
                                    (_, i) => i !== index
                                  );
                                setStateOverrideContracts(newContracts);
                              }}
                              className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {stateOverrideContracts.length === 0 && (
                  <div className="text-center text-gray-400 py-2">
                    No contracts added. Click "Add Contract" to start.
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              type="submit"
              className="w-full py-3"
              disabled={!isLeftSideComplete || isLoading}
              style={{
                backgroundColor: isLeftSideComplete
                  ? "var(--btn-primary-bg)"
                  : "var(--text-secondary)",
                color: "var(--btn-primary-text)",
              }}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Preparing…</span>
                </div>
              ) : (
                "Simulate Transaction"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
