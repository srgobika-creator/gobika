import React, { useState, useEffect, useRef, useCallback } from "react";
import { Clock, Menu, X, Check, ChevronLeft, ChevronRight, Plus, Trash2, Upload, Lock, Unlock, PlayCircle, Trophy, Percent, Target, AlertTriangle, Shield, RefreshCcw, LogOut } from "lucide-react";

/* ---------------------------------------------------------
   STORAGE HELPERS
--------------------------------------------------------- */
async function loadKey(key, shared, fallback) {
  try {
    const r = await window.storage.get(key, shared);
    return r ? JSON.parse(r.value) : fallback;
  } catch {
    return fallback;
  }
}
async function saveKey(key, value, shared) {
  try {
    await window.storage.set(key, JSON.stringify(value), shared);
  } catch (e) {
    console.error("storage save failed", key, e);
  }
}

const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------------------------------------------------------
   SEED DATA (used only if no paper exists yet)
--------------------------------------------------------- */
const seedPaper = () => ({
  id: uid(),
  title: "Linear Algebra — Full Length Mock 2",
  subject: "Mathematics (JAM MA)",
  duration: 6, // minutes, kept short for demo purposes
  price: 149,
  published: true,
  createdAt: Date.now(),
  questions: [
    {
      id: uid(),
      type: "MCQ",
      text: "If A is a 3×3 real matrix with A² = A, which of the following is always true?",
      options: ["Eigenvalues of A are 0 or 1", "A is invertible", "det(A) = 1", "A is symmetric"],
      correct: [0],
      marks: 4,
      neg: 1,
    },
    {
      id: uid(),
      type: "MSQ",
      text: "Let V = R³. Which of the following are subspaces of V?",
      options: ["{(x,y,z) : x+y+z = 0}", "{(x,y,z) : x = 1}", "{(x,y,z) : x = y = z}", "{(0,0,0)}"],
      correct: [0, 2, 3],
      marks: 4,
      neg: 2,
    },
    {
      id: uid(),
      type: "NAT",
      text: "Find the rank of the matrix [[1,2,3],[2,4,6],[1,1,1]].",
      correct: 2,
      marks: 3,
      neg: 0,
    },
    {
      id: uid(),
      type: "MCQ",
      text: "The minimal polynomial of the identity matrix I₃ is:",
      options: ["x", "x - 1", "x³ - 1", "x(x-1)"],
      correct: [1],
      marks: 4,
      neg: 1,
    },
  ],
});

