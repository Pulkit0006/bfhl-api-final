const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// middlewares
app.use(cors());
app.use(express.json());

// ⚠️ Ensure your .env file has GEMINIKEY=...
const OFFICIAL_EMAIL = "pulkit1022.be23@chitkara.edu.in";
const GEMINI_API_KEY = process.env.GEMINIKEY;

console.log("Gemini Key Loaded:", GEMINI_API_KEY ? "YES" : "NO");

/* =======================
   Helper Functions
======================= */

function getFibonacci(n) {
  const result = [];
  let a = 0,
    b = 1;
  for (let i = 0; i < n; i++) {
    result.push(a);
    [a, b] = [b, a + b];
  }
  return result;
}

function isPrime(num) {
  if (num <= 1) return false;
  if (num === 2) return true;
  if (num % 2 === 0) return false;
  for (let i = 3; i <= Math.sqrt(num); i += 2) {
    if (num % i === 0) return false;
  }
  return true;
}

function gcd(a, b) {
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

function lcm(a, b) {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

/* =======================
   Gemini Helper (Updated)
======================= */

async function askGemini(question) {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key not configured");
  }

  // using 1.5-flash for stability. Change to 2.5 only if you are sure you have access.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Answer in one word only. No explanation. Question: ${question}`,
          },
        ],
      },
    ],
  };

  try {
    const response = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" },
    });

    let text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error("AI response empty");

    // Friend's cleanup logic: remove anything that isn't a word character
    // This turns "New Delhi" into "NewDelhi" (strict one word)
    text = text.trim().replace(/[^\w]/g, "");

    return text;
  } catch (error) {
    console.error("Gemini API Error:", error.response?.data || error.message);
    throw new Error("AI Service Unavailable");
  }
}

/* =======================
   Routes
======================= */

app.get("/health", (req, res) => {
  return res.status(200).json({
    is_success: true,
    official_email: OFFICIAL_EMAIL,
  });
});

app.post("/bfhl", async (req, res) => {
  try {
    const body = req.body;

    // Safety check for empty body
    if (!body) {
      return res.status(400).json({
        is_success: false,
        official_email: OFFICIAL_EMAIL,
        error: "Invalid request body",
      });
    }

    const keys = Object.keys(body);

    // Validation: Exactly one key allowed
    if (keys.length !== 1) {
      return res.status(400).json({
        is_success: false,
        official_email: OFFICIAL_EMAIL,
        error: "Request must contain exactly one specific key",
      });
    }

    const key = keys[0];
    const value = body[key];
    let data;

    switch (key) {
      case "fibonacci":
        if (!Number.isInteger(value) || value < 0) {
          throw new Error("Invalid fibonacci input");
        }
        data = getFibonacci(value);
        break;

      case "prime":
        if (!Array.isArray(value)) {
          throw new Error("Prime input must be an array");
        }
        data = value.filter((n) => Number.isInteger(n) && isPrime(n));
        break;

      case "hcf":
        if (!Array.isArray(value) || value.length === 0) {
          throw new Error("Invalid hcf input");
        }
        data = value.reduce((a, b) => gcd(a, b));
        break;

      case "lcm":
        if (!Array.isArray(value) || value.length === 0) {
          throw new Error("Invalid lcm input");
        }
        data = value.reduce((a, b) => lcm(a, b));
        break;

      case "AI":
        if (typeof value !== "string" || !value.trim()) {
          throw new Error("AI input must be a non-empty string");
        }
        data = await askGemini(value);
        break;

      default:
        return res.status(400).json({
          is_success: false,
          official_email: OFFICIAL_EMAIL,
          error: "Invalid key provided",
        });
    }

    return res.status(200).json({
      is_success: true,
      official_email: OFFICIAL_EMAIL,
      data,
    });
  } catch (err) {
    return res.status(422).json({
      is_success: false,
      official_email: OFFICIAL_EMAIL,
      error: err.message || "Unprocessable Entity",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
