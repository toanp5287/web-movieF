import "dotenv/config";
import { createServer } from "node:http";
import { randomInt, timingSafeEqual } from "node:crypto";
import { Resend } from "resend";

const PORT = Number(process.env.OTP_PORT || 3001);
const JSON_SERVER_URL = (
  process.env.JSON_SERVER_URL || "http://localhost:3000"
).replace(/\/+$/, "");

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

// tele

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!RESEND_API_KEY) {
  console.error("Lỗi: Không tìm thấy RESEND_API_KEY trong file .env");
  process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

// Dùng chung cho tất cả API trong tiến trình Node.js này.
const otpStore = new Map();
const resendCooldown = new Map();

const OTP_TTL = 5 * 60 * 1000;
const RESEND_WAIT = 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESET_GRANT_TTL = 10 * 60 * 1000;

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function isValidEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });

  res.end(JSON.stringify(data));
}

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let tooLarge = false;

    req.on("data", (chunk) => {
      body += chunk.toString();

      if (Buffer.byteLength(body, "utf8") > 16 * 1024) {
        tooLarge = true;
      }
    });

    req.on("end", () => {
      if (tooLarge) {
        return reject(createHttpError("Dữ liệu gửi lên quá lớn.", 413));
      }

      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(createHttpError("Dữ liệu JSON không hợp lệ.", 400));
      }
    });

    req.on("error", reject);
  });
}

function cleanupExpiredData() {
  const now = Date.now();

  for (const [email, record] of otpStore.entries()) {
    const expiry = record.verified ? record.resetExpiresAt : record.expiresAt;

    if (!expiry || expiry <= now) {
      otpStore.delete(email);
    }
  }

  for (const [email, sentAt] of resendCooldown.entries()) {
    if (now - sentAt >= RESEND_WAIT) {
      resendCooldown.delete(email);
    }
  }
}

// Kiểm tra email có tồn tại trong JSON Server hay không.
async function emailExistsInJsonServer(email) {
  let response;

  try {
    response = await fetch(`${JSON_SERVER_URL}/users`);
  } catch {
    throw createHttpError(
      "Không kết nối được JSON Server. Hãy kiểm tra cổng 3000.",
      503,
    );
  }

  if (!response.ok) {
    throw createHttpError("Không thể đọc dữ liệu người dùng.", 503);
  }

  const users = await response.json();

  if (!Array.isArray(users)) {
    throw createHttpError("Dữ liệu /users không hợp lệ.", 503);
  }

  return users.some((user) => normalizeEmail(user.email) === email);
}