/* ---------------------------------------------------------
   FONT / GLOBAL STYLE
--------------------------------------------------------- */
function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,500;8..60,600;8..60,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
      .font-display { font-family: 'Source Serif 4', Georgia, serif; }
      .font-ui { font-family: 'Inter', system-ui, sans-serif; }
      .font-mono { font-family: 'JetBrains Mono', monospace; }
      * { -webkit-tap-highlight-color: transparent; }
      body { user-select: none; }
      .selectable { user-select: text; }
    `}</style>
  );
}

/* ---------------------------------------------------------
   MAIN APP
--------------------------------------------------------- */
export default function App() {
  const [role, setRole] = useState("student"); // 'student' | 'admin'
  const [papers, setPapers] = useState([]);
  const [purchases, setPurchases] = useState([]); // paperIds
  const [attempts, setAttempts] = useState([]); // {paperId, score, ...}
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState("catalog"); // catalog | instructions | test | result | admin
  const [activePaperId, setActivePaperId] = useState(null);
  const [lastAttempt, setLastAttempt] = useState(null);

  useEffect(() => {
    (async () => {
      let p = await loadKey("papers", true, null);
      if (!p || p.length === 0) {
        p = [seedPaper()];
        await saveKey("papers", p, true);
      }
      const purch = await loadKey("purchases", false, []);
      const att = await loadKey("attempts", false, []);
      setPapers(p);
      setPurchases(purch);
      setAttempts(att);
      setLoading(false);
    })();
  }, []);

  const persistPapers = async (next) => {
    setPapers(next);
    await saveKey("papers", next, true);
  };
  const persistPurchases = async (next) => {
    setPurchases(next);
    await saveKey("purchases", next, false);
  };
  const persistAttempts = async (next) => {
    setAttempts(next);
    await saveKey("attempts", next, false);
  };

  const resetDemo = async () => {
    const p = [seedPaper()];
    await saveKey("papers", p, true);
    await saveKey("purchases", [], false);
    await saveKey("attempts", [], false);
    setPapers(p);
    setPurchases([]);
    setAttempts([]);
    setView("catalog");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F1B33]">
        <GlobalStyle />
        <div className="text-[#F4C95D] font-mono text-sm tracking-widest animate-pulse">LOADING MATH PATH MAP…</div>
      </div>
    );
  }

  const activePaper = papers.find((p) => p.id === activePaperId) || null;

  return (
    <div className="min-h-screen bg-[#F7F7F5] font-ui text-[#14213D]">
      <GlobalStyle />
      <TopBar
        role={role}
        setRole={(r) => {
          setRole(r);
          setView(r === "admin" ? "admin" : "catalog");
        }}
        onReset={resetDemo}
        onHome={() => setView(role === "admin" ? "admin" : "catalog")}
      />

      {role === "admin" && view === "admin" && (
        <AdminPanel papers={papers} setPapers={persistPapers} />
      )}

      {role === "student" && view === "catalog" && (
        <Catalog
          papers={papers.filter((p) => p.published)}
          purchases={purchases}
          onBuy={async (id) => {
            if (!purchases.includes(id)) {
              await persistPurchases([...purchases, id]);
            }
          }}
          onStart={(id) => {
            setActivePaperId(id);
            setView("instructions");
          }}
          attempts={attempts}
        />
      )}

      {role === "student" && view === "instructions" && activePaper && (
        <Instructions
          paper={activePaper}
          onBack={() => setView("catalog")}
          onBegin={() => setView("test")}
        />
      )}

      {role === "student" && view === "test" && activePaper && (
        <TestRunner
          paper={activePaper}
          onSubmit={async (result) => {
            const record = { id: uid(), paperId: activePaper.id, ts: Date.now(), ...result };
            await persistAttempts([record, ...attempts]);
            setLastAttempt(record);
            setView("result");
          }}
        />
      )}

      {role === "student" && view === "result" && activePaper && lastAttempt && (
        <ResultScreen
          paper={activePaper}
          attempt={lastAttempt}
          onBackToCatalog={() => setView("catalog")}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   TOP BAR
--------------------------------------------------------- */
function TopBar({ role, setRole, onReset, onHome }) {
  return (
    <div className="bg-[#14213D] text-white sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <button onClick={onHome} className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded bg-[#F4C95D] flex items-center justify-center font-mono font-bold text-[#14213D] text-sm">
            ∑
          </div>
          <div className="font-display font-semibold text-lg tracking-tight">Math Path Map</div>
        </button>
        <div className="flex items-center gap-2">
          <div className="flex bg-white/10 rounded-full p-0.5 text-xs font-medium">
            <button
              onClick={() => setRole("student")}
              className={`px-3 py-1.5 rounded-full transition ${role === "student" ? "bg-[#F4C95D] text-[#14213D]" : "text-white/70"}`}
            >
              Student
            </button>
            <button
              onClick={() => setRole("admin")}
              className={`px-3 py-1.5 rounded-full transition ${role === "admin" ? "bg-[#F4C95D] text-[#14213D]" : "text-white/70"}`}
            >
              Admin
            </button>
          </div>
          <button onClick={onReset} title="Reset demo data" className="p-2 rounded-full hover:bg-white/10 transition">
            <RefreshCcw size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   CATALOG (Student storefront)
--------------------------------------------------------- */
function Catalog({ papers, purchases, onBuy, onStart, attempts }) {
  const [payingId, setPayingId] = useState(null);

  const handleBuy = (id) => {
    setPayingId(id);
    setTimeout(() => {
      onBuy(id);
      setPayingId(null);
    }, 900);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="text-xs font-mono tracking-widest text-[#B08A2E] mb-1">JAM-STYLE MOCK TESTS</div>
        <h1 className="font-display text-3xl font-semibold text-[#14213D]">Question paper store</h1>
        <p className="text-sm text-[#5B6470] mt-1">Timed, auto-graded papers with a leaderboard and video solutions.</p>
      </div>

      {papers.length === 0 && (
        <div className="border border-dashed border-[#D8D3C4] rounded-xl p-10 text-center text-[#8A8577]">
          No papers published yet. Switch to Admin to create one.
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {papers.map((p) => {
          const owned = purchases.includes(p.id);
          const prevAttempt = attempts.find((a) => a.paperId === p.id);
          const totalMarks = p.questions.reduce((s, q) => s + q.marks, 0);
          return (
            <div key={p.id} className="bg-white border border-[#E7E3D8] rounded-xl p-5 flex flex-col">
              <div className="text-[11px] font-mono tracking-wide text-[#8A8577] mb-1">{p.subject}</div>
              <div className="font-display text-lg font-semibold leading-snug mb-2">{p.title}</div>
              <div className="flex items-center gap-4 text-xs text-[#5B6470] mb-4 font-mono">
                <span className="flex items-center gap-1"><Clock size={13}/> {p.duration} min</span>
                <span>{p.questions.length} Qs</span>
                <span>{totalMarks} marks</span>
              </div>
              <div className="mt-auto flex items-center justify-between">
                <div className="font-mono font-bold text-[#14213D]">₹{p.price}</div>
                {!owned ? (
                  <button
                    onClick={() => handleBuy(p.id)}
                    disabled={payingId === p.id}
                    className="bg-[#14213D] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1E2E52] transition disabled:opacity-60"
                  >
                    {payingId === p.id ? "Confirming UPI…" : "Buy via UPI"}
                  </button>
                ) : (
                  <button
                    onClick={() => onStart(p.id)}
                    className="bg-[#1E9E6B] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#188056] transition flex items-center gap-1.5"
                  >
                    <PlayCircle size={15}/> {prevAttempt ? "Retake" : "Start test"}
                  </button>
                )}
              </div>
              {owned && <div className="text-[11px] text-[#1E9E6B] mt-2 flex items-center gap-1"><Unlock size={11}/> Unlocked</div>}
              {!owned && <div className="text-[11px] text-[#8A8577] mt-2 flex items-center gap-1"><Lock size={11}/> Purchase to unlock</div>}
            </div>
          );
        })}
      </div>

      <div className="mt-6 text-[11px] text-[#8A8577] bg-[#F1EEE4] border border-[#E7E3D8] rounded-lg p-3">
        Demo note: "Buy via UPI" simulates a successful Razorpay/Cashfree UPI payment — no real payment gateway is wired up here.
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   INSTRUCTIONS SCREEN
--------------------------------------------------------- */
function Instructions({ paper, onBack, onBegin }) {
  const [ack, setAck] = useState(false);
  const totalMarks = paper.questions.reduce((s, q) => s + q.marks, 0);
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={onBack} className="text-sm text-[#5B6470] flex items-center gap-1 mb-4 hover:text-[#14213D]">
        <ChevronLeft size={15}/> Back to store
      </button>
      <div className="bg-white border border-[#E7E3D8] rounded-xl p-6">
        <h1 className="font-display text-2xl font-semibold mb-1">{paper.title}</h1>
        <div className="text-xs text-[#5B6470] font-mono mb-6">{paper.subject}</div>

        <div className="grid grid-cols-3 gap-3 mb-6 text-center">
          <Stat label="Duration" value={`${paper.duration} min`} />
          <Stat label="Questions" value={paper.questions.length} />
          <Stat label="Total marks" value={totalMarks} />
        </div>

        <div className="text-sm space-y-2 mb-6 text-[#3A4150]">
          <div className="font-semibold text-[#14213D]">Instructions</div>
          <ul className="list-disc list-inside space-y-1 text-[#5B6470]">
            <li>The test has MCQ (single correct), MSQ (multiple correct) and NAT (numeric answer) questions.</li>
            <li>Each question shows its own marking scheme (+marks / −marks) above the question.</li>
            <li>Use <strong>Save &amp; Next</strong>, <strong>Mark for Review &amp; Next</strong> or <strong>Clear Response</strong> to navigate.</li>
            <li>NAT answers are entered using the on-screen keypad only.</li>
            <li>The test auto-submits when the timer reaches zero. You'll get warnings at 5 minutes and 1 minute remaining.</li>
            <li>Your responses are saved automatically as you answer — a refresh will not lose your progress.</li>
            <li>Copy, paste and going back in the browser are disabled during the test.</li>
          </ul>
        </div>

        <label className="flex items-start gap-2 text-sm mb-5 cursor-pointer">
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-1" />
          <span>I have read the instructions and agree to attempt this test under exam conditions.</span>
        </label>

        <button
          disabled={!ack}
          onClick={onBegin}
          className="w-full bg-[#14213D] disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg hover:bg-[#1E2E52] transition"
        >
          Begin test
        </button>
      </div>
    </div>
  );
}
function Stat({ label, value }) {
  return (
    <div className="bg-[#F7F7F5] rounded-lg py-3">
      <div className="font-mono font-bold text-lg text-[#14213D]">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-[#8A8577] mt-0.5">{label}</div>
    </div>
  );
}

/* ---------------------------------------------------------
   TEST RUNNER (the JAM-style exam interface)
--------------------------------------------------------- */
const STATUS = {
  NOT_VISITED: "not_visited",
  NOT_ANSWERED: "not_answered",
  ANSWERED: "answered",
  MARKED: "marked",
  ANSWERED_MARKED: "answered_marked",
};

function TestRunner({ paper, onSubmit }) {
  const questions = paper.questions;
  const [idx, setIdx] = useState(0);
  const [responses, setResponses] = useState(() =>
    Object.fromEntries(questions.map((q) => [q.id, { value: q.type === "MSQ" ? [] : "", status: STATUS.NOT_VISITED }]))
  );
  const [secondsLeft, setSecondsLeft] = useState(paper.duration * 60);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [warned5, setWarned5] = useState(false);
  const [warned1, setWarned1] = useState(false);
  const [banner, setBanner] = useState(null);
  const submittedRef = useRef(false);
  const startTimeRef = useRef(Date.now());

  // mark first question visited
  useEffect(() => {
    setResponses((r) => {
      const cur = r[questions[0].id];
      if (cur.status === STATUS.NOT_VISITED) {
        return { ...r, [questions[0].id]: { ...cur, status: STATUS.NOT_ANSWERED } };
      }
      return r;
    });
    // eslint-disable-next-line
  }, []);

  const doSubmit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const timeTakenSec = Math.round((Date.now() - startTimeRef.current) / 1000);
    onSubmit(gradePaper(paper, responses, timeTakenSec));
    // eslint-disable-next-line
  }, [paper, responses]);

  // timer
  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          doSubmit();
          return 0;
        }
        if (s - 1 === 300 && !warned5) {
          setBanner("5 minutes remaining");
          setWarned5(true);
          setTimeout(() => setBanner(null), 4000);
        }
        if (s - 1 === 60 && !warned1) {
          setBanner("1 minute remaining — finish up!");
          setWarned1(true);
          setTimeout(() => setBanner(null), 4000);
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [doSubmit, warned5, warned1]);

  // disable copy/paste and back nav
  useEffect(() => {
    const block = (e) => e.preventDefault();
    document.addEventListener("copy", block);
    document.addEventListener("paste", block);
    document.addEventListener("cut", block);
    document.addEventListener("contextmenu", block);
    window.history.pushState(null, "", window.location.href);
    const onPop = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("copy", block);
      document.removeEventListener("paste", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("contextmenu", block);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  const q = questions[idx];
  const resp = responses[q.id];

  const setValue = (val) => {
    setResponses((r) => ({ ...r, [q.id]: { ...r[q.id], value: val } }));
  };

  const goto = (nextIdx, newStatusForCurrent) => {
    setResponses((r) => {
      const cur = r[q.id];
      let status = newStatusForCurrent;
      if (!status) {
        const answered = hasAnswer(cur.value, q.type);
        status = answered ? STATUS.ANSWERED : STATUS.NOT_ANSWERED;
      }
      const next = { ...r, [q.id]: { ...cur, status } };
      const target = questions[nextIdx];
      if (target && next[target.id].status === STATUS.NOT_VISITED) {
        next[target.id] = { ...next[target.id], status: STATUS.NOT_ANSWERED };
      }
      return next;
    });
    if (nextIdx >= 0 && nextIdx < questions.length) setIdx(nextIdx);
    setPaletteOpen(false);
  };

  const clearResponse = () => {
    setValue(q.type === "MSQ" ? [] : "");
    setResponses((r) => ({ ...r, [q.id]: { ...r[q.id], value: q.type === "MSQ" ? [] : "", status: STATUS.NOT_ANSWERED } }));
  };

  const markForReview = () => {
    const answered = hasAnswer(resp.value, q.type);
    goto(idx + 1, answered ? STATUS.ANSWERED_MARKED : STATUS.MARKED);
  };

  const counts = tallyStatuses(responses, questions);

  return (
    <div className="fixed inset-0 bg-[#F7F7F5] flex flex-col z-50 selectable">
      <GlobalStyle />
      {/* Exam header */}
      <div className="bg-[#14213D] text-white px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button className="md:hidden p-1.5 -ml-1" onClick={() => setPaletteOpen(true)}><Menu size={18}/></button>
          <div className="truncate">
            <div className="font-display text-sm font-semibold truncate">{paper.title}</div>
            <div className="text-[10px] text-white/60 font-mono">Q{idx + 1} of {questions.length}</div>
          </div>
        </div>
        <div className={`font-mono font-bold text-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${secondsLeft <= 60 ? "bg-[#D64545]" : secondsLeft <= 300 ? "bg-[#B08A2E]" : "bg-white/10"}`}>
          <Clock size={14}/> {formatTime(secondsLeft)}
        </div>
      </div>

      {banner && (
        <div className="bg-[#F4C95D] text-[#14213D] text-xs font-medium text-center py-1.5 flex items-center justify-center gap-1.5 shrink-0">
          <AlertTriangle size={13}/> {banner}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Question area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 max-w-2xl w-full mx-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#14213D] text-white">{q.type}</span>
              <span className="text-[11px] font-mono text-[#5B6470]">+{q.marks} {q.neg > 0 && `/ −${q.neg}`}</span>
            </div>
            <div className="font-display text-lg leading-relaxed mb-6">{q.text}</div>

            {q.type === "MCQ" && (
              <div className="space-y-2.5">
                {q.options.map((opt, i) => (
                  <label key={i} className={`flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer transition ${resp.value === i ? "border-[#14213D] bg-[#EEF0F5]" : "border-[#E7E3D8] bg-white hover:border-[#C9C3B2]"}`}>
                    <input type="radio" name="mcq" checked={resp.value === i} onChange={() => setValue(i)} className="accent-[#14213D]" />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === "MSQ" && (
              <div className="space-y-2.5">
                {q.options.map((opt, i) => {
                  const checked = (resp.value || []).includes(i);
                  return (
                    <label key={i} className={`flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer transition ${checked ? "border-[#14213D] bg-[#EEF0F5]" : "border-[#E7E3D8] bg-white hover:border-[#C9C3B2]"}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const cur = resp.value || [];
                          setValue(checked ? cur.filter((x) => x !== i) : [...cur, i]);
                        }}
                        className="accent-[#14213D]"
                      />
                      <span className="text-sm">{opt}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {q.type === "NAT" && <NatKeypad value={resp.value} onChange={setValue} />}
          </div>

          {/* Nav buttons */}
          <div className="border-t border-[#E7E3D8] bg-white p-3 shrink-0">
            <div className="max-w-2xl mx-auto flex flex-wrap items-center gap-2 justify-between">
              <div className="flex gap-2">
                <button onClick={() => goto(idx - 1)} disabled={idx === 0} className="px-3 py-2 rounded-lg border border-[#E7E3D8] text-sm disabled:opacity-30 flex items-center gap-1">
                  <ChevronLeft size={15}/> Previous
                </button>
                <button onClick={clearResponse} className="px-3 py-2 rounded-lg border border-[#E7E3D8] text-sm">Clear</button>
              </div>
              <div className="flex gap-2">
                <button onClick={markForReview} className="px-3 py-2 rounded-lg bg-[#7C5CD9] text-white text-sm">Mark & Next</button>
                <button onClick={() => goto(idx + 1)} className="px-3 py-2 rounded-lg bg-[#1E9E6B] text-white text-sm flex items-center gap-1">
                  Save & Next <ChevronRight size={15}/>
                </button>
              </div>
            </div>
            <div className="max-w-2xl mx-auto mt-2">
              <button onClick={doSubmit} className="w-full py-2.5 rounded-lg bg-[#D64545] text-white text-sm font-medium">Submit test</button>
            </div>
          </div>
        </div>

        {/* Palette (desktop) */}
        <div className="hidden md:flex w-64 border-l border-[#E7E3D8] bg-white flex-col shrink-0">
          <Palette questions={questions} responses={responses} idx={idx} counts={counts} goto={(i) => goto(i)} />
        </div>

        {/* Palette drawer (mobile) */}
        {paletteOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div className="flex-1 bg-black/40" onClick={() => setPaletteOpen(false)} />
            <div className="w-72 bg-white flex flex-col">
              <div className="flex justify-end p-2"><button onClick={() => setPaletteOpen(false)}><X size={18}/></button></div>
              <Palette questions={questions} responses={responses} idx={idx} counts={counts} goto={(i) => goto(i)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Palette({ questions, responses, idx, counts, goto }) {
  return (
    <div className="flex flex-col h-full overflow-y-auto p-4">
      <div className="text-xs font-semibold text-[#14213D] mb-3">Question palette</div>
      <div className="grid grid-cols-5 gap-2 mb-4">
        {questions.map((q, i) => {
          const st = responses[q.id].status;
          const active = i === idx;
          const cls = paletteColor(st);
          return (
            <button
              key={q.id}
              onClick={() => goto(i)}
              className={`w-10 h-10 rounded-md text-xs font-mono font-bold flex items-center justify-center transition ${cls} ${active ? "ring-2 ring-offset-1 ring-[#14213D]" : ""}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="space-y-1.5 text-[11px] mt-auto">
        <LegendRow color="bg-[#E7E3D8] text-[#5B6470]" label="Not visited" n={counts.not_visited} />
        <LegendRow color="bg-[#D64545] text-white" label="Not answered" n={counts.not_answered} />
        <LegendRow color="bg-[#1E9E6B] text-white" label="Answered" n={counts.answered} />
        <LegendRow color="bg-[#F4C95D] text-[#14213D]" label="Marked for review" n={counts.marked} />
        <LegendRow color="bg-[#7C5CD9] text-white" label="Answered & marked" n={counts.answered_marked} />
      </div>
    </div>
  );
}
function LegendRow({ color, label, n }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-4 h-4 rounded ${color} flex items-center justify-center text-[9px] font-bold`}>{n}</span>
      <span className="text-[#5B6470]">{label}</span>
    </div>
  );
}
function paletteColor(status) {
  switch (status) {
    case STATUS.ANSWERED: return "bg-[#1E9E6B] text-white";
    case STATUS.NOT_ANSWERED: return "bg-[#D64545] text-white";
    case STATUS.MARKED: return "bg-[#F4C95D] text-[#14213D]";
    case STATUS.ANSWERED_MARKED: return "bg-[#7C5CD9] text-white";
    default: return "bg-[#E7E3D8] text-[#5B6470]";
  }
}
function tallyStatuses(responses, questions) {
  const c = { not_visited: 0, not_answered: 0, answered: 0, marked: 0, answered_marked: 0 };
  questions.forEach((q) => { c[responses[q.id].status]++; });
  return c;
}
function hasAnswer(value, type) {
  if (type === "MSQ") return Array.isArray(value) && value.length > 0;
  return value !== "" && value !== null && value !== undefined;
}
function formatTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

function NatKeypad({ value, onChange }) {
  const press = (k) => {
    if (k === "clear") return onChange("");
    if (k === "back") return onChange(String(value).slice(0, -1));
    if (k === "+/-") {
      if (String(value).startsWith("-")) return onChange(String(value).slice(1));
      return onChange("-" + value);
    }
    if (k === "." && String(value).includes(".")) return;
    onChange(String(value) + k);
  };
  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", ".", "+/-"];
  return (
    <div>
      <div className="font-mono text-2xl border border-[#E7E3D8] rounded-lg px-4 py-3 mb-3 bg-white min-h-[52px]">
        {value === "" ? <span className="text-[#C9C3B2]">Answer</span> : value}
      </div>
      <div className="grid grid-cols-3 gap-2 max-w-xs">
        {keys.map((k) => (
          <button key={k} onClick={() => press(k)} className="py-3 rounded-lg bg-white border border-[#E7E3D8] font-mono font-semibold hover:bg-[#EEF0F5] active:scale-95 transition">
            {k}
          </button>
        ))}
        <button onClick={() => press("back")} className="py-3 rounded-lg bg-white border border-[#E7E3D8] font-semibold hover:bg-[#EEF0F5] col-span-1">⌫</button>
        <button onClick={() => press("clear")} className="py-3 rounded-lg bg-white border border-[#E7E3D8] font-semibold hover:bg-[#EEF0F5] col-span-2">Clear</button>
      </div>
      <div className="text-[11px] text-[#8A8577] mt-2">Typing is disabled — use the on-screen keypad, matching the real JAM interface.</div>
    </div>
  );
}

/* ---------------------------------------------------------
   GRADING
--------------------------------------------------------- */
function gradePaper(paper, responses, timeTakenSec) {
  let score = 0, correct = 0, incorrect = 0, partial = 0, unattempted = 0;
  paper.questions.forEach((q) => {
    const r = responses[q.id];
    const answered = hasAnswer(r.value, q.type);
    if (!answered) { unattempted++; return; }
    if (q.type === "MCQ") {
      if (r.value === q.correct[0]) { score += q.marks; correct++; }
      else { score -= q.neg; incorrect++; }
    } else if (q.type === "MSQ") {
      const sel = [...r.value].sort();
      const cor = [...q.correct].sort();
      const match = sel.length === cor.length && sel.every((v, i) => v === cor[i]);
      if (match) { score += q.marks; correct++; }
      else { score -= q.neg; incorrect++; }
    } else if (q.type === "NAT") {
      const num = parseFloat(r.value);
      if (!isNaN(num) && Math.abs(num - q.correct) < 0.01) { score += q.marks; correct++; }
      else { score -= q.neg; incorrect++; }
    }
  });
  const totalMarks = paper.questions.reduce((s, q) => s + q.marks, 0);
  const attempted = paper.questions.length - unattempted;
  const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;
  return { score: Math.round(score * 100) / 100, totalMarks, correct, incorrect, partial, unattempted, accuracy, timeTakenSec };
}

/* ---------------------------------------------------------
   RESULT SCREEN
--------------------------------------------------------- */
function mockLeaderboard(studentScore, totalMarks) {
  const names = ["Ansh", "Charu K", "Aditya U", "Priya M", "Rohit S", "Fatima Z", "Devansh P"];
  const others = names.map((n) => ({
    name: n,
    score: Math.round(Math.max(0, Math.min(totalMarks, totalMarks * (0.35 + Math.random() * 0.6)))),
    time: Math.round(20 + Math.random() * 40),
  }));
  const all = [...others, { name: "You", score: studentScore, time: null, self: true }]
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }));
  return all;
}

function ResultScreen({ paper, attempt, onBackToCatalog }) {
  const [videoUnlocked, setVideoUnlocked] = useState(false);
  const [board] = useState(() => mockLeaderboard(attempt.score, attempt.totalMarks));
  const you = board.find((b) => b.self);
  const percentile = Math.round(((board.length - you.rank) / board.length) * 100 * 10) / 10;
  const grade = you.rank <= Math.ceil(board.length * 0.2) ? "A" : you.rank <= Math.ceil(board.length * 0.5) ? "B" : "C";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-xs font-mono tracking-widest text-[#B08A2E] mb-1">{paper.title}</div>
      <h1 className="font-display text-2xl font-semibold mb-6">Your result</h1>

      <div className="bg-white border border-[#E7E3D8] rounded-xl p-6 text-center mb-4">
        <div className="text-[11px] uppercase tracking-wide text-[#8A8577]">Score</div>
        <div className="font-mono font-bold text-5xl text-[#14213D] my-1">{attempt.score}</div>
        <div className="text-sm text-[#5B6470] mb-3">out of {attempt.totalMarks}</div>
        <div className="flex items-center justify-center gap-1.5 text-xs text-[#8A8577] font-mono mb-3">
          <Clock size={12}/> {Math.floor(attempt.timeTakenSec / 60)}m {attempt.timeTakenSec % 60}s
        </div>
        <div className="h-2 rounded-full bg-[#E7E3D8] overflow-hidden mb-2">
          <div className="h-full bg-[#F4C95D]" style={{ width: `${Math.max(0, Math.min(100, (attempt.score / attempt.totalMarks) * 100))}%` }} />
        </div>
        <div className="text-xs text-[#5B6470]">{attempt.accuracy.toFixed(2)}% accuracy</div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <MiniStat icon={<Check size={14}/>} color="#1E9E6B" label="Correct" value={attempt.correct} />
        <MiniStat icon={<X size={14}/>} color="#D64545" label="Incorrect" value={attempt.incorrect} />
        <MiniStat icon={<Target size={14}/>} color="#F4C95D" label="Unattempted" value={attempt.unattempted} />
        <MiniStat icon={<Percent size={14}/>} color="#7C5CD9" label="Total questions" value={paper.questions.length} />
      </div>

      <div className="bg-white border border-[#E7E3D8] rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#8A8577]">Your rank</div>
            <div className="font-mono font-bold text-2xl">{you.rank} / {board.length}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wide text-[#8A8577]">Percentile</div>
            <div className="font-mono font-bold text-2xl">{percentile}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#14213D] text-[#F4C95D] font-mono font-bold flex items-center justify-center text-lg">{grade}</div>
        </div>
        <div className="text-xs font-semibold text-[#14213D] mb-2 flex items-center gap-1"><Trophy size={13}/> Leaderboard — this paper</div>
        <div className="space-y-1.5">
          {board.slice(0, 5).map((r) => (
            <div key={r.name} className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg ${r.self ? "bg-[#EEF0F5] font-semibold" : "bg-[#F7F7F5]"}`}>
              <span className="flex items-center gap-2">
                <span className="w-5 text-[#8A8577] font-mono text-xs">{r.rank}</span> {r.name}
              </span>
              <span className="font-mono">{r.score}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-[#E7E3D8] rounded-xl p-5 mb-4">
        {!videoUnlocked ? (
          <button onClick={() => setVideoUnlocked(true)} className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-[#14213D] text-white text-sm font-medium">
            <Unlock size={15}/> Unlock video solution
          </button>
        ) : (
          <div className="text-center py-6 border border-dashed border-[#E7E3D8] rounded-lg text-sm text-[#5B6470]">
            <PlayCircle size={28} className="mx-auto mb-2 text-[#14213D]"/>
            Video solution unlocked — admin's uploaded walkthrough would play here.
          </div>
        )}
      </div>

      <button onClick={onBackToCatalog} className="w-full py-3 rounded-lg border border-[#E7E3D8] text-sm font-medium">Back to store</button>
    </div>
  );
}
function MiniStat({ icon, color, label, value }) {
  return (
    <div className="bg-white border border-[#E7E3D8] rounded-xl p-3 flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: color + "22", color }}>{icon}</div>
      <div>
        <div className="font-mono font-bold text-sm leading-none">{value}</div>
        <div className="text-[10px] text-[#8A8577] mt-0.5">{label}</div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   ADMIN PANEL
--------------------------------------------------------- */
function AdminPanel({ papers, setPapers }) {
  const [editing, setEditing] = useState(null); // paper object being edited, or null

  if (editing) {
    return (
      <PaperEditor
        paper={editing}
        onCancel={() => setEditing(null)}
        onSave={async (p) => {
          const exists = papers.some((x) => x.id === p.id);
          const next = exists ? papers.map((x) => (x.id === p.id ? p : x)) : [...papers, p];
          await setPapers(next);
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs font-mono tracking-widest text-[#B08A2E] mb-1">ADMIN</div>
          <h1 className="font-display text-2xl font-semibold">Question papers</h1>
        </div>
        <button
          onClick={() =>
            setEditing({ id: uid(), title: "", subject: "", duration: 30, price: 99, published: false, createdAt: Date.now(), questions: [] })
          }
          className="bg-[#14213D] text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-1.5"
        >
          <Plus size={15}/> New paper
        </button>
      </div>

      <div className="grid gap-3">
        {papers.map((p) => (
          <div key={p.id} className="bg-white border border-[#E7E3D8] rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-display font-semibold truncate">{p.title || "Untitled paper"}</div>
              <div className="text-xs text-[#8A8577] font-mono">{p.questions.length} questions · {p.duration} min · ₹{p.price}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] font-mono px-2 py-1 rounded ${p.published ? "bg-[#1E9E6B22] text-[#1E9E6B]" : "bg-[#8A857722] text-[#8A8577]"}`}>
                {p.published ? "Published" : "Draft"}
              </span>
              <button onClick={() => setEditing(p)} className="text-sm px-3 py-1.5 rounded-lg border border-[#E7E3D8]">Edit</button>
              <button
                onClick={async () => await setPapers(papers.filter((x) => x.id !== p.id))}
                className="p-1.5 rounded-lg border border-[#E7E3D8] text-[#D64545]"
              >
                <Trash2 size={14}/>
              </button>
            </div>
          </div>
        ))}
        {papers.length === 0 && <div className="text-center text-[#8A8577] py-10 border border-dashed border-[#E7E3D8] rounded-xl">No papers yet — create one to get started.</div>}
      </div>
    </div>
  );
}

function PaperEditor({ paper, onCancel, onSave }) {
  const [p, setP] = useState(paper);
  const [qDraft, setQDraft] = useState(null);

  const totalMarks = p.questions.reduce((s, q) => s + q.marks, 0);

  const addOrUpdateQuestion = (q) => {
    setP((prev) => {
      const exists = prev.questions.some((x) => x.id === q.id);
      return { ...prev, questions: exists ? prev.questions.map((x) => (x.id === q.id ? q : x)) : [...prev.questions, q] };
    });
    setQDraft(null);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button onClick={onCancel} className="text-sm text-[#5B6470] flex items-center gap-1 mb-4"><ChevronLeft size={15}/> All papers</button>

      <div className="bg-white border border-[#E7E3D8] rounded-xl p-5 mb-5 grid sm:grid-cols-2 gap-3">
        <Field label="Title"><input value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} className="input" placeholder="e.g. Linear Algebra Mock 3" /></Field>
        <Field label="Subject / tag"><input value={p.subject} onChange={(e) => setP({ ...p, subject: e.target.value })} className="input" placeholder="e.g. JAM MA" /></Field>
        <Field label="Duration (minutes)"><input type="number" value={p.duration} onChange={(e) => setP({ ...p, duration: +e.target.value })} className="input" /></Field>
        <Field label="Price (₹)"><input type="number" value={p.price} onChange={(e) => setP({ ...p, price: +e.target.value })} className="input" /></Field>
        <div className="sm:col-span-2 flex items-center justify-between pt-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={p.published} onChange={(e) => setP({ ...p, published: e.target.checked })} /> Published (visible to students)
          </label>
          <div className="text-xs font-mono text-[#8A8577]">{p.questions.length} questions · {totalMarks} marks</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="font-display font-semibold">Questions</div>
        <div className="flex gap-2">
          <button onClick={() => setQDraft(blankQuestion("MCQ"))} className="text-sm px-3 py-1.5 rounded-lg border border-[#E7E3D8] flex items-center gap-1"><Plus size={14}/> Type question</button>
          <OcrMockButton onExtracted={(text) => setQDraft({ ...blankQuestion("MCQ"), text })} />
        </div>
      </div>

      <div className="space-y-2 mb-6">
        {p.questions.map((q, i) => (
          <div key={q.id} className="bg-white border border-[#E7E3D8] rounded-lg p-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#14213D] text-white">{q.type}</span>
                <span className="text-[10px] font-mono text-[#8A8577]">+{q.marks}{q.neg > 0 ? ` / −${q.neg}` : ""}</span>
              </div>
              <div className="text-sm truncate">{i + 1}. {q.text || <em className="text-[#C9C3B2]">Empty question</em>}</div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button onClick={() => setQDraft(q)} className="text-xs px-2.5 py-1 rounded border border-[#E7E3D8]">Edit</button>
              <button onClick={() => setP({ ...p, questions: p.questions.filter((x) => x.id !== q.id) })} className="p-1.5 rounded border border-[#E7E3D8] text-[#D64545]"><Trash2 size={12}/></button>
            </div>
          </div>
        ))}
        {p.questions.length === 0 && <div className="text-center text-[#8A8577] text-sm py-8 border border-dashed border-[#E7E3D8] rounded-lg">No questions yet.</div>}
      </div>

      {qDraft && <QuestionEditor draft={qDraft} onCancel={() => setQDraft(null)} onSave={addOrUpdateQuestion} />}

      <button
        onClick={() => onSave(p)}
        disabled={!p.title || p.questions.length === 0}
        className="w-full py-3 rounded-lg bg-[#14213D] disabled:opacity-40 text-white font-medium"
      >
        Save paper
      </button>

      <style>{`.input { border:1px solid #E7E3D8; border-radius:8px; padding:8px 10px; font-size:14px; width:100%; background:white; }`}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wide text-[#8A8577] mb-1">{label}</div>
      {children}
    </label>
  );
}

function blankQuestion(type) {
  return { id: uid(), type, text: "", options: ["", "", "", ""], correct: type === "MSQ" ? [] : type === "NAT" ? "" : [], marks: 4, neg: 1 };
}

function OcrMockButton({ onExtracted }) {
  const [busy, setBusy] = useState(false);
  return (
    <label className="text-sm px-3 py-1.5 rounded-lg border border-[#E7E3D8] flex items-center gap-1 cursor-pointer">
      <Upload size={14}/> {busy ? "Running OCR…" : "Photo upload (OCR)"}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (!e.target.files?.[0]) return;
          setBusy(true);
          setTimeout(() => {
            setBusy(false);
            onExtracted("Evaluate ∫₀¹ x² dx and select the correct value. (OCR-extracted — please review and correct before saving.)");
          }, 1200);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function QuestionEditor({ draft, onCancel, onSave }) {
  const [q, setQ] = useState(draft);

  const setType = (type) => {
    setQ({ ...q, type, options: type === "NAT" ? [] : q.options.length ? q.options : ["", "", "", ""], correct: type === "MSQ" ? [] : type === "NAT" ? "" : [] });
  };

  const toggleCorrect = (i) => {
    if (q.type === "MCQ") setQ({ ...q, correct: [i] });
    else {
      const cur = q.correct || [];
      setQ({ ...q, correct: cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i] });
    }
  };

  return (
    <div className="bg-[#EEF0F5] border border-[#C9C3B2] rounded-xl p-4 mb-6">
      <div className="flex gap-2 mb-3">
        {["MCQ", "MSQ", "NAT"].map((t) => (
          <button key={t} onClick={() => setType(t)} className={`text-xs font-mono px-3 py-1.5 rounded ${q.type === t ? "bg-[#14213D] text-white" : "bg-white border border-[#E7E3D8]"}`}>{t}</button>
        ))}
      </div>

      <textarea
        value={q.text}
        onChange={(e) => setQ({ ...q, text: e.target.value })}
        placeholder="Question text (LaTeX/math notation entered as plain text in this prototype — a KaTeX-rendered editor would replace this in production)"
        className="input mb-3 min-h-[70px]"
        style={{ border: "1px solid #E7E3D8", borderRadius: 8, padding: "8px 10px", fontSize: 14, width: "100%", background: "white" }}
      />

      {(q.type === "MCQ" || q.type === "MSQ") && (
        <div className="space-y-2 mb-3">
          {q.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                onClick={() => toggleCorrect(i)}
                className={`w-7 h-7 rounded shrink-0 flex items-center justify-center text-xs font-bold border ${(q.correct || []).includes(i) ? "bg-[#1E9E6B] text-white border-[#1E9E6B]" : "bg-white border-[#E7E3D8]"}`}
              >
                {(q.correct || []).includes(i) ? <Check size={13}/> : String.fromCharCode(65 + i)}
              </button>
              <input
                value={opt}
                onChange={(e) => {
                  const next = [...q.options];
                  next[i] = e.target.value;
                  setQ({ ...q, options: next });
                }}
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                className="flex-1"
                style={{ border: "1px solid #E7E3D8", borderRadius: 8, padding: "6px 10px", fontSize: 14, background: "white" }}
              />
            </div>
          ))}
        </div>
      )}

      {q.type === "NAT" && (
        <div className="mb-3">
          <div className="text-[11px] uppercase tracking-wide text-[#8A8577] mb-1">Correct numeric answer</div>
          <input
            type="number"
            value={q.correct}
            onChange={(e) => setQ({ ...q, correct: parseFloat(e.target.value) })}
            style={{ border: "1px solid #E7E3D8", borderRadius: 8, padding: "8px 10px", fontSize: 14, background: "white" }}
          />
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <label className="flex items-center gap-2 text-xs">
          Marks <input type="number" value={q.marks} onChange={(e) => setQ({ ...q, marks: +e.target.value })} className="w-16" style={{ border: "1px solid #E7E3D8", borderRadius: 6, padding: "4px 6px" }} />
        </label>
        <label className="flex items-center gap-2 text-xs">
          Negative <input type="number" value={q.neg} onChange={(e) => setQ({ ...q, neg: +e.target.value })} className="w-16" style={{ border: "1px solid #E7E3D8", borderRadius: 6, padding: "4px 6px" }} />
        </label>
      </div>

      <div className="flex gap-2">
        <button onClick={onCancel} className="text-sm px-3 py-1.5 rounded-lg border border-[#E7E3D8]">Cancel</button>
        <button
          onClick={() => onSave(q)}
          disabled={!q.text || (q.type !== "NAT" && q.correct.length === 0) || (q.type === "NAT" && q.correct === "")}
          className="text-sm px-4 py-1.5 rounded-lg bg-[#14213D] text-white disabled:opacity-40"
        >
          Save question
        </button>
      </div>
    </div>
  );
}
