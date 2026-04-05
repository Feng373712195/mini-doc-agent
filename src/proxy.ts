// 从 undici 引入代理分发器与全局分发器设置方法。
import { ProxyAgent, setGlobalDispatcher } from "undici";
// 从 child_process 引入 execSync，用于读取 Windows 注册表代理配置。
import { execSync } from "node:child_process";

// 模块级标记，避免重复初始化全局代理。
let proxyInitialized = false;

// 规范化代理地址，确保返回完整 URL。
function normalizeProxyUrl(raw: string): string | null {
  // 去除首尾空白字符。
  const value = raw.trim();
  // 为空则直接返回 null。
  if (!value) return null;
  // 如果已包含协议，直接返回。
  if (/^https?:\/\//i.test(value)) return value;
  // 否则补上 http:// 前缀。
  return `http://${value}`;
}

// 从注册表 ProxyServer 文本中提取最佳代理地址。
function parseRegistryProxyServer(raw: string): string | null {
  // 以分号拆分协议项。
  const parts = raw.split(";").map((item) => item.trim()).filter(Boolean);
  // 如果不是分号格式，直接规范化返回。
  if (parts.length === 0) return normalizeProxyUrl(raw);
  // 优先寻找 https= 配置。
  const httpsItem = parts.find((item) => item.toLowerCase().startsWith("https="));
  // 其次寻找 http= 配置。
  const httpItem = parts.find((item) => item.toLowerCase().startsWith("http="));
  // 选择 https > http > 首项。
  const chosen = httpsItem ?? httpItem ?? parts[0];
  // 去掉协议键名，仅保留 host:port。
  const hostPort = chosen.includes("=") ? chosen.split("=")[1] : chosen;
  // 规范化为 URL。
  return normalizeProxyUrl(hostPort ?? "");
}

// 从 Windows 注册表读取系统代理配置。
function readWindowsProxyFromRegistry(): string | null {
  // 非 Windows 平台不尝试读取。
  if (process.platform !== "win32") return null;
  // 注册表读取失败时兜底返回 null。
  try {
    // 查询 Internet Settings 下的代理配置。
    const output = execSync(
      'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"',
      { encoding: "utf8" }
    );
    // 解析 ProxyEnable 值。
    const enableMatch = output.match(/ProxyEnable\s+REG_DWORD\s+0x([0-9a-f]+)/i);
    // 未开启代理则直接返回 null。
    if (!enableMatch || parseInt(enableMatch[1], 16) === 0) return null;
    // 解析 ProxyServer 值。
    const serverMatch = output.match(/ProxyServer\s+REG_SZ\s+(.+)/i);
    // 未配置代理地址则返回 null。
    if (!serverMatch) return null;
    // 把注册表字符串转换为可用 URL。
    return parseRegistryProxyServer(serverMatch[1]);
  } catch {
    return null;
  }
}

// 若存在代理配置，则为 Node 全局请求设置代理。
export function setupGlobalProxyIfNeeded() {
  // 已初始化则直接返回。
  if (proxyInitialized) return;
  // 标记为已初始化。
  proxyInitialized = true;
  // 优先读取环境变量代理配置。
  const envProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  // 规范化环境变量代理值。
  const envProxyUrl = envProxy ? normalizeProxyUrl(envProxy) : null;
  // 若环境变量为空，则尝试读取系统代理。
  const proxyUrl = envProxyUrl ?? readWindowsProxyFromRegistry();
  // 没有代理则退出。
  if (!proxyUrl) return;
  // 设置全局代理，让所有请求生效。
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
}
