import rateLimit from "express-rate-limit";

// ── General Rate Limiting: All API endpoints ──
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 წუთი
  max: 200,
  message: { error: 'ძალიან ბევრი მოთხოვნა. გთხოვთ მოგვიანებით სცადოთ.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate Limiting for AI Chat Endpoint
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: { error: "დღიური ლიმიტი ამოიწურა, სცადეთ 15 წუთში" }
});

// Rate Limiting for AI Image Generation Endpoint
export const aiImageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: "სურათების გენერაციის ლიმიტი ამოიწურა, სცადეთ 15 წუთში" }
});

// Rate Limiting for Order Creation
export const orderCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 orders per 15 minutes per IP
  message: { error: "ძალიან ბევრი შეკვეთა. სცადეთ 15 წუთში" }
});
