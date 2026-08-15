"use client";

import { useMemo, useRef, useState } from "react";

const DEMO_TASKS = [
  { id: "demo-1", name: "Empty shipping box", action: "RECYCLE IT", category: "Recycle", minutes: 1, priority: 1, why: "Easy win that clears visible space." },
  { id: "demo-2", name: "Unopened return package", action: "PUT IT BY THE DOOR", category: "Return", minutes: 2, priority: 2, why: "Returns become expensive clutter when deadlines pass." },
  { id: "demo-3", name: "Loose charging cables", action: "KEEP THE ONES YOU USE. RECYCLE THE REST", category: "Decide", minutes: 4, priority: 3, why: "Small loose items make a pile feel worse than it is." },
  { id: "demo-4", name: "Old game controller", action: "TEST IT: KEEP, SELL, OR E-WASTE", category: "Decide", minutes: 5, priority: 4, why: "One quick test turns a mystery object into a decision." },
  { id: "demo-5", name: "Basket of clean clothes", action: "PUT IT AWAY", category: "Put Away", minutes: 6, priority: 5, why: "Finish the item that already has an obvious home." }
];

function fileToDataUrl(file, maxDimension = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const scale = Math.min(1, maxDimension / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const inputRef = useRef(null);
  const [image, setImage] = useState("");
  const [tasks, setTasks] = useState([]);
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("start");

  const totalMinutes = useMemo(
    () => tasks.reduce((sum, task) => sum + (Number(task.minutes) || 0), 0),
    [tasks]
  );

  const activeTask = tasks[current];
  const progress = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0;

  async function choosePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const dataUrl = await fileToDataUrl(file);
      setImage(dataUrl);
      setTasks([]);
      setDone([]);
      setCurrent(0);
      setMode("preview");
    } catch {
      setError("I couldn't open that photo. Try another image.");
    }
  }

  async function analyzePile() {
    if (!image) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed.");
      if (!Array.isArray(data.tasks) || !data.tasks.length) {
        throw new Error("I couldn't find a useful cleanup task in that photo.");
      }

      setTasks(data.tasks);
      setCurrent(0);
      setDone([]);
      setMode("destroy");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function startDemo() {
    setImage("");
    setTasks(DEMO_TASKS);
    setCurrent(0);
    setDone([]);
    setError("");
    setMode("destroy");
  }

  function completeTask() {
    if (!activeTask) return;
    const nextDone = [...done, activeTask.id];
    setDone(nextDone);
    if (current + 1 >= tasks.length) {
      setMode("victory");
    } else {
      setCurrent(current + 1);
    }
  }

  function skipTask() {
    if (!activeTask || tasks.length <= 1) return;
    const remaining = tasks.filter((_, index) => index !== current);
    remaining.push(activeTask);
    setTasks(remaining);
    setCurrent(Math.min(current, remaining.length - 1));
  }

  function reset() {
    setImage("");
    setTasks([]);
    setDone([]);
    setCurrent(0);
    setError("");
    setMode("start");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <main className="app-shell">
      <header className="brand-row">
        <div className="logo-mark">💥</div>
        <div>
          <div className="brand">DESTROY THE PILE</div>
          <div className="tagline">One thing at a time.</div>
        </div>
      </header>

      {mode === "start" && (
        <section className="hero card">
          <div className="eyebrow">THE ANTI-TO-DO LIST</div>
          <h1>Take a photo.<br />Destroy the mess.</h1>
          <p className="lead">
            We turn one overwhelming pile into tiny, obvious actions. You only see the next thing to do.
          </p>

          <button className="primary huge" onClick={() => inputRef.current?.click()}>
            📸 TAKE A PILE PHOTO
          </button>
          <input
            ref={inputRef}
            className="hidden-input"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={choosePhoto}
          />
          <button className="secondary" onClick={startDemo}>Try Demo First</button>

          <div className="three-steps">
            <div><span>1</span><b>Snap it</b><small>One messy area</small></div>
            <div><span>2</span><b>Do one thing</b><small>No giant list</small></div>
            <div><span>3</span><b>Kill the pile</b><small>Get the win</small></div>
          </div>
        </section>
      )}

      {mode === "preview" && (
        <section className="card preview-card">
          <div className="eyebrow">YOUR TARGET</div>
          <h2>Ready to destroy this pile?</h2>
          <img className="pile-photo" src={image} alt="Pile to organize" />
          <button className="primary huge" disabled={loading} onClick={analyzePile}>
            {loading ? "ANALYZING THE PILE..." : "💥 DESTROY THIS PILE"}
          </button>
          <button className="secondary" disabled={loading} onClick={() => inputRef.current?.click()}>
            Choose a Different Photo
          </button>
        </section>
      )}

      {mode === "destroy" && activeTask && (
        <section className="destroy-layout">
          <div className="progress-card card">
            <div className="progress-top">
              <span>{done.length} DONE</span>
              <span>{tasks.length - done.length} LEFT</span>
            </div>
            <div className="progress-track"><div style={{ width: `${progress}%` }} /></div>
            <div className="progress-number">{progress}% DESTROYED</div>
          </div>

          <div className="task-card card">
            <div className="task-count">NEXT TARGET • {done.length + 1} OF {tasks.length}</div>
            <div className="category">{activeTask.category}</div>
            <h1 className="task-name">{activeTask.name}</h1>
            <div className="action-box">{activeTask.action}</div>
            <p className="task-why">{activeTask.why}</p>
            <div className="time-pill">⏱ About {activeTask.minutes || 2} min</div>

            <button className="primary huge done-button" onClick={completeTask}>✓ DONE</button>
            <button className="secondary" onClick={skipTask}>Not Now — Give Me Another</button>
          </div>

          <div className="tiny-note">Estimated total: about {totalMinutes || "a few"} minutes • One task at a time</div>
        </section>
      )}

      {mode === "victory" && (
        <section className="victory card">
          <div className="boom">💥</div>
          <div className="eyebrow">MISSION COMPLETE</div>
          <h1>PILE DESTROYED.</h1>
          <p>You knocked out {done.length} pieces of clutter without staring at a giant to-do list.</p>
          <div className="victory-stat"><b>{done.length}</b><span>things handled</span></div>
          <button className="primary huge" onClick={reset}>DESTROY ANOTHER PILE</button>
        </section>
      )}

      {error && <div className="error-box">{error}</div>}

      <footer>Destroy the Pile • Start ugly. Finish clean.</footer>
    </main>
  );
}
