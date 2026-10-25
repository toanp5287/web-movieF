import "dotenv/config";
import { createServer } from "node:http";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const PORT = Number(process.env.TELEGRAM_PORT || 3002);
const JSON_SERVER_URL = (
  process.env.JSON_SERVER_URL || "http://localhost:3000"
).replace(/\/+$/, "");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL || "";
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

const LINK_TTL = 5 * 60 * 1000;
const MAX_BODY_SIZE = 16 * 1024;
const LINK_COOLDOWN = 30 * 1000;

const pendingLinks = new Map();
const linkCooldowns = new Map();

if (!BOT_TOKEN) {
  console.error("Thiếu TELEGRAM_BOT_TOKEN trong file .env");
  process.exit(1);
}

if (WEBHOOK_URL && !WEBHOOK_SECRET) {
  console.error("Thiếu TELEGRAM_WEBHOOK_SECRET trong file .env");
  process.exit(1);
}

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

function sendJson(res, status, data) {
  if (res.writableEnded) return;

  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });

  res.end(JSON.stringify(data));
}

function httpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let tooLarge = false;

    req.on("data", (chunk) => {
      body += chunk.toString("utf8");

      if (Buffer.byteLength(body, "utf8") > MAX_BODY_SIZE) {
        tooLarge = true;
        req.destroy();
      }
    });

    req.on("end", () => {
      if (tooLarge) {
        reject(httpError("Dữ liệu gửi lên quá lớn.", 413));
        return;
      }

      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(httpError("Dữ liệu JSON không hợp lệ."));
      }
    });

    req.on("error", reject);
  });
}

function hashPassword(password) {
  return createHash("sha256").update(password, "utf8").digest("hex");
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;

  const first = Buffer.from(a);
  const second = Buffer.from(b);

  return first.length === second.length && timingSafeEqual(first, second);
}

