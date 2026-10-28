import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const examples = [
  { icon: "✦", label: "Streetlights", prompt: "Streetlights in our area are not working." },
  { icon: "♻", label: "Waste management", prompt: "Garbage is piling up near our local market." },
  { icon: "⌁", label: "Road safety", prompt: "A road near our school has dangerous potholes." },
  { icon: "≈", label: "Water supply", prompt: "Our neighborhood has frequent water supply interruptions." }
];

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0 }
};

function hasBangla(text = "") {
  return /[\u0980-\u09FF]/.test(text);
}

function stripMarkup(line = "") {
  return line
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\s*(?:\d+[.)]|[-*])\s*/, "")
    .replace(/\*\*/g, "")
    .trim();
}

function parsePlan(text) {
  const groups = { category: [], assessment: [], actions: [], avoid: [], contacts: [] };
  let current = "";

  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const heading = stripMarkup(line).replace(/:$/, "").toLowerCase();

    if (/problem categor|^category\b|সমস্যার ধরন|সমস্যার শ্রেণি|সমস্যার ক্যাটাগরি/.test(heading)) {
      current = "category"; continue;
    }
    if (/short assessment|^assessment\b|risk assessment|সংক্ষিপ্ত মূল্যায়ন|সংক্ষিপ্ত মূল্যায়ন|ঝুঁকি মূল্যায়ন|ঝুঁকি মূল্যায়ন/.test(heading)) {
      current = "assessment"; continue;
    }
    if (/prioritized action|action steps|what to do|recommended actions|অগ্রাধিকারভিত্তিক করণীয়|অগ্রাধিকারভিত্তিক করণীয়|করণীয় পদক্ষেপ|করণীয় পদক্ষেপ|যা করতে হবে/.test(heading)) {
      current = "actions"; continue;
    }
    if (/what residents should avoid|what to avoid|^do not\b|^avoid\b|যা এড়িয়ে চলবেন|যা এড়িয়ে চলবেন|যা করা উচিত নয়|যা করা উচিত নয়/.test(heading)) {
      current = "avoid"; continue;
    }
    if (/when to contact|emergency contact|contact local authority|কখন স্থানীয় কর্তৃপক্ষের সঙ্গে যোগাযোগ করবেন|কখন স্থানীয় কর্তৃপক্ষের সঙ্গে যোগাযোগ করবেন|কখন যোগাযোগ করবেন/.test(heading)) {
      current = "contacts"; continue;
    }
    if (current) groups[current].push(stripMarkup(line));
  }

  const all = key => groups[key].filter(Boolean);
  const bangla = hasBangla(text);
  return {
    category: all("category").join(" ") || (bangla ? "কমিউনিটি সমস্যা" : "Community issue"),
    assessment: all("assessment").join(" ") || (bangla
      ? "প্রস্তাবিত পদক্ষেপগুলো পর্যালোচনা করুন এবং স্থানীয় পরিস্থিতি যাচাই করুন।"
      : "Review the suggested steps and verify the local situation."),
    actions: all("actions"),
    avoid: all("avoid"),
    contacts: all("contacts"),
    bangla
  };
}

function ActionIcon({ children, className = "" }) {
  return <span aria-hidden="true" className={`icon-tile ${className}`}>{children}</span>;
}

function Header({ onNewChat }) {
  return (
    <motion.header className="topbar" initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
      <a className="brand" href="#top" aria-label="Community Helper AI home">
        <span className="brand-mark"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 17.2 13.1 23 25 9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 3.7a12.3 12.3 0 1 0 12.3 12.3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg></span>
        <span>community<span className="brand-light">helper</span><small>AI FOR GOOD</small></span>
      </a>
      <nav className="nav-links" aria-label="Main navigation">
        <a href="#how-it-works">How it works</a>
        <a href="#safety">Safety first</a>
      </nav>
      <button className="button button-quiet nav-cta" onClick={onNewChat} type="button">New request <span aria-hidden="true">↗</span></button>
    </motion.header>
  );
}

