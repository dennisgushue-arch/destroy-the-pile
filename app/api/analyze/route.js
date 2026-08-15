import OpenAI from "openai";

export const runtime = "nodejs";

function demoTasks() {
  return [
    { id: "fallback-1", name: "Largest obvious trash item", action: "THROW IT AWAY OR RECYCLE IT", category: "Trash", minutes: 1, priority: 1, why: "Removing one large item creates immediate visible progress." },
    { id: "fallback-2", name: "Anything that already has a home", action: "PUT IT BACK WHERE IT BELONGS", category: "Put Away", minutes: 3, priority: 2, why: "Easy decisions keep momentum high." },
    { id: "fallback-3", name: "Loose small items", action: "GROUP LIKE ITEMS TOGETHER", category: "Sort", minutes: 4, priority: 3, why: "Grouping turns visual chaos into a few simple choices." },
    { id: "fallback-4", name: "One item you no longer use", action: "CHOOSE: SELL, DONATE, OR TOSS", category: "Decide", minutes: 2, priority: 4, why: "One clear decision prevents the pile from rebuilding." }
  ];
}

function cleanJson(text) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

export async function POST(request) {
  try {
    const { image } = await request.json();

    if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
      return Response.json({ error: "Please send a valid image." }, { status: 400 });
    }

    // Beginner-friendly behavior: the UI still works before an API key is added.
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({
        demo: true,
        tasks: demoTasks(),
        note: "Demo analysis is active. Add OPENAI_API_KEY for real vision analysis."
      });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `You are the vision engine for a consumer decluttering app called Destroy the Pile.
Analyze the photo and turn the visible clutter into a SHORT sequence of concrete cleanup actions.

Rules:
- Return 4 to 10 tasks, depending on how much clutter is visible.
- Each task should deal with one obvious object or one small group of similar objects.
- Start with quick, visible wins, then harder decisions.
- Actions must be short and commanding: examples are "RECYCLE IT", "PUT IT AWAY", "DONATE IT", "PUT IT BY THE DOOR FOR RETURN".
- Never invent a specific brand, value, deadline, owner, or destination that cannot be seen.
- Do not tell the user to throw away something that could reasonably be valuable; use "DECIDE: KEEP, SELL, OR DONATE" instead.
- If you see medicine, chemicals, weapons, sharp hazards, exposed electrical parts, unknown substances, broken glass, biological waste, or another hazardous item, do NOT instruct the user to handle it. The action should be "DO NOT HANDLE — USE APPROPRIATE SAFETY GUIDANCE".
- Keep why to one short sentence.
- minutes should be an integer from 1 to 15.
- priority starts at 1.

Return ONLY valid JSON in this exact shape:
{"tasks":[{"id":"1","name":"Cardboard shipping box","action":"RECYCLE IT","category":"Recycle","minutes":1,"priority":1,"why":"It is a fast visible win."}]}`;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: image, detail: "auto" }
          ]
        }
      ]
    });

    const parsed = JSON.parse(cleanJson(response.output_text));
    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];

    const normalized = tasks.slice(0, 10).map((task, index) => ({
      id: String(task.id || index + 1),
      name: String(task.name || "Next item"),
      action: String(task.action || "HANDLE THIS ITEM"),
      category: String(task.category || "Next"),
      minutes: Math.min(15, Math.max(1, Number(task.minutes) || 2)),
      priority: index + 1,
      why: String(task.why || "One small action keeps the pile moving.")
    }));

    if (!normalized.length) {
      return Response.json({ error: "No cleanup tasks were detected. Try a clearer photo." }, { status: 422 });
    }

    return Response.json({ tasks: normalized });
  } catch (error) {
    console.error("Analyze error:", error);
    return Response.json(
      { error: "The pile analysis failed. Try the photo again." },
      { status: 500 }
    );
  }
}
