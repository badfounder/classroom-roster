import fs from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import { absoluteUploadPath } from "@/lib/uploads";

/**
 * Ask Claude to look at a classroom photo and return approximate seat
 * positions as percentages of the displayed canvas (0–100 each). We tell the
 * model the canvas is 16:9 and the image is letterboxed inside it via
 * object-contain — it accounts for the letterboxing itself and the teacher
 * can fine-tune by dragging any seat afterwards.
 *
 * Requires ANTHROPIC_API_KEY in env. Returns [] if unset so callers can
 * gracefully fall back to manual click-to-place.
 */
export type DetectedSeat = {
  x: number;
  y: number;
  label?: string;
};

const SUPPORTED_MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
} as const;

function inferMime(path: string): "image/jpeg" | "image/png" | "image/webp" {
  const lower = path.toLowerCase();
  for (const ext of Object.keys(SUPPORTED_MIME) as Array<keyof typeof SUPPORTED_MIME>) {
    if (lower.endsWith(ext)) return SUPPORTED_MIME[ext];
  }
  return "image/jpeg";
}

export async function detectSeatsFromPhoto(
  photoRelativePath: string
): Promise<{ ok: true; seats: DetectedSeat[] } | { ok: false; error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error:
        "Seat detection requires ANTHROPIC_API_KEY in the environment. Add it to .env and restart the dev server.",
    };
  }

  let imageBuffer: Buffer;
  try {
    imageBuffer = await fs.readFile(absoluteUploadPath(photoRelativePath));
  } catch {
    return { ok: false, error: "Could not read the classroom photo from disk." };
  }
  const mediaType = inferMime(photoRelativePath);
  const base64 = imageBuffer.toString("base64");

  const client = new Anthropic({ apiKey });

  const tool: Anthropic.Tool = {
    name: "report_seats",
    description:
      "Report the approximate seat positions you detect in the classroom image.",
    input_schema: {
      type: "object",
      properties: {
        seats: {
          type: "array",
          description:
            "One entry per seat (chair). Coordinates are percentages of the displayed 16:9 canvas, with (0, 0) at the top-left and (100, 100) at the bottom-right.",
          items: {
            type: "object",
            properties: {
              x: { type: "number", minimum: 0, maximum: 100 },
              y: { type: "number", minimum: 0, maximum: 100 },
              label: {
                type: "string",
                description:
                  "Optional short label such as 'Row 2 Seat 3' if a structure is clearly visible.",
              },
            },
            required: ["x", "y"],
          },
        },
      },
      required: ["seats"],
    },
  };

  const systemPrompt = [
    "You are helping a teacher build a classroom seating chart.",
    "You will be shown an image of a classroom — either a line-drawing floor plan or a photograph.",
    "Identify every individual seat / chair that a student would sit in.",
    "Return seat positions as percentages of the displayed canvas, which has a 16:9 aspect ratio.",
    "The image is displayed centered inside that canvas with object-contain fit, so there may be empty space (letterboxing) on the top/bottom or left/right — account for that when mapping image-relative positions to canvas-relative percentages.",
    "Prefer fewer accurate seats over a flood of speculative ones; aim for the actual visible chairs/desks.",
    "Cap the output at 80 seats.",
  ].join(" ");

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system: systemPrompt,
      tools: [tool],
      tool_choice: { type: "tool", name: "report_seats" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: "text",
              text: "Please call report_seats with every seat you can identify in this classroom.",
            },
          ],
        },
      ],
    });
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? `Claude API error: ${e.message}`
          : "Claude API error.",
    };
  }

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    return { ok: false, error: "Model didn't return a tool call." };
  }

  const raw = toolUse.input as { seats?: Array<unknown> } | undefined;
  if (!raw?.seats || !Array.isArray(raw.seats)) {
    return { ok: false, error: "Model returned an unexpected response shape." };
  }

  const seats: DetectedSeat[] = [];
  for (const item of raw.seats) {
    if (
      typeof item === "object" &&
      item !== null &&
      typeof (item as { x?: unknown }).x === "number" &&
      typeof (item as { y?: unknown }).y === "number"
    ) {
      const obj = item as { x: number; y: number; label?: unknown };
      seats.push({
        x: clamp(obj.x, 0, 100),
        y: clamp(obj.y, 0, 100),
        label: typeof obj.label === "string" ? obj.label : undefined,
      });
    }
  }

  return { ok: true, seats };
}

function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.min(hi, Math.max(lo, Math.round(v * 100) / 100));
}
