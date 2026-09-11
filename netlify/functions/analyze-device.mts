import type { Config } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type DeviceAnalysis = {
  deviceName: string;
  category: string;
  brand: string;
  model: string;
  condition: "New" | "Excellent" | "Good" | "Fair" | "Poor" | "Unknown";
  visibleFeatures: string[];
  confidence: number;
  estimatedPrice: number;
  identificationWarning: string;
};

function demoAnalysis(): DeviceAnalysis {
  return {
    deviceName: "Electronic development board",
    category: "Development Board",
    brand: "Not visible",
    model: "Not visible",
    condition: "Good",
    visibleFeatures: ["Printed circuit board", "Pin headers", "USB connector"],
    confidence: 62,
    estimatedPrice: 450,
    identificationWarning: "Demo analysis only — configure Netlify AI Gateway for image-based identification.",
  };
}

function cleanText(value: unknown, max = 100) {
  return typeof value === "string" ? value.replace(/[<>\u0000-\u001F]/g, "").trim().slice(0, max) : "";
}

function normalize(raw: Record<string, unknown>): DeviceAnalysis {
  const allowedConditions = new Set(["New", "Excellent", "Good", "Fair", "Poor", "Unknown"]);
  const condition = cleanText(raw.condition, 20);
  return {
    deviceName: cleanText(raw.deviceName) || "Unknown electronic device",
    category: cleanText(raw.category) || "Other electronic component",
    brand: cleanText(raw.brand) || "Not visible",
    model: cleanText(raw.model) || "Not visible",
    condition: (allowedConditions.has(condition) ? condition : "Unknown") as DeviceAnalysis["condition"],
    visibleFeatures: Array.isArray(raw.visibleFeatures)
      ? raw.visibleFeatures.slice(0, 6).map((item) => cleanText(item, 80)).filter(Boolean)
      : [],
    confidence: Math.max(0, Math.min(100, Math.round(Number(raw.confidence) || 0))),
    estimatedPrice: Math.max(0, Math.min(10_000_000, Math.round(Number(raw.estimatedPrice) || 0))),
    identificationWarning: cleanText(raw.identificationWarning, 220),
  };
}

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
  }

  try {
    const body = await req.json();
    const image = typeof body.image === "string" ? body.image : "";
    const match = image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match || !ALLOWED_IMAGE_TYPES.has(match[1])) {
      return Response.json({ error: "Please capture a JPEG, PNG, or WebP image." }, { status: 400 });
    }
    if (Math.ceil(match[2].length * 0.75) > MAX_IMAGE_BYTES) {
      return Response.json({ error: "The captured image is too large. Please try again." }, { status: 413 });
    }

    if (!Netlify.env.has("GEMINI_API_KEY") && !Netlify.env.has("NETLIFY_AI_GATEWAY_KEY")) {
      return Response.json({ analysis: demoAnalysis(), mode: "demo" });
    }

    const ai = new GoogleGenAI({});
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [
          { inlineData: { mimeType: match[1], data: match[2] } },
          { text: `Inspect this image as an electronics reuse specialist. Identify the single primary electronic device or component. Cover development boards, Raspberry Pi, ESP devices, sensors, motors, relays, PCBs, passive components, ICs, LEDs, supplies, chargers, adapters, modules, and other electronics. If the image is blurry, shows multiple equally prominent objects, or is not electronic, say so in identificationWarning and keep confidence below 55. Never invent a brand or model that is not visible. Estimate a conservative used-device value in Indian rupees; this is an estimate, not an exact market price. Return only JSON matching: {"deviceName":"", "category":"", "brand":"", "model":"", "condition":"New|Excellent|Good|Fair|Poor|Unknown", "visibleFeatures":[""], "confidence":0, "estimatedPrice":0, "identificationWarning":""}.` },
        ],
      }],
      config: { responseMimeType: "application/json", temperature: 0.15 },
    });

    const parsed = JSON.parse(response.text || "{}");
    return Response.json({ analysis: normalize(parsed), mode: "ai" });
  } catch (error) {
    console.error("Device analysis failed", error);
    return Response.json({ error: "AI analysis is temporarily unavailable. Check your connection and try again." }, { status: 502 });
  }
};

export const config: Config = { path: "/api/analyze-device" };