// Mẫu email MovieF: nền sáng, điểm nhấn đỏ.
function taoHtmlEmail(maOTP) {
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MovieF - Xác thực email</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Mã xác thực email MovieF của bạn là ${maOTP}.
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f4f6;">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
          style="width:100%;max-width:560px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <tr>
            <td height="5" style="height:5px;background-color:#e50914;"></td>
          </tr>

          <tr>
            <td style="padding:28px 28px 22px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td valign="middle" style="background-color:#e50914;color:#ffffff;font-size:19px;font-weight:bold;text-align:center;width:42px;height:42px;border-radius:8px;">M</td>
                  <td valign="middle" style="padding-left:12px;font-size:23px;font-weight:bold;letter-spacing:1px;color:#18181b;">
                    MOVIE<span style="color:#e50914;">F</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 28px 30px;">
              <div style="display:inline-block;padding:7px 12px;margin-bottom:18px;background-color:#fff1f2;color:#e50914;font-size:12px;font-weight:bold;border-radius:20px;">
                XÁC THỰC EMAIL
              </div>

              <h1 style="margin:0 0 14px;color:#18181b;font-size:26px;line-height:1.35;font-weight:700;">
                Mã xác thực của bạn
              </h1>

              <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.8;">
                Xin chào! Bạn vừa yêu cầu xác thực email trên
                <strong style="color:#18181b;">MovieF</strong>.
                Hãy sử dụng mã bên dưới để tiếp tục.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">
                <tr>
                  <td align="center" style="padding:24px 12px;">
                    <p style="margin:0 0 12px;color:#71717a;font-size:12px;font-weight:bold;letter-spacing:1.5px;">
                      MÃ OTP CỦA BẠN
                    </p>

                    <p style="margin:0;color:#e50914;font-family:Arial,Helvetica,sans-serif;font-size:36px;line-height:1.4;font-weight:bold;letter-spacing:8px;">
                      ${maOTP}
                    </p>

                    <p style="margin:12px 0 0;color:#71717a;font-size:12px;">
                      Vui lòng nhập mã vào trang MovieF.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:22px 0 0;color:#52525b;font-size:14px;line-height:1.8;">
                Nếu bạn không yêu cầu mã này, hãy bỏ qua email.
                Để bảo vệ tài khoản, không chia sẻ mã xác thực với bất kỳ ai.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 28px;background-color:#fafafa;border-top:1px solid #eeeeee;">
              <p style="margin:0 0 8px;color:#e50914;font-size:13px;font-weight:bold;letter-spacing:1px;">
                MOVIEF · YOUR MOVIE UNIVERSE
              </p>
              <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.7;">
                Đây là email tự động được gửi từ hệ thống MovieF.
                Vui lòng không trả lời email này.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:18px 0 0;color:#a1a1aa;font-size:11px;text-align:center;line-height:1.6;">
          © MovieF · Email xác thực tài khoản
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// API gửi OTP đến email người dùng.
async function handleForgotPassword(req, res) {
  const body = await readJsonBody(req);
  const email = normalizeEmail(body.email);

  if (!isValidEmail(email)) {
    return sendJson(res, 400, {
      success: false,
      message: "Email không hợp lệ.",
    });
  }

  const lastSent = resendCooldown.get(email);

  if (lastSent && Date.now() - lastSent < RESEND_WAIT) {
    const secondsLeft = Math.ceil(
      (RESEND_WAIT - (Date.now() - lastSent)) / 1000,
    );

    return sendJson(res, 429, {
      success: false,
      message: `Vui lòng đợi ${secondsLeft} giây rồi gửi lại mã.`,
      retryAfter: secondsLeft,
    });
  }

  const exists = await emailExistsInJsonServer(email);

  // Không tiết lộ email có đăng ký tài khoản hay không.
  if (!exists) {
    return sendJson(res, 202, {
      success: true,
      message: "Nếu email đã đăng ký, mã xác thực sẽ được gửi đến email đó.",
    });
  }

  const maOTP = randomInt(0, 1_000_000).toString().padStart(6, "0");

  const textEmail = [
    "MOVIEF - XÁC THỰC EMAIL",
    "",
    `Mã xác thực OTP của bạn là: ${maOTP}`,
    "",
    "Nhập mã này vào trang MovieF để tiếp tục.",
    "Nếu bạn không yêu cầu mã này, hãy bỏ qua email.",
    "Không chia sẻ mã xác thực với bất kỳ ai.",
  ].join("\n");

  try {
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM,
      to: email,
      subject: "MovieF | Mã xác thực email của bạn",
      html: taoHtmlEmail(maOTP),
      text: textEmail,
    });

    if (error) {
      console.error("Resend gửi email thất bại:", error);

      return sendJson(res, 502, {
        success: false,
        message: "Không gửi được email. Hãy thử lại sau.",
      });
    }

    // Chỉ lưu OTP sau khi Resend chấp nhận yêu cầu gửi.
    otpStore.set(email, {
      code: maOTP,
      expiresAt: Date.now() + OTP_TTL,
      attempts: 0,
      verified: false,
      resetExpiresAt: null,
    });

    resendCooldown.set(email, Date.now());

    console.log("Gửi OTP thành công:", {
      email,
      emailId: data?.id,
    });

    // Không ghi mã OTP vào Terminal.
    return sendJson(res, 200, {
      success: true,
      message: "Nếu email đã đăng ký, mã xác thực sẽ được gửi đến email đó.",
    });
  } catch (error) {
    console.error("Lỗi gửi email:", error);

    return sendJson(res, 500, {
      success: false,
      message: "Có lỗi khi gửi email xác thực.",
    });
  }
}