function HeroArt() {
  return (
    <motion.div className="hero-visual" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.75, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}>
      <div className="visual-glow" />
      <motion.div className="orbit orbit-one" animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} />
      <motion.div className="orbit orbit-two" animate={{ rotate: -360 }} transition={{ duration: 54, repeat: Infinity, ease: "linear" }} />
      <div className="visual-center">
        <div className="community-illustration">
          <div className="sun-disc" />
          <div className="building building-a"><i /><i /><i /><i /></div>
          <div className="building building-b"><i /><i /><i /></div>
          <div className="building building-c"><i /><i /><i /><i /></div>
          <div className="pathway" />
          <div className="tree tree-a"><i /></div>
          <div className="tree tree-b"><i /></div>
        </div>
        <div className="visual-caption"><span className="status-dot" /> Small steps, shared impact</div>
      </div>
      <motion.div className="float-card float-top" animate={{ y: [0, -7, 0] }} transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}>
        <span className="float-icon mint">✓</span><span><strong>Action-ready</strong><small>Clear next steps</small></span>
      </motion.div>
      <motion.div className="float-card float-bottom" animate={{ y: [0, 7, 0] }} transition={{ duration: 4.7, repeat: Infinity, ease: "easeInOut" }}>
        <span className="float-icon lilac">✳</span><span><strong>People first</strong><small>Safety-aware guidance</small></span>
      </motion.div>
    </motion.div>
  );
}

