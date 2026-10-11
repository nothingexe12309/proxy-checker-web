import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { NextResponse } from "next/server";

const IPINFO_TOKEN = process.env.IPINFO_TOKEN || "0b9f1adb71f1a1";
const TIMEOUT = 7000;

function formatProxy(proxy) {
  const parts = proxy.trim().split(":");
  if (parts.length === 4) {
    const [host, port, user, pass] = parts;
    return `http://${user}:${pass}@${host}:${port}`;
  }
  return `http://${proxy.trim()}`;
}

function detectIPVersion(ip) {
  return ip.includes(":") ? "IPv6" : "IPv4";
}

function classifyIP(data) {
  const org = (data.as_name || data.org || "").toLowerCase();

  if (data.mobile === true) return "mobile";

  const mobileKeywords = ["vodafone", "t-mobile", "telekom", "orange", "o2", "att", "verizon"];
  if (mobileKeywords.some((k) => org.includes(k))) return "mobile";

  const dcKeywords = ["amazon", "aws", "google", "microsoft", "azure", "digitalocean", "ovh"];
  if (dcKeywords.some((k) => org.includes(k))) return "datacenter";

  return "isp";
}

export async function POST(req) {
  try {
    const { proxy } = await req.json();
    if (!proxy) {
      return NextResponse.json({ success: false, error: "Proxy missing" }, { status: 400 });
    }

    const proxyUrl = formatProxy(proxy);
    const agent = new HttpsProxyAgent(proxyUrl);

    const res = await axios.get(`https://api.ipinfo.io/lite/me?token=${IPINFO_TOKEN}`, {
      httpAgent: agent,
      httpsAgent: agent,
      timeout: TIMEOUT,
    });

    const data = res.data;
    const ip = data.ip;
    if (!ip) throw new Error("No IP returned");

    const ipVersion = detectIPVersion(ip);
    const type = classifyIP(data);
    const isp = data.as_name || data.org || "unknown";

    return NextResponse.json({
      success: true,
      proxy,
      ip,
      type,
      ipVersion,
      isp,
      line: `${proxy} | ${ip} | ${type} | ${ipVersion} | ${isp}`,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err.message || "Connection failed",
    });
  }
}