async function jsonServer(path, options = {}) {
  let response;

  try {
    response = await fetch(`${JSON_SERVER_URL}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw httpError("Không kết nối được JSON Server.", 503);
  }

  if (!response.ok) {
    throw httpError("Không thể truy cập hoặc cập nhật dữ liệu MovieF.", 502);
  }

  if (response.status === 204) return null;

  return response.json();
}

async function getUsers() {
  const users = await jsonServer("/users");

  if (!Array.isArray(users)) {
    throw httpError("Dữ liệu tài khoản không hợp lệ.", 503);
  }

  return users;
}

// Không tin userId từ trình duyệt.
// Xác minh email và mật khẩu với dữ liệu MovieF trước khi cấp mã.
async function verifyMovieFAccount(email, password) {
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password ||
    password.length > 1024
  ) {
    throw httpError("Vui lòng nhập email và mật khẩu MovieF.", 400);
  }

  const users = await getUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = hashPassword(password);

  const user = users.find(
    (item) =>
      typeof item.email === "string" &&
      item.email.toLowerCase() === normalizedEmail &&
      item.status === "active" &&
      typeof item.password === "string" &&
      safeEqual(item.password, passwordHash),
  );

  if (!user) {
    throw httpError("Email hoặc mật khẩu không chính xác.", 401);
  }

  return user;
}

async function telegramRequest(method, body) {
  let response;

  try {
    response = await fetch(`${TELEGRAM_API}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw httpError("Không kết nối được Telegram.", 502);
  }

  const result = await response.json();

  if (!response.ok || !result.ok) {
    console.error("Telegram API lỗi:", method, result.description);
    throw httpError("Telegram không xử lý được yêu cầu.", 502);
  }

  return result.result;
}

let botInfo = null;

async function getBotInfo() {
  if (!botInfo) {
    botInfo = await telegramRequest("getMe", {});
  }

  return botInfo;
}

async function replyToTelegram(chatId, text) {
  try {
    await telegramRequest("sendMessage", {
      chat_id: chatId,
      text,
    });
  } catch (error) {
    console.error("Không gửi được tin nhắn Telegram:", error.message);
  }
}

function cleanupExpiredLinks() {
  const now = Date.now();

  for (const [tokenHash, record] of pendingLinks) {
    if (record.expiresAt <= now) {
      pendingLinks.delete(tokenHash);
    }
  }

  for (const [userId, time] of linkCooldowns) {
    if (now - time >= LINK_TTL) {
      linkCooldowns.delete(userId);
    }
  }
}

// POST /api/auth/telegram/link
// Body: { email, password }
async function handleCreateLink(req, res) {
  const body = await readJsonBody(req);
  const user = await verifyMovieFAccount(body.email, body.password);
  const userId = String(user.id);

  if (user.telegramChatId) {
    return sendJson(res, 409, {
      success: false,
      linked: true,
      message: "Tài khoản MovieF đã liên kết Telegram.",
    });
  }

  const lastRequest = linkCooldowns.get(userId);

  if (lastRequest && Date.now() - lastRequest < LINK_COOLDOWN) {
    return sendJson(res, 429, {
      success: false,
      message: "Vui lòng đợi 30 giây rồi thử lại.",
    });
  }

  // Chỉ giữ một mã đang chờ cho mỗi tài khoản.
  for (const [tokenHash, record] of pendingLinks) {
    if (record.userId === userId) {
      pendingLinks.delete(tokenHash);
    }
  }

  const bot = await getBotInfo();
  const token = randomBytes(24).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  pendingLinks.set(tokenHash, {
    userId,
    expiresAt: Date.now() + LINK_TTL,
    processing: false,
  });

  linkCooldowns.set(userId, Date.now());

  return sendJson(res, 200, {
    success: true,
    expiresIn: LINK_TTL / 1000,
    telegramUrl: `https://t.me/${bot.username}?start=${token}`,
    message: "Mã liên kết có hiệu lực trong 5 phút.",
  });
}

async function findOtherAccountByChatId(chatId, userId) {
  const users = await getUsers();

  return users.find(
    (user) =>
      String(user.id) !== String(userId) &&
      String(user.telegramChatId || "") === String(chatId),
  );
}

async function handleTelegramUpdate(update) {
  const message = update?.message;
  const chat = message?.chat;

  if (!message || !chat || chat.type !== "private") return;

  const text = typeof message.text === "string" ? message.text : "";
  const match = text.match(/^\/start(?:@\w+)?(?:\s+([a-f0-9]{48}))?$/i);

  if (!match) return;

  const chatId = String(chat.id);
  const token = match[1];

  if (!token) {
    await replyToTelegram(
      chat.id,
      "Chào mừng bạn đến với MovieF!\n\nHãy đăng nhập MovieF, bấm Liên kết Telegram và mở đường dẫn liên kết được cung cấp.",
    );
    return;
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const record = pendingLinks.get(tokenHash);

  if (!record || record.processing || record.expiresAt <= Date.now()) {
    pendingLinks.delete(tokenHash);

    await replyToTelegram(
      chat.id,
      "Mã liên kết không hợp lệ hoặc đã hết hạn. Hãy tạo mã mới trên MovieF.",
    );
    return;
  }

  record.processing = true;

  try {
    const users = await getUsers();
    const user = users.find((item) => String(item.id) === record.userId);

    if (!user) {
      throw httpError("Không tìm thấy tài khoản MovieF.", 404);
    }

    if (user.telegramChatId) {
      pendingLinks.delete(tokenHash);

      await replyToTelegram(
        chat.id,
        "Tài khoản MovieF này đã liên kết Telegram. Hãy hủy liên kết trước khi đổi tài khoản.",
      );
      return;
    }

    const otherUser = await findOtherAccountByChatId(chatId, record.userId);

    if (otherUser) {
      await replyToTelegram(
        chat.id,
        "Telegram này đã liên kết với tài khoản MovieF khác.",
      );
      return;
    }

    if (record.expiresAt <= Date.now()) {
      pendingLinks.delete(tokenHash);

      await replyToTelegram(
        chat.id,
        "Mã liên kết đã hết hạn. Hãy tạo mã mới trên MovieF.",
      );
      return;
    }

    await jsonServer(`/users/${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({
        telegramChatId: chatId,
        telegramUsername: chat.username || null,
        telegramLinkedAt: new Date().toISOString(),
      }),
    });

    // Chỉ xóa mã sau khi cập nhật JSON Server thành công.
    pendingLinks.delete(tokenHash);

    await replyToTelegram(
      chat.id,
      "Liên kết Telegram với MovieF thành công! Bạn có thể quay lại MovieF.",
    );
  } catch (error) {
    record.processing = false;
    console.error("Lỗi liên kết Telegram:", error.message);

    await replyToTelegram(
      chat.id,
      "Chưa liên kết được tài khoản. Hãy thử lại hoặc tạo mã mới trên MovieF.",
    );
  }
}

// POST /api/auth/telegram/webhook
async function handleWebhook(req, res) {
  const receivedSecret = req.headers["x-telegram-bot-api-secret-token"];

  if (
    !WEBHOOK_SECRET ||
    !safeEqual(String(receivedSecret || ""), WEBHOOK_SECRET)
  ) {
    return sendJson(res, 403, {
      success: false,
      message: "Webhook không được phép.",
    });
  }

  const update = await readJsonBody(req);

  try {
    await handleTelegramUpdate(update);
  } catch (error) {
    console.error("Lỗi xử lý webhook:", error.message);
  }

  return sendJson(res, 200, { success: true });
}

const server = createServer(async (req, res) => {
  const origin = req.headers.origin;

  if (origin === FRONTEND_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Telegram-Bot-Api-Secret-Token",
  );
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  cleanupExpiredLinks();

  const url = new URL(req.url || "/", "http://localhost");
  const route = `${req.method} ${url.pathname}`;

  try {
    if (route === "POST /api/auth/telegram/link") {
      return await handleCreateLink(req, res);
    }

    if (route === "POST /api/auth/telegram/webhook") {
      return await handleWebhook(req, res);
    }

    return sendJson(res, 404, {
      success: false,
      message: "API Telegram không tồn tại.",
    });
  } catch (error) {
    console.error("Telegram API error:", error.message);

    return sendJson(res, error.statusCode || 500, {
      success: false,
      message:
        error.statusCode && error.statusCode < 500
          ? error.message
          : error.statusCode === 503
            ? error.message
            : "Server Telegram gặp lỗi.",
    });
  }
});

async function configureWebhook() {
  if (!WEBHOOK_URL) {
    console.log("Chưa cấu hình TELEGRAM_WEBHOOK_URL.");
    return;
  }

  const webhook = new URL(WEBHOOK_URL);

  if (webhook.protocol !== "https:") {
    throw new Error("Telegram webhook bắt buộc phải dùng HTTPS.");
  }

  webhook.pathname = "/api/auth/telegram/webhook";
  webhook.search = "";

  await telegramRequest("setWebhook", {
    url: webhook.toString(),
    secret_token: WEBHOOK_SECRET,
    allowed_updates: ["message"],
  });

  console.log("Telegram webhook đã được đăng ký.");
}

server.listen(PORT, async () => {
  console.log(`Telegram API đang chạy tại http://localhost:${PORT}`);
  console.log(`JSON Server: ${JSON_SERVER_URL}`);

  try {
    const bot = await getBotInfo();
    console.log(`Telegram bot: @${bot.username}`);
    await configureWebhook();
  } catch (error) {
    console.error("Không khởi tạo được Telegram:", error.message);
  }
});