function ResultView({ answer, problem, onFollowUp, onListen, onCopy, onPrint, voiceStatus }) {
  const plan = parsePlan(answer);
  const urgent = /immediate danger|life-threatening|electrocution|active fire|gas leak|severe flooding|serious injury|urgent emergency|তাৎক্ষণিক বিপদ|জীবন-ঝুঁকি|জরুরি বিপদ|বৈদ্যুতিক শক|গ্যাস লিক|ভয়াবহ বন্যা|গুরুতর আঘাত/i.test(answer);
  const low = /minor issue|low risk|routine maintenance|non-urgent|কম ঝুঁকি|সামান্য সমস্যা|জরুরি নয়|জরুরি নয়/i.test(answer);
  const label = urgent ? (plan.bangla ? "উচ্চ ঝুঁকির আশঙ্কা" : "Priority concern") : low ? (plan.bangla ? "কম ঝুঁকির আশঙ্কা" : "Lower concern") : (plan.bangla ? "পর্যালোচনা প্রয়োজন" : "Review recommended");

  return (
    <motion.section className="results-wrap" id="results" aria-live="polite" variants={fadeUp} initial="hidden" animate="visible" transition={{ duration: 0.45 }}>
      <div className="result-heading">
        <div><span className="section-kicker">YOUR COMMUNITY ACTION PLAN</span><h2>{plan.bangla ? "সমাধানের পরবর্তী পদক্ষেপ" : "A clearer path forward."}</h2><p>{plan.bangla ? "এআই-তৈরি নির্দেশনা—গুরুত্বপূর্ণ তথ্য স্থানীয়ভাবে যাচাই করুন।" : "AI-generated guidance. Verify important details with trusted local sources."}</p></div>
        <span className={`risk-pill ${urgent ? "risk-urgent" : low ? "risk-low" : ""}`}><i />{label}</span>
      </div>
      <div className="result-metrics">
        <div className="result-metric"><span>ISSUE TYPE</span><strong>{plan.category}</strong></div>
        <div className="result-metric"><span>AI MODEL</span><strong>Gemma · Ollama Cloud</strong></div>
        <div className="result-metric"><span>NEXT STEP</span><strong>{urgent ? "Prioritize safety" : "Review actions"}</strong></div>
      </div>
      <div className="result-grid">
        <article className="result-card assessment-card"><div className="card-heading"><ActionIcon>◎</ActionIcon><div><span>OVERVIEW</span><h3>{plan.bangla ? "সংক্ষিপ্ত মূল্যায়ন" : "What matters most"}</h3></div></div><p>{plan.assessment}</p></article>
        <article className="result-card action-card"><div className="card-heading"><ActionIcon className="mint-tile">↗</ActionIcon><div><span>RECOMMENDED</span><h3>{plan.bangla ? "অগ্রাধিকারভিত্তিক করণীয়" : "Recommended next steps"}</h3></div></div>
          {plan.actions.length ? <ol className="action-list">{plan.actions.slice(0, 6).map((item, index) => <li key={`${index}-${item}`}><span>{String(index + 1).padStart(2, "0")}</span><p>{item}</p></li>)}</ol> : <p>{plan.assessment}</p>}
        </article>
        <article className="result-card safety-card" id="safety"><div className="card-heading"><ActionIcon className="peach-tile">!</ActionIcon><div><span>SAFETY CHECK</span><h3>{plan.bangla ? "যা এড়িয়ে চলবেন" : "What to avoid"}</h3></div></div>
          {plan.avoid.length ? <ul>{plan.avoid.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : <p>{plan.bangla ? "ঝুঁকিপূর্ণ কাজ এড়িয়ে চলুন এবং যাচাইকৃত নিরাপত্তা নির্দেশনা অনুসরণ করুন।" : "Avoid actions that could put residents at risk. Follow verified local safety guidance."}</p>}
        </article>
        <article className="result-card contact-card"><div className="card-heading"><ActionIcon className="blue-tile">⌁</ActionIcon><div><span>WHO CAN HELP</span><h3>{plan.bangla ? "যোগাযোগের পরামর্শ" : "Where to take it next"}</h3></div></div><p>{plan.contacts.join(" ") || (plan.bangla ? "সংশ্লিষ্ট স্থানীয় কর্তৃপক্ষের সঙ্গে যোগাযোগ করুন এবং অফিসিয়াল তথ্য যাচাই করুন।" : "Contact the relevant local authority and independently verify official contact details.")}</p>{urgent && <p className="urgent-note">{plan.bangla ? "তাৎক্ষণিক বিপদ থাকলে স্থানীয় জরুরি সেবার সঙ্গে যোগাযোগ করুন।" : "If there is immediate danger, contact local emergency services now."}</p>}</article>
      </div>
      <details className="full-answer"><summary><span>{plan.bangla ? "সম্পূর্ণ বিশ্লেষণ দেখুন" : "Read the full AI response"}</span><span className="summary-plus">+</span></summary><div className="full-answer-content">{answer.split(/\r?\n/).filter(line => line.trim()).map((line, index) => { const clean = line.trim(); const isHeading = /^#{1,6}\s|^\*\*.+\*\*:?$/.test(clean); const isList = /^\s*(?:\d+[.)]|[-*])\s+/.test(clean); const content = stripMarkup(clean); return isHeading ? <h4 key={index}>{content.replace(/:$/, "")}</h4> : isList ? <p className="answer-list-line" key={index}><span>•</span>{content}</p> : <p key={index}>{clean.replace(/\*\*/g, "")}</p>; })}</div></details>
      <div className="result-toolbar">
        <div className="follow-up-actions"><span>CONTINUE EXPLORING</span><button onClick={() => onFollowUp("Help me prioritize the next steps.")} type="button">Prioritize actions ↗</button><button onClick={() => onFollowUp("What safety precautions should residents take?")} type="button">Safety precautions ↗</button><button onClick={() => onFollowUp("How can residents report this issue responsibly?")} type="button">How to report ↗</button></div>
        <div className="result-buttons"><button className="button button-dark" onClick={onListen} type="button">◖ Listen</button><button className="button button-dark" onClick={onCopy} type="button">▣ Copy plan</button><button className="button button-dark" onClick={onPrint} type="button">↳ Save PDF</button></div>
        {voiceStatus && <p className="micro-status" aria-live="polite">{voiceStatus}</p>}
      </div>
    </motion.section>
  );
}

export default function App() {
  const [problem, setProblem] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [voiceStatus, setVoiceStatus] = useState("Voice input is available in supported browsers.");
  const [voiceLanguage, setVoiceLanguage] = useState("en-US");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const inputBeforeVoice = useRef("");
  const problemRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceStatus("Voice input is not supported in this browser. You can still type your problem.");
      return undefined;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setListening(true);
      setVoiceStatus("Listening… speak now.");
    };
    recognition.onresult = event => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript + " ";
        else interimText += event.results[i][0].transcript;
      }
      setProblem([inputBeforeVoice.current, finalText.trim(), interimText.trim()].filter(Boolean).join(" ").slice(0, 2000));
    };
    recognition.onerror = event => {
      const messages = {
        "not-allowed": "Microphone permission denied. Allow access in browser settings.",
        "no-speech": "No speech detected. Try again.",
        "network": "Speech recognition needs a network connection in this browser.",
        "audio-capture": "No microphone found. Check your device."
      };
      setVoiceStatus(messages[event.error] || `Voice input error: ${event.error}`);
    };
    recognition.onend = () => {
      setListening(false);
      setVoiceStatus(current => current.startsWith("Listening") ? "Voice capture ended. Review your text, then generate the plan." : current);
    };

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  const reset = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (recognitionRef.current && listening) recognitionRef.current.stop();
    setProblem("");
    setAnswer("");
    setError("");
    setBusy(false);
    setVoiceStatus("Ready for a new community request.");
    window.setTimeout(() => problemRef.current?.focus(), 0);
  };

  const requestHelp = async prompt => {
    const cleaned = prompt.trim();
    if (!cleaned) {
      setError("Describe a community problem first, or choose one of the examples.");
      problemRef.current?.focus();
      return;
    }
    if (cleaned.length > 2000) {
      setError("Please keep your description under 2,000 characters.");
      return;
    }

    setBusy(true);
    setError("");
    setAnswer("");
    try {
      const response = await fetch("/api/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem: cleaned })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
      const generated = data.answer || data.response || data.reply;
      if (typeof generated !== "string" || !generated.trim()) throw new Error("The AI returned an empty answer. Please try again.");
      setAnswer(generated.trim());
      window.setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (requestError) {
      setError(requestError.message || "Could not connect to Community Helper AI. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const startVoice = () => {
    if (!recognitionRef.current) {
      setVoiceStatus("Voice input is unsupported here. Try a supported browser on HTTPS, or type your issue.");
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      return;
    }
    inputBeforeVoice.current = problem.trim();
    recognitionRef.current.lang = voiceLanguage;
    try {
      recognitionRef.current.start();
    } catch {
      setVoiceStatus("Could not start the microphone. Try again.");
    }
  };

  const listenToAnswer = () => {
    if (!("speechSynthesis" in window)) {
      setVoiceStatus("Text-to-speech is not supported by this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(answer);
    const bangla = hasBangla(answer);
    utterance.lang = bangla ? "bn-BD" : voiceLanguage;
    utterance.rate = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const desired = bangla ? "bn" : utterance.lang.slice(0, 2).toLowerCase();
    utterance.voice = voices.find(voice => voice.lang.toLowerCase().startsWith(desired)) || null;
    utterance.onstart = () => setVoiceStatus("Reading the AI response aloud.");
    utterance.onend = () => setVoiceStatus("Finished reading the response.");
    utterance.onerror = () => setVoiceStatus("Speech playback failed. Check the voices available on your device.");
    window.speechSynthesis.speak(utterance);
  };

  const copyPlan = async () => {
    try {
      await navigator.clipboard.writeText(answer);
      setVoiceStatus("Action plan copied to clipboard.");
    } catch {
      setVoiceStatus("Copy was blocked by the browser. You can select the full analysis text instead.");
    }
  };

  const followUp = question => {
    const nextPrompt = `${problem.trim()}\n\nFollow-up: ${question}`.trim();
    setProblem(nextPrompt.slice(0, 2000));
    requestHelp(nextPrompt);
  };

  return (
    <div className="app-shell" id="top">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <Header onNewChat={reset} />
      <main className="page-content">
        <section className="hero-section">
          <motion.div className="hero-copy" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.11, delayChildren: 0.08 } } }}>
            <motion.div className="status-tag" variants={fadeUp} transition={{ duration: 0.5 }}><span className="status-dot" /> AI-POWERED COMMUNITY SUPPORT</motion.div>
            <motion.h1 variants={fadeUp} transition={{ duration: 0.6 }}>Make your community<br /><span>a better place.</span></motion.h1>
            <motion.p className="hero-description" variants={fadeUp} transition={{ duration: 0.55 }}>Turn everyday concerns into practical next steps. Get a clearer plan, safety guidance, and ideas for working together.</motion.p>
            <motion.div className="hero-buttons" variants={fadeUp} transition={{ duration: 0.55 }}>
              <a className="button button-primary" href="#get-started">Find a way forward <span>↗</span></a>
              <a className="button button-text" href="#how-it-works"><span className="play-icon">▶</span> How it works</a>
            </motion.div>
            <motion.div className="trust-row" variants={fadeUp} transition={{ duration: 0.55 }}>
              <div className="avatar-stack"><span>R</span><span>♡</span><span>✦</span></div>
              <p><strong>People-first by design</strong><small>Practical guidance. Local action.</small></p>
            </motion.div>
          </motion.div>
          <HeroArt />
        </section>

        <motion.section className="request-card" id="get-started" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.16 }} variants={fadeUp} transition={{ duration: 0.55 }}>
          <div className="request-heading"><div><span className="section-kicker">LET'S START WITH YOUR CONCERN</span><h2>What’s happening near you?</h2><p>Describe the issue in your own words. A little context helps create a more useful plan.</p></div><div className="step-bubble">01 <span>/ 01</span></div></div>
          <form onSubmit={event => { event.preventDefault(); requestHelp(problem); }}>
            <label className="sr-only" htmlFor="problem">Describe your community problem</label>
            <textarea id="problem" ref={problemRef} value={problem} maxLength={2000} onChange={event => setProblem(event.target.value)} placeholder="For example: the streetlights near our school have not worked for a week…" />
            <div className="input-meta"><span>{problem.length}/2000 characters</span><span>↳ Please avoid sharing private contact details.</span></div>
            <div className="request-tools">
              <div className="voice-tools"><button type="button" className={`button button-outline ${listening ? "recording" : ""}`} onClick={startVoice}>{listening ? "■ Stop listening" : "♩ Speak to type"}</button><label className="sr-only" htmlFor="voice-language">Voice language</label><select id="voice-language" className="language-select" value={voiceLanguage} onChange={event => setVoiceLanguage(event.target.value)}><option value="en-US">English voice</option><option value="bn-BD">বাংলা voice</option></select></div>
              <span className="voice-status" aria-live="polite">{voiceStatus}</span>
            </div>
            <div className="example-row"><span>TRY AN EXAMPLE</span>{examples.map(example => <button type="button" className={problem === example.prompt ? "example-chip selected" : "example-chip"} key={example.label} onClick={() => { setProblem(example.prompt); setError(""); problemRef.current?.focus(); }}><span>{example.icon}</span>{example.label}</button>)}</div>
            <button className="button button-submit" type="submit" disabled={busy}>{busy ? <><span className="button-spinner" /> Building your action plan…</> : <>Generate action plan <span>↗</span></>}</button>
          </form>
          <AnimatePresence>{error && <motion.div className="error-banner" role="alert" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><span>!</span>{error}<button type="button" onClick={() => setError("")} aria-label="Dismiss error">×</button></motion.div>}</AnimatePresence>
          <p className="privacy-note"><span>♧</span> Your input is sent to the configured AI service to generate a response. Don’t include sensitive personal information.</p>
        </motion.section>

        <AnimatePresence mode="wait">
          {busy && <motion.div className="loading-card" key="loading" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><motion.div className="loading-symbol" animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>✳</motion.div><div><strong>Putting the pieces together…</strong><p>Turning your concern into a practical next step.</p></div><div className="loading-bars"><i /><i /><i /></div></motion.div>}
          {answer && !busy && <ResultView key="answer" answer={answer} problem={problem} onFollowUp={followUp} onListen={listenToAnswer} onCopy={copyPlan} onPrint={() => window.print()} voiceStatus={voiceStatus} />}
        </AnimatePresence>

        <section className="how-section" id="how-it-works">
          <motion.div className="section-intro" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={fadeUp}>
            <span className="section-kicker">SIMPLE BY DESIGN</span><h2>From concern to <span>community action.</span></h2><p>No complicated forms. Just a clearer way to start making a difference.</p>
          </motion.div>
          <div className="steps-grid">
            {[
              { n: "01", icon: "⌕", title: "Describe the issue", copy: "Start with what you’ve noticed, where it happens, and who may be affected." },
              { n: "02", icon: "✳", title: "Get a practical plan", copy: "AI organizes your concern into useful priorities, precautions, and next steps." },
              { n: "03", icon: "↗", title: "Take informed action", copy: "Review suggestions, check local facts, and decide what makes sense for your community." }
            ].map((step, index) => <motion.article className="step-card" key={step.n} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} variants={fadeUp} transition={{ duration: 0.5, delay: index * 0.1 }} whileHover={{ y: -5, transition: { duration: 0.2 } }}><div className="step-top"><ActionIcon>{step.icon}</ActionIcon><span>{step.n}</span></div><h3>{step.title}</h3><p>{step.copy}</p></motion.article>)}
          </div>
        </section>

        <motion.section className="safety-banner" id="safety" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.55 }}>
          <div className="safety-symbol">♡</div><div><span>RESPONSIBLE AI, REAL-WORLD CARE</span><h2>Helpful guidance. Human judgment.</h2><p>AI can make mistakes and doesn’t verify local conditions. Check important details with trusted sources. For immediate danger, contact your local emergency services.</p></div><a href="#get-started" aria-label="Start a community request">↑</a>
        </motion.section>
      </main>
      <footer className="site-footer"><a className="brand footer-brand" href="#top"><span className="brand-mark"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 17.2 13.1 23 25 9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 3.7a12.3 12.3 0 1 0 12.3 12.3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg></span><span>community<span className="brand-light">helper</span><small>AI FOR GOOD</small></span></a><p>Small problems. Shared progress. <span>© {new Date().getFullYear()} Community Helper AI</span></p><a href="#top" className="back-top">Back to top ↑</a></footer>
    </div>
  );
}