// API xác minh mã người dùng nhập.
async function handleVerifyOtp(req, res) {
  const body = await readJsonBody(req);
  const email = normalizeEmail(body.email);
  const otp = typeof body.otp === "string" ? body.otp.trim() : "";

  if (!isValidEmail(email) || !/^\d{6}$/.test(otp)) {
    return sendJson(res, 400, {
      success: false,
      message: "Email hoặc mã OTP không hợp lệ.",
    });
  }

  const record = otpStore.get(email);

  if (!record) {
    return sendJson(res, 400, {
      success: false,
      message: "Mã OTP không tồn tại hoặc đã hết hạn. Hãy yêu cầu mã mới.",
    });
  }

  if (record.verified) {
    return sendJson(res, 409, {
      success: false,
      message: "Mã OTP này đã được sử dụng.",
    });
  }

  if (Date.now() >= record.expiresAt) {
    otpStore.delete(email);

    return sendJson(res, 410, {
      success: false,
      message: "Mã OTP đã hết hạn. Hãy yêu cầu mã mới.",
    });
  }

  const otpBuffer = Buffer.from(otp);
  const savedBuffer = Buffer.from(record.code);

  const isCorrect =
    otpBuffer.length === savedBuffer.length &&
    timingSafeEqual(otpBuffer, savedBuffer);

  if (!isCorrect) {
    record.attempts += 1;

    if (record.attempts >= MAX_ATTEMPTS) {
      otpStore.delete(email);

      return sendJson(res, 429, {
        success: false,
        message: "Bạn đã nhập sai quá 5 lần. Hãy yêu cầu mã OTP mới.",
      });
    }

    return sendJson(res, 400, {
      success: false,
      message: `Mã OTP không chính xác. Bạn còn ${MAX_ATTEMPTS - record.attempts} lần thử.`,
      attemptsLeft: MAX_ATTEMPTS - record.attempts,
    });
  }

  // OTP chỉ được dùng một lần.
  // Giữ trạng thái xác minh tạm thời cho bước đặt lại mật khẩu sau này.
  record.code = null;
  record.verified = true;
  record.verifiedAt = Date.now();
  record.resetExpiresAt = Date.now() + RESET_GRANT_TTL;

  return sendJson(res, 200, {
    success: true,
    verified: true,
    message: "Xác minh OTP thành công.",
  });
}

// Tìm tài khoản MovieF theo email trong JSON Server.
async function getUserByEmail(email) {
  let response;

  try {
    response = await fetch(`${JSON_SERVER_URL}/users`, {
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw createHttpError(
      "Không kết nối được JSON Server. Hãy kiểm tra cổng 3000.",
      503,
    );
  }

  if (!response.ok) {
    throw createHttpError("Không thể đọc dữ liệu người dùng.", 503);
  }

  const users = await response.json();

  if (!Array.isArray(users)) {
    throw createHttpError("Dữ liệu /users không hợp lệ.", 503);
  }

  return users.find((user) => normalizeEmail(user.email) === email) || null;
}

// Gửi OTP riêng đến tài khoản Telegram đã liên kết.
async function sendTelegramOtp(chatId, otp) {
  if (!TELEGRAM_BOT_TOKEN) {
    throw createHttpError(
      "Chưa cấu hình TELEGRAM_BOT_TOKEN trong file .env.",
      503,
    );
  }

  let response;

  try {
    response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: [
            "MOVIEF - MÃ XÁC THỰC OTP",
            "",
            `Mã OTP của bạn là: ${otp}`,
            "",
            "Mã có hiệu lực trong 5 phút.",
            "Không chia sẻ mã này với bất kỳ ai.",
            "Nếu bạn không yêu cầu mã, hãy bỏ qua tin nhắn này.",
          ].join("\n"),
        }),
        signal: AbortSignal.timeout(10000),
      },
    );
  } catch {
    throw createHttpError("Không kết nối được Telegram. Hãy thử lại sau.", 502);
  }

  let result;

  try {
    result = await response.json();
  } catch {
    throw createHttpError("Telegram trả về phản hồi không hợp lệ.", 502);
  }

  if (!response.ok || !result.ok) {
    console.error("Telegram gửi OTP thất bại:", result.description);

    throw createHttpError(
      "Không gửi được OTP qua Telegram. Hãy kiểm tra bot và thử lại.",
      502,
    );
  }

  return true;
}

const server = createServer(async (req, res) => {
  // CORS cho frontend Vite gọi API trong môi trường phát triển.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  cleanupExpiredData();

  const url = new URL(req.url || "/", "http://localhost");
  const route = `${req.method} ${url.pathname}`;

  try {
    if (route === "POST /api/auth/forgot-password") {
      return await handleForgotPassword(req, res);
    }

    if (route === "POST /api/auth/verify-otp") {
      return await handleVerifyOtp(req, res);
    }

    return sendJson(res, 404, {
      success: false,
      message: "API không tồn tại.",
    });
  } catch (error) {
    console.error("Lỗi xử lý API:", error);

    return sendJson(res, error.statusCode || 500, {
      success: false,
      message:
        error.statusCode && error.statusCode < 500
          ? error.message
          : error.statusCode === 503
            ? error.message
            : "Server gặp lỗi khi xử lý yêu cầu.",
    });
  }
});

server.listen(PORT, () => {
  console.log(`Backend OTP MovieF đang chạy tại http://localhost:${PORT}`);
  console.log(`JSON Server: ${JSON_SERVER_URL}`);
  console.log("API gửi OTP: POST /api/auth/forgot-password");
  console.log("API xác minh: POST /api/auth/verify-otp");
});
