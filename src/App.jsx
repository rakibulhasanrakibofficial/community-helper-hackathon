import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

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

function FloatingSpheres() {
  const city = useRef();
  const lights = useRef();
  const cars = useRef();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (city.current) {
      city.current.rotation.y = Math.sin(t * 0.12) * 0.065;
      city.current.position.y = Math.sin(t * 0.65) * 0.025;
    }
    if (lights.current) lights.current.children.forEach((light, i) => {
      light.material.emissiveIntensity = 1.1 + (Math.sin(t * 2.4 + i * 1.7) + 1) * 0.8;
    });
    if (cars.current) cars.current.children.forEach((car, i) => {
      const phase = (t * 0.16 + i * 0.48) % 1;
      car.position.x = -1.45 + phase * 2.9;
      car.position.z = i % 2 ? 0.66 : -0.52;
    });
  });

  const buildings = [
    { x: -1.15, z: -0.28, w: 0.56, h: 1.25, d: 0.54, color: "#24475b", floors: 3, balcony: true },
    { x: -0.55, z: -0.58, w: 0.68, h: 1.62, d: 0.58, color: "#d2dce3", floors: 4, balcony: true },
    { x: 0.12, z: -0.23, w: 0.86, h: 1.02, d: 0.78, color: "#233c50", floors: 2, balcony: true },
    { x: 0.96, z: -0.36, w: 0.62, h: 1.38, d: 0.62, color: "#244e65", floors: 3, balcony: true },
    { x: 1.38, z: 0.35, w: 0.45, h: 0.82, d: 0.46, color: "#6c91a5", floors: 2 },
    { x: -1.52, z: 0.38, w: 0.4, h: 0.74, d: 0.43, color: "#7c9faf", floors: 2 },
    { x: 0.05, z: -0.91, w: 0.55, h: 0.67, d: 0.42, color: "#345b70", floors: 2 },
    { x: -0.95, z: 0.48, w: 0.5, h: 0.7, d: 0.42, color: "#34566b", floors: 2 },
    { x: 0.78, z: 0.56, w: 0.58, h: 0.86, d: 0.5, color: "#b8cbd5", floors: 2 }
  ];
  const trees = [[-1.72, 0.45], [-1.48, -0.56], [-0.94, 0.78], [-0.25, 0.9], [0.58, 0.84], [1.64, 0.12], [1.58, -0.58], [0.74, -0.98], [-0.78, -0.98], [1.1, 0.75]];
  const windows = [];
  const solarPanels = [];

  return (
    <group ref={city}>
      {/* Layered glossy circular foundation and illuminated rings */}
      <mesh position={[0, -1.39, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.12, 2.24, 0.2, 96]} />
        <meshStandardMaterial color="#091b2a" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, -1.285, 0]} castShadow>
        <cylinderGeometry args={[2.19, 2.19, 0.055, 96]} />
        <meshStandardMaterial color="#1a6378" metalness={0.85} roughness={0.18} emissive="#1bbcd6" emissiveIntensity={1.1} />
      </mesh>
      <mesh position={[0, -1.235, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.08, 2.12, 0.09, 96]} />
        <meshStandardMaterial color="#132d40" metalness={0.68} roughness={0.27} />
      </mesh>
      <mesh position={[0, -1.185, 0]} receiveShadow>
        <cylinderGeometry args={[2.01, 2.01, 0.035, 96]} />
        <meshStandardMaterial color="#24576b" metalness={0.65} roughness={0.3} emissive="#0c647d" emissiveIntensity={0.55} />
      </mesh>
      <mesh position={[0, -1.16, 0]} receiveShadow>
        <cylinderGeometry args={[1.94, 1.96, 0.035, 96]} />
        <meshStandardMaterial color="#0e2332" roughness={0.88} />
      </mesh>
      {[1.35, 1.72, 2.05].map((r, i) => (
        <mesh key={i} position={[0, -1.137 + i * 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r, r + 0.018, 96]} />
          <meshStandardMaterial color={i === 1 ? "#e8b96d" : "#61e8ff"} emissive={i === 1 ? "#f5a94d" : "#19c8ef"} emissiveIntensity={i === 1 ? 1.25 : 1.6} metalness={0.65} roughness={0.2} />
        </mesh>
      ))}

      {/* Miniature roads and connected community blocks */}
      <mesh position={[0, -1.105, 0.48]} rotation={[-0.06, 0, 0]}>
        <boxGeometry args={[0.36, 0.018, 2.45]} />
        <meshStandardMaterial color="#182d3c" roughness={0.85} />
      </mesh>
      <mesh position={[0.12, -1.103, -0.08]} rotation={[0, 0.1, 0]}>
        <boxGeometry args={[2.85, 0.016, 0.24]} />
        <meshStandardMaterial color="#1b3445" roughness={0.85} />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[0, -1.091, -0.65 + i * 0.34]}>
          <boxGeometry args={[0.025, 0.012, 0.13]} />
          <meshBasicMaterial color="#bcefff" />
        </mesh>
      ))}
      {[-0.8, 0.8].map((x, i) => (
        <mesh key={i} position={[x, -1.09, 0.1]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.022, 0.012, 0.12]} />
          <meshBasicMaterial color="#f1d9a4" />
        </mesh>
      ))}

      {/* Architectural blocks, rooftop slabs, warm windows and balconies */}
      {buildings.map((b, index) => (
        <group key={index} position={[b.x, -1.07 + b.h / 2, b.z]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color={b.color} roughness={0.32} metalness={0.35} />
          </mesh>
          <mesh position={[0, b.h / 2 + 0.035, 0]} castShadow>
            <boxGeometry args={[b.w + 0.09, 0.065, b.d + 0.09]} />
            <meshStandardMaterial color={index % 3 === 0 ? "#dce7eb" : "#8ca8b8"} roughness={0.25} metalness={0.55} />
          </mesh>
          {/* Roof equipment and ventilation units */}
          {index % 2 === 0 && <mesh position={[b.w * 0.18, b.h / 2 + 0.105, -b.d * 0.12]} castShadow>
            <boxGeometry args={[0.16, 0.12, 0.16]} />
            <meshStandardMaterial color="#738d9b" metalness={0.8} roughness={0.25} />
          </mesh>}
          {Array.from({ length: b.floors }, (_, floor) => (
            <group key={floor} position={[0, -b.h / 2 + 0.2 + floor * ((b.h - 0.28) / b.floors), b.d / 2 + 0.012]}>
              {[-1, 0, 1].map((col) => (
                <mesh key={col} position={[col * b.w * 0.27, 0, 0]} ref={(el) => { if (el) windows[index * 15 + floor * 3 + col + 1] = el; }}>
                  <boxGeometry args={[Math.min(0.105, b.w * 0.19), 0.13, 0.02]} />
                  <meshStandardMaterial color={(floor + col + index) % 3 === 0 ? "#ffe0a2" : "#8feaff"} emissive={(floor + col + index) % 3 === 0 ? "#ffb957" : "#36d8f5"} emissiveIntensity={0.95} roughness={0.2} />
                </mesh>
              ))}
            </group>
          ))}
          {b.balcony && [0, 1].map((floor) => (
            <group key={floor} position={[0, -b.h / 2 + 0.38 + floor * b.h * 0.32, b.d / 2 + 0.075]}>
              <mesh position={[0, -0.09, 0]}>
                <boxGeometry args={[b.w * 0.92, 0.035, 0.18]} />
                <meshStandardMaterial color="#7c9eae" metalness={0.8} roughness={0.25} />
              </mesh>
              {[-1, 0, 1].map((n) => (
                <mesh key={n} position={[n * b.w * 0.38, 0, 0.08]}>
                  <boxGeometry args={[0.012, 0.17, 0.012]} />
                  <meshStandardMaterial color="#c5e9f3" metalness={0.85} roughness={0.2} />
                </mesh>
              ))}
            </group>
          ))}
          {/* Solar panel arrays on selected rooftops */}
          {index === 1 && (
            <group ref={(el) => { if (el) solarPanels[0] = el; }} position={[0, b.h / 2 + 0.08, -0.05]} rotation={[-0.18, 0, 0]}>
              {[-1, 0, 1].map((n) => (
                <mesh key={n} position={[n * 0.15, 0, 0]}>
                  <boxGeometry args={[0.13, 0.018, 0.28]} />
                  <meshStandardMaterial color="#174d72" metalness={0.75} roughness={0.2} emissive="#1d6f9d" emissiveIntensity={0.35} />
                </mesh>
              ))}
            </group>
          )}
        </group>
      ))}

      {/* Water tank, rooftop utility boxes and small community service structures */}
      <group position={[-1.62, -0.54, 0.02]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.17, 0.17, 0.78, 24]} />
          <meshStandardMaterial color="#c8e4f1" metalness={0.7} roughness={0.22} />
        </mesh>
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.04, 24]} />
          <meshStandardMaterial color="#effaff" metalness={0.6} roughness={0.2} />
        </mesh>
        <mesh position={[0, -0.4, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.035, 24]} />
          <meshStandardMaterial color="#7eafc5" metalness={0.6} roughness={0.25} />
        </mesh>
      </group>
      {[-0.7, 0.78, 1.12].map((x, i) => (
        <mesh key={i} position={[x, -0.94, i % 2 ? -0.12 : 0.18]} castShadow>
          <boxGeometry args={[0.22, 0.19, 0.2]} />
          <meshStandardMaterial color="#7f9cab" metalness={0.55} roughness={0.35} />
        </mesh>
      ))}

      {/* Small landscaped trees with trunks and layered foliage */}
      {trees.map(([x, z], i) => (
        <group key={i} position={[x, -1.05, z]}>
          <mesh position={[0, 0.13, 0]} castShadow>
            <cylinderGeometry args={[0.025, 0.04, 0.27, 8]} />
            <meshStandardMaterial color="#9b7855" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.34, 0]} castShadow>
            <icosahedronGeometry args={[0.16 + (i % 3) * 0.022, 2]} />
            <meshStandardMaterial color={i % 2 ? "#176f65" : "#2a9b78"} roughness={0.82} />
          </mesh>
          <mesh position={[-0.07, 0.4, 0.035]} scale={0.62} castShadow>
            <icosahedronGeometry args={[0.14, 1]} />
            <meshStandardMaterial color="#58b990" roughness={0.84} />
          </mesh>
          <mesh position={[0, -0.005, 0]}>
            <cylinderGeometry args={[0.11, 0.13, 0.035, 16]} />
            <meshStandardMaterial color="#263f4b" metalness={0.5} roughness={0.45} />
          </mesh>
        </group>
      ))}

      {/* Streetlights and animated cyan signals */}
      {[-1.58, -0.72, 0.82, 1.62, 0.32].map((x, i) => (
        <group key={i} position={[x, -0.92, i % 2 ? 0.5 : -0.62]}>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.012, 0.02, 0.52, 8]} />
            <meshStandardMaterial color="#b8d1dc" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[0.04, 0.51, 0]}>
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshStandardMaterial color="#c7faff" emissive="#54dff5" emissiveIntensity={2.4} />
          </mesh>
        </group>
      ))}
      <group ref={lights}>
        {[-1.18, -0.72, -0.22, 0.28, 0.78, 1.28].map((x, i) => (
          <mesh key={i} position={[x, -0.99, i % 2 ? 0.74 : -0.64]}>
            <sphereGeometry args={[0.035, 12, 12]} />
            <meshStandardMaterial color="#b9faff" emissive="#41d8f1" emissiveIntensity={1.2} />
          </mesh>
        ))}
      </group>

      {/* Tiny vehicles moving along the miniature road */}
      <group ref={cars}>
        {[0, 1, 2].map((i) => (
          <group key={i} position={[-1.4 + i * 0.7, -1.015, i % 2 ? 0.66 : -0.52]}>
            <mesh castShadow>
              <boxGeometry args={[0.19, 0.075, 0.1]} />
              <meshStandardMaterial color={i % 2 ? "#9beaf5" : "#d9e7ee"} metalness={0.65} roughness={0.25} emissive={i % 2 ? "#2bc7e7" : "#253f51"} emissiveIntensity={0.3} />
            </mesh>
            <mesh position={[0.075, 0.045, 0]}>
              <boxGeometry args={[0.07, 0.035, 0.075]} />
              <meshStandardMaterial color="#7ec6da" metalness={0.35} roughness={0.22} />
            </mesh>
            {[-1, 1].map((side) => (
              <mesh key={side} position={[side * 0.055, -0.035, 0.052]}>
                <sphereGeometry args={[0.018, 8, 8]} />
                <meshStandardMaterial color="#fff1bd" emissive="#ffc96b" emissiveIntensity={1.2} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    </group>
  );
}

function HeroArt() {
  return (
    <motion.div className="hero-visual" initial={{ opacity: 0, scale: 0.94, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}>
      <div className="visual-glow" />
      <motion.div className="orbit orbit-one" animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} />
      <motion.div className="orbit orbit-two" animate={{ rotate: -360 }} transition={{ duration: 54, repeat: Infinity, ease: "linear" }} />
      <div className="real3d-scene" role="img" aria-label="Animated three-dimensional community scene with buildings, trees, road, and floating glass spheres">
        <Canvas camera={{ position: [0, 0.2, 6.8], fov: 38 }} dpr={[1, 1.5]} shadows gl={{ antialias: true, alpha: true }}>
          <color attach="background" args={["#0b1d31"]} />
          <ambientLight intensity={1.25} />
          <hemisphereLight args={["#bcefff", "#071421", 1.2]} />
          <directionalLight position={[-3, 5, 5]} intensity={3} color="#b8f7ff" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
          <pointLight position={[2.5, 2.4, 2.2]} intensity={32} distance={8} color="#35d9e8" />
          <pointLight position={[-2.4, 1.6, 1.2]} intensity={20} distance={6} color="#63e7b8" />
          <FloatingSpheres />
        </Canvas>
      </div>
      <div className="visual-caption"><span className="status-dot" /> Small steps, shared impact</div>
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
  const [savedDraft, setSavedDraft] = useState(() => { try { return window.localStorage.getItem("community-helper-draft") || ""; } catch { return ""; } });
  const [draftNotice, setDraftNotice] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [historyItems, setHistoryItems] = useState([]);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [selectedHistoryIds, setSelectedHistoryIds] = useState([]);
  const [historyDeleteBusy, setHistoryDeleteBusy] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("Voice input is available in supported browsers.");
  const [voiceStudioStatus, setVoiceStudioStatus] = useState({ checking: true, connected: false, version: "", message: "Checking local VoiceStudio…" });
  const [voiceLanguage, setVoiceLanguage] = useState("en-US");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const inputBeforeVoice = useRef("");
  const problemRef = useRef(null);

  useEffect(() => {
    let active = true;
    fetch("/api/voicestudio/status")
      .then(response => response.json())
      .then(data => { if (active) setVoiceStudioStatus({ checking: false, connected: Boolean(data.connected), version: data.version || "", message: data.message || "" }); })
      .catch(() => { if (active) setVoiceStudioStatus({ checking: false, connected: false, version: "", message: "Could not check VoiceStudio status." }); });
    return () => { active = false; };
  }, []);

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
      // In development StrictMode may clean up before recording ever starts.
      try { recognition.stop(); } catch { /* Nothing to stop yet. */ }
      recognitionRef.current = null;
    };
  }, []);

  const saveDraft = () => {
    if (!problem.trim()) {
      setDraftNotice("Write a short description before saving.");
      return;
    }
    try {
      window.localStorage.setItem("community-helper-draft", problem);
      setSavedDraft(problem);
      setDraftNotice("Draft saved on this device only.");
    } catch {
      setDraftNotice("Could not save draft in this browser.");
    }
  };

  const restoreDraft = () => {
    if (!savedDraft) return;
    setProblem(savedDraft);
    setDraftNotice("Saved draft restored.");
    setError("");
    problemRef.current?.focus();
  };

  const loadHistory = async () => {
    setHistoryBusy(true);
    setHistoryError("");
    try {
      const response = await fetch("/api/history");
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not load saved history.");
      const requests = Array.isArray(data.requests) ? data.requests : [];
      setHistoryItems(requests);
      const availableIds = new Set(requests.map(item => item._id));
      setSelectedHistoryIds(current => current.filter(id => availableIds.has(id)));
    } catch (historyRequestError) {
      setHistoryError(historyRequestError.message || "Could not load saved history.");
    } finally {
      setHistoryBusy(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const toggleHistorySelection = id => {
    setSelectedHistoryIds(current =>
      current.includes(id) ? current.filter(selectedId => selectedId !== id) : [...current, id]
    );
  };

  const toggleAllHistorySelection = () => {
    setSelectedHistoryIds(current =>
      historyItems.length > 0 && current.length === historyItems.length
        ? []
        : historyItems.map(item => item._id)
    );
  };

  const deleteHistory = async scope => {
    const deletingAll = scope === "all";
    const ids = deletingAll ? [] : selectedHistoryIds;
    if (!deletingAll && ids.length === 0) {
      setHistoryError("Select at least one history item to delete.");
      return;
    }

    const confirmation = deletingAll
      ? "Delete ALL saved community history? This cannot be undone."
      : `Delete ${ids.length} selected history item(s)? This cannot be undone.`;
    if (!window.confirm(confirmation)) return;

    setHistoryDeleteBusy(true);
    setHistoryError("");
    try {
      const response = await fetch("/api/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deletingAll ? { all: true } : { ids })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not delete saved history.");

      if (deletingAll) {
        setHistoryItems([]);
      } else {
        const removedIds = new Set(ids);
        setHistoryItems(current => current.filter(item => !removedIds.has(item._id)));
      }
      setSelectedHistoryIds([]);
    } catch (deleteError) {
      setHistoryError(deleteError.message || "Could not delete saved history.");
    } finally {
      setHistoryDeleteBusy(false);
    }
  };


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
      await loadHistory();
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
              <motion.a className="button button-primary" href="#get-started" whileHover={{ y: -4, scale: 1.025 }} whileTap={{ scale: 0.975 }} transition={{ type: "spring", stiffness: 420, damping: 18 }}>Find a way forward <motion.span aria-hidden="true" animate={{ x: [0, 3, 0], y: [0, -2, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}>↗</motion.span></motion.a>
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
            <div className="input-meta"><span>{problem.length}/2000 characters</span><span>↳ Please avoid sharing private contact details.</span><div className="draft-actions">{savedDraft && <button type="button" className="clear-draft restore-draft" onClick={restoreDraft}>Restore saved</button>}{problem && <button type="button" className="clear-draft" onClick={() => { setProblem(""); setError(""); setDraftNotice(""); problemRef.current?.focus(); }}>Clear ×</button>}<button type="button" className="clear-draft save-draft" onClick={saveDraft} disabled={!problem.trim()}>Save draft ↓</button></div></div>{draftNotice && <p className="draft-notice" aria-live="polite">{draftNotice}</p>}
            <div className="request-tools">
              <div className="voice-tools"><button type="button" className={`button button-outline ${listening ? "recording" : ""}`} onClick={startVoice}>{listening ? "■ Stop listening" : "♩ Speak to type"}</button><label className="sr-only" htmlFor="voice-language">Voice language</label><select id="voice-language" className="language-select" value={voiceLanguage} onChange={event => setVoiceLanguage(event.target.value)}><option value="en-US">English voice</option><option value="bn-BD">বাংলা voice</option></select></div>
              <span className="voice-status" aria-live="polite">{voiceStatus}</span>
            </div>
            <div className="example-row"><span>TRY AN EXAMPLE</span>{examples.map(example => <motion.button type="button" className={problem === example.prompt ? "example-chip selected" : "example-chip"} key={example.label} onClick={() => { setProblem(example.prompt); setError(""); problemRef.current?.focus(); }} initial={{ opacity: 0, y: 10, scale: 0.96 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: examples.indexOf(example) * 0.07 }} whileTap={{ scale: 0.96 }}><span>{example.icon}</span>{example.label}</motion.button>)}</div>
            <motion.button className="button button-submit" type="submit" disabled={busy} whileHover={!busy ? { y: -2, scale: 1.008 } : {}} whileTap={!busy ? { scale: 0.985 } : {}} transition={{ type: "spring", stiffness: 400, damping: 20 }}>{busy ? <><span className="button-spinner" /> Building your action plan…</> : <>Generate action plan <motion.span aria-hidden="true" animate={{ x: [0, 4, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>↗</motion.span></>}</motion.button>
          </form>
          <AnimatePresence>{error && <motion.div className="error-banner" role="alert" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><span>!</span>{error}<button type="button" onClick={() => setError("")} aria-label="Dismiss error">×</button></motion.div>}</AnimatePresence>
          <p className="privacy-note"><span>♧</span> Your input is sent to the configured AI service to generate a response. Don’t include sensitive personal information.</p>
        </motion.section>

        <AnimatePresence mode="wait">
          {busy && <motion.div className="loading-card" key="loading" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><motion.div className="loading-symbol" animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>✳</motion.div><div><strong>Putting the pieces together…</strong><p>Turning your concern into a practical next step.</p></div><div className="loading-bars"><i /><i /><i /></div></motion.div>}
          {answer && !busy && <ResultView key="answer" answer={answer} problem={problem} onFollowUp={followUp} onListen={listenToAnswer} onCopy={copyPlan} onPrint={() => window.print()} voiceStatus={voiceStatus} />}
        </AnimatePresence>

        <section className="history-section" id="saved-history">
          <div className="history-heading">
            <div>
              <span className="section-kicker">YOUR PREVIOUS REQUESTS</span>
              <h2>Saved community history</h2>
              <p>Recent AI action plans saved in MongoDB Atlas on this project’s server.</p>
            </div>
            <div className="history-actions">
              <button className="button button-outline history-refresh" type="button" onClick={loadHistory} disabled={historyBusy || historyDeleteBusy}>
                {historyBusy ? "Loading…" : "↻ Refresh history"}
              </button>
              <button className="button button-outline history-delete-selected" type="button" onClick={() => deleteHistory("selected")} disabled={historyDeleteBusy || selectedHistoryIds.length === 0}>
                {historyDeleteBusy ? "Deleting…" : `Delete selected (${selectedHistoryIds.length})`}
              </button>
              <button className="button button-outline history-delete-all" type="button" onClick={() => deleteHistory("all")} disabled={historyDeleteBusy || historyItems.length === 0}>
                Delete all
              </button>
            </div>
          </div>
          {historyError && <p className="history-message history-error" role="alert">{historyError}</p>}
          {!historyError && !historyBusy && historyItems.length === 0 && (
            <div className="history-empty">
              <span aria-hidden="true">◷</span>
              <strong>No saved requests yet</strong>
              <p>Generate an action plan and it will appear here when MongoDB is connected.</p>
            </div>
          )}
          {historyBusy && historyItems.length === 0 && <p className="history-message">Loading saved requests…</p>}
          {historyItems.length > 0 && (
            <>
              <label className="history-select-all">
                <input
                  type="checkbox"
                  checked={historyItems.length > 0 && selectedHistoryIds.length === historyItems.length}
                  onChange={toggleAllHistorySelection}
                  disabled={historyDeleteBusy}
                />
                <span>Select all {historyItems.length} saved requests</span>
              </label>
              <div className="history-grid">
                {historyItems.map(item => (
                  <article className={`history-card${selectedHistoryIds.includes(item._id) ? " history-card-selected" : ""}`} key={item._id}>
                    <label className="history-card-select">
                      <input
                        type="checkbox"
                        checked={selectedHistoryIds.includes(item._id)}
                        onChange={() => toggleHistorySelection(item._id)}
                        disabled={historyDeleteBusy}
                      />
                      <span>Select this request</span>
                    </label>
                    <div className="history-card-meta">
                    <span>{item.provider || "AI assistant"}</span>
                    <time dateTime={item.createdAt}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : "Date unavailable"}</time>
                  </div>
                  <h3>{item.problem}</h3>
                  <p>{item.answer}</p>
                  <button className="history-use-button" type="button" onClick={() => {
                    setProblem(item.problem || "");
                    setAnswer(item.answer || "");
                    setError("");
                    document.getElementById("get-started")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}>View this plan ↑</button>
                </article>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="voicestudio-section" id="voice-studio">
          <div className="section-intro">
            <span className="section-kicker">LOCAL VOICE WORKSPACE</span>
            <h2>More voice tools with <span>VoiceStudio.</span></h2>
            <p>Connect your local VoiceStudio installation to access its dedicated voice workspace while keeping Community Helper’s existing voice input and read-aloud features.</p>
          </div>
          <div className="voicestudio-status-card">
            <div className={`voicestudio-status-dot ${voiceStudioStatus.connected ? "is-connected" : ""}`} aria-hidden="true" />
            <div className="voicestudio-status-copy">
              <strong>{voiceStudioStatus.checking ? "Checking VoiceStudio…" : voiceStudioStatus.connected ? `VoiceStudio connected${voiceStudioStatus.version ? ` · v${voiceStudioStatus.version}` : ""}` : "VoiceStudio not detected"}</strong>
              <p>{voiceStudioStatus.checking ? "Checking the local service on this device." : voiceStudioStatus.connected ? "The local API is responding. Open VoiceStudio to use the features supported by your installed models." : "Start VoiceStudio on this same computer, then refresh this status. This local connection is not available to a remote deployment automatically."}</p>
            </div>
            <button className="button button-submit voicestudio-open" type="button" onClick={() => window.open("http://127.0.0.1:3900/", "_blank", "noopener,noreferrer")}>Open VoiceStudio ↗</button>
          </div>
          <div className="voicestudio-feature-grid">
            <article className="voicestudio-feature-card"><span>01</span><h3>Voice generation & cloning</h3><p>Generate narration or use an authorized reference voice when a compatible model is installed and licensed.</p></article>
            <article className="voicestudio-feature-card"><span>02</span><h3>Video dubbing</h3><p>Use VoiceStudio’s dubbing workspace for transcription, translation, timed speech generation and export where supported.</p></article>
            <article className="voicestudio-feature-card"><span>03</span><h3>Dictation & transcription</h3><p>Use available local speech-recognition models for spoken input and audio transcription.</p></article>
            <article className="voicestudio-feature-card"><span>04</span><h3>Voice design & audio tools</h3><p>Explore voice design, batch narration and audio processing according to the installed engine and model capabilities.</p></article>
          </div>
          <p className="voicestudio-disclaimer">VoiceStudio runs as a separate local service in this first integration step. Models are not downloaded automatically, and feature availability depends on installed models and their licenses.</p>
        </section>

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
