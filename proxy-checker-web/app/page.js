"use client";

import { useState, useRef } from "react";

export default function Home() {
  const [inputProxies, setInputProxies] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [concurrency, setConcurrency] = useState(10);
  const [activeTab, setActiveTab] = useState("all");
  const [copiedId, setCopiedId] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState("");

  const [workingList, setWorkingList] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    checked: 0,
    working: 0,
    failed: 0,
    ipv4: 0,
    ipv6: 0,
    mobile: 0,
  });

  const seenIPsRef = useRef(new Set());
  const stopSignalRef = useRef(false);

  const startCheck = async () => {
    const list = inputProxies
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);

    if (list.length === 0) {
      alert("Please enter proxies first.");
      return;
    }

    setIsRunning(true);
    stopSignalRef.current = false;
    seenIPsRef.current = new Set();
    setWorkingList([]);

    setStats({
      total: list.length,
      checked: 0,
      working: 0,
      failed: 0,
      ipv4: 0,
      ipv6: 0,
      mobile: 0,
    });

    let currentIndex = 0;

    const worker = async () => {
      while (currentIndex < list.length && !stopSignalRef.current) {
        const proxy = list[currentIndex++];
        try {
          const res = await fetch("/api/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ proxy }),
          });
          const result = await res.json();

          if (result.success) {
            const { ip, type, ipVersion, isp, line } = result;

            if (seenIPsRef.current.has(ip)) {
              continue;
            }

            seenIPsRef.current.add(ip);

            const newEntry = {
              id: `${proxy}-${Date.now()}-${Math.random()}`,
              proxy,
              ip,
              type,
              ipVersion,
              isp,
              line,
            };

            setWorkingList((prev) => [...prev, newEntry]);

            setStats((s) => ({
              ...s,
              checked: s.checked + 1,
              working: s.working + 1,
              [ipVersion.toLowerCase()]: s[ipVersion.toLowerCase()] + 1,
              mobile: type === "mobile" ? s.mobile + 1 : s.mobile,
            }));
          } else {
            setStats((s) => ({ ...s, checked: s.checked + 1, failed: s.failed + 1 }));
          }
        } catch {
          setStats((s) => ({ ...s, checked: s.checked + 1, failed: s.failed + 1 }));
        }
      }
    };

    const workers = Array.from({ length: concurrency }, worker);
    await Promise.all(workers);
    setIsRunning(false);
  };

  const copyToClipboard = (text, id = null, label = "Copied!") => {
    navigator.clipboard.writeText(text);
    if (id) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } else {
      setCopyFeedback(label);
      setTimeout(() => setCopyFeedback(""), 1500);
    }
  };

  const filteredList = workingList.filter((item) => {
    if (activeTab === "ipv4") return item.ipVersion === "IPv4";
    if (activeTab === "ipv6") return item.ipVersion === "IPv6";
    if (activeTab === "mobile") return item.type === "mobile";
    return true;
  });

  return (
    <main style={{ maxWidth: 960, margin: "32px auto", padding: "0 20px" }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>⚡ Web Proxy Checker</h2>

      <textarea
        placeholder="Paste proxies (one per line):&#10;host:port:user:pass&#10;host:port"
        rows={6}
        disabled={isRunning}
        value={inputProxies}
        onChange={(e) => setInputProxies(e.target.value)}
        style={{
          width: "100%",
          padding: 14,
          borderRadius: 8,
          border: "1px solid #334155",
          background: "#1e293b",
          color: "#fff",
          fontSize: 14,
          boxSizing: "border-box",
          outline: "none",
        }}
      />

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
        <button
          onClick={startCheck}
          disabled={isRunning}
          style={{
            padding: "10px 24px",
            background: isRunning ? "#475569" : "#6366f1",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            cursor: isRunning ? "not-allowed" : "pointer",
          }}
        >
          {isRunning ? "Checking..." : "Start Check"}
        </button>

        {isRunning && (
          <button
            onClick={() => (stopSignalRef.current = true)}
            style={{
              padding: "10px 18px",
              background: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Stop
          </button>
        )}

        <label style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
          Threads:
          <input
            type="number"
            min={1}
            max={50}
            disabled={isRunning}
            value={concurrency}
            onChange={(e) => setConcurrency(Number(e.target.value))}
            style={{
              width: 50,
              padding: "4px 8px",
              borderRadius: 6,
              background: "#1e293b",
              color: "#fff",
              border: "1px solid #334155",
              outline: "none",
            }}
          />
        </label>
      </div>

      {/* Counters */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
          gap: 10,
          marginTop: 20,
        }}
      >
        {[
          ["Total", stats.total],
          ["Checked", stats.checked],
          ["Working", stats.working],
          ["Failed", stats.failed],
          ["IPv4", stats.ipv4],
          ["IPv6", stats.ipv6],
          ["Mobile", stats.mobile],
        ].map(([label, val]) => (
          <div key={label} style={{ background: "#1e293b", padding: 12, borderRadius: 8, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: "bold", marginTop: 4 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Filtering & Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 28,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { key: "all", label: `All (${workingList.length})` },
            { key: "ipv4", label: `IPv4 (${stats.ipv4})` },
            { key: "ipv6", label: `IPv6 (${stats.ipv6})` },
            { key: "mobile", label: `Mobile (${stats.mobile})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "none",
                background: activeTab === tab.key ? "#4f46e5" : "#1e293b",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: 13,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          disabled={filteredList.length === 0}
          onClick={() =>
            copyToClipboard(
              filteredList.map((i) => i.proxy).join("\n"),
              null,
              `Copied ${filteredList.length} proxies!`
            )
          }
          style={{
            padding: "7px 16px",
            background: filteredList.length === 0 ? "#334155" : "#10b981",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: filteredList.length === 0 ? "not-allowed" : "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {copyFeedback || `📋 Copy All (${filteredList.length})`}
        </button>
      </div>

      {/* Results List */}
      <div
        style={{
          marginTop: 14,
          background: "#1e293b",
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid #334155",
        }}
      >
        <div style={{ maxHeight: 480, overflowY: "auto" }}>
          {filteredList.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
              {isRunning ? "Testing proxies..." : "No working proxies to display."}
            </div>
          ) : (
            filteredList.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 16px",
                  borderBottom: "1px solid #334155",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: 13,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      color: "#f8fafc",
                    }}
                  >
                    {item.proxy}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                    <span style={{ color: "#38bdf8" }}>{item.ip}</span> •{" "}
                    <span style={{ textTransform: "uppercase" }}>{item.ipVersion}</span> •{" "}
                    <span style={{ color: item.type === "mobile" ? "#f59e0b" : "#a3e635" }}>
                      {item.type.toUpperCase()}
                    </span>{" "}
                    • {item.isp}
                  </div>
                </div>

                <button
                  onClick={() => copyToClipboard(item.proxy, item.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    background: copiedId === item.id ? "#10b981" : "#6366f1",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 9999,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                    flexShrink: 0,
                    transition: "background 0.15s ease",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  {copiedId === item.id ? "Copied" : "Copy"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}