(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  // Footer year
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Header elevation on scroll
  const header = $("[data-elevate-on-scroll]");
  const setHeaderElevation = () => {
    if (!header) return;
    header.classList.toggle("is-elevated", window.scrollY > 6);
  };
  setHeaderElevation();
  window.addEventListener("scroll", setHeaderElevation, { passive: true });

  // Mobile nav
  const nav = $(".nav");
  const toggle = $(".nav-toggle");
  const navLinks = $("#primary-nav");

  const setNavOpen = (open) => {
    if (!nav || !toggle || !navLinks) return;
    nav.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  };

  if (toggle && nav && navLinks) {
    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.contains("nav-open");
      setNavOpen(!isOpen);
    });

    // Close when a link is clicked
    $$("#primary-nav a").forEach((a) => {
      a.addEventListener("click", () => setNavOpen(false));
    });

    // Close on escape
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setNavOpen(false);
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (!nav.classList.contains("nav-open")) return;
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (nav.contains(target)) return;
      setNavOpen(false);
    });
  }

  // Reveal animations on scroll (IntersectionObserver)
  const revealEls = $$(".reveal");

  if (!prefersReducedMotion && "IntersectionObserver" in window && revealEls.length) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      },
      { root: null, threshold: 0.12 }
    );

    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  // Hero particles (subtle background motion)
  const canvas = $("#hero-particles");
  if (!prefersReducedMotion && canvas instanceof HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (ctx) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let w = 0;
      let h = 0;
      let particles = [];
      let rafId = 0;

      const rand = (min, max) => min + Math.random() * (max - min);

      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        w = Math.max(1, Math.floor(rect.width));
        h = Math.max(1, Math.floor(rect.height));
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const count = Math.round((w * h) / 16000);
        const target = Math.max(18, Math.min(70, count));
        particles = Array.from({ length: target }, () => ({
          x: rand(0, w),
          y: rand(0, h),
          r: rand(0.9, 2.4),
          vx: rand(-0.18, 0.18),
          vy: rand(-0.10, 0.22),
          a: rand(0.12, 0.32),
          hue: Math.random() < 0.68 ? "blue" : "gold",
        }));
      };

      const draw = () => {
        ctx.clearRect(0, 0, w, h);

        // soft vignettes to feel "AI glow"
        const grad1 = ctx.createRadialGradient(w * 0.25, h * 0.30, 0, w * 0.25, h * 0.30, Math.max(w, h) * 0.7);
        grad1.addColorStop(0, "rgba(43, 188, 255, 0.10)");
        grad1.addColorStop(1, "rgba(43, 188, 255, 0)");
        ctx.fillStyle = grad1;
        ctx.fillRect(0, 0, w, h);

        const grad2 = ctx.createRadialGradient(w * 0.72, h * 0.22, 0, w * 0.72, h * 0.22, Math.max(w, h) * 0.6);
        grad2.addColorStop(0, "rgba(255, 184, 28, 0.10)");
        grad2.addColorStop(1, "rgba(255, 184, 28, 0)");
        ctx.fillStyle = grad2;
        ctx.fillRect(0, 0, w, h);

        // connections
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          for (let j = i + 1; j < particles.length; j++) {
            const q = particles[j];
            const dx = p.x - q.x;
            const dy = p.y - q.y;
            const dist = Math.hypot(dx, dy);
            const maxDist = 140;
            if (dist > maxDist) continue;
            const alpha = (1 - dist / maxDist) * 0.12;
            ctx.strokeStyle = `rgba(43, 188, 255, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }

        // particles
        for (const p of particles) {
          const isGold = p.hue === "gold";
          ctx.fillStyle = isGold ? `rgba(255, 184, 28, ${p.a})` : `rgba(43, 188, 255, ${p.a})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      };

      const step = () => {
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -10) p.x = w + 10;
          if (p.x > w + 10) p.x = -10;
          if (p.y < -10) p.y = h + 10;
          if (p.y > h + 10) p.y = -10;
        }
        draw();
        rafId = window.requestAnimationFrame(step);
      };

      const onVis = () => {
        if (document.hidden) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        } else if (!rafId) {
          rafId = window.requestAnimationFrame(step);
        }
      };

      const ro = new ResizeObserver(() => resize());
      ro.observe(canvas);
      resize();
      rafId = window.requestAnimationFrame(step);

      document.addEventListener("visibilitychange", onVis);
      window.addEventListener("pagehide", () => {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
        ro.disconnect();
      });
    }
  }

  // Matrix digital rain (header → hero)
  const matrixRoot = $(".matrix-rain");
  if (!prefersReducedMotion && matrixRoot) {
    const glyphs = "01QUAI<>/{}[]()=+*-_#:$";
    const words = ["RAG", "EVAL", "VECTOR", "ROBOTICS", "PIPELINE", "INFER", "DEPLOY", "ETHICS", "QU"];

    const rand = (min, max) => min + Math.random() * (max - min);
    const pickGlyph = () => glyphs[Math.floor(Math.random() * glyphs.length)];
    const pickWord = () => words[Math.floor(Math.random() * words.length)];

    const buildColumn = (len) => {
      const out = [];
      for (let i = 0; i < len; i++) {
        if (Math.random() < 0.08) out.push(pickWord());
        else out.push(pickGlyph());
      }
      return out.join("\n");
    };

    const render = () => {
      const width = window.innerWidth || 1200;
      const colW = 44;
      const cols = Math.max(10, Math.min(36, Math.floor(width / colW)));
      matrixRoot.innerHTML = "";

      for (let i = 0; i < cols; i++) {
        const el = document.createElement("span");
        const isGold = Math.random() < 0.16;
        el.className = `matrix-stream${isGold ? " gold" : ""}`;

        const len = Math.floor(rand(18, 42));
        el.textContent = buildColumn(len);

        el.style.left = `${Math.round((i / cols) * 100)}%`;
        el.style.animationDuration = `${rand(7.5, 14.5).toFixed(2)}s`;
        el.style.animationDelay = `${rand(-14, 0).toFixed(2)}s`;
        el.style.opacity = String(rand(0.22, 0.65));
        el.style.filter = `blur(${rand(0, 0.35).toFixed(2)}px)`;

        matrixRoot.appendChild(el);
      }
    };

    render();
    window.addEventListener("resize", () => render(), { passive: true });
  }

  // Hero tilt (interactive parallax)
  const tiltEls = $$("[data-tilt]");
  if (!prefersReducedMotion && tiltEls.length) {
    tiltEls.forEach((el) => {
      const strengthAttr = el.getAttribute("data-tilt-strength");
      const strength = strengthAttr ? Number(strengthAttr) : 10;
      if (!Number.isFinite(strength)) return;

      let raf = 0;
      let targetX = 0;
      let targetY = 0;

      const apply = () => {
        raf = 0;
        const rx = targetY * (strength / 12);
        const ry = targetX * (strength / 12);
        el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
      };

      const onMove = (e) => {
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        targetX = (px - 0.5) * 2; // -1..1
        targetY = (py - 0.5) * -2; // invert
        if (!raf) raf = window.requestAnimationFrame(apply);
      };

      const onLeave = () => {
        el.style.transform = "";
      };


      el.addEventListener("mousemove", onMove);
      el.addEventListener("mouseleave", onLeave);
      el.addEventListener("blur", onLeave);
    });
  }


  // ============================================================
  // Choose Your Path — click to expand / collapse
  // ============================================================
  const pathCards = $$(".path-card");
  pathCards.forEach((card) => {
    card.addEventListener("click", (e) => {
      // Allow clicks on links inside the detail panel to propagate
      if (e.target.closest("a")) return;

      const isActive = card.classList.contains("path-active");

      // Reset all cards
      pathCards.forEach((c) => {
        c.classList.remove("path-active", "path-dimmed");
        const detail = c.querySelector(".path-detail");
        if (detail) detail.setAttribute("aria-hidden", "true");
      });

      if (!isActive) {
        card.classList.add("path-active");
        const detail = card.querySelector(".path-detail");
        if (detail) detail.setAttribute("aria-hidden", "false");
        // Dim the others
        pathCards.forEach((c) => {
          if (c !== card) c.classList.add("path-dimmed");
        });
      }
    });
  });

  // ============================================================
  // AI Prompt Generator — typewriter + copy to clipboard
  // ============================================================
  const PROMPTS = [
    {
      text: "Build a mini-RAG pipeline: ingest 3–5 PDFs, chunk them, embed with a free model, and answer questions with source citations. Measure how often answers reference the right document.",
      tags: "RAG · Intermediate",
      why: "RAG is one of the most in-demand patterns in production AI. Knowing how to build one gives you a real edge in interviews and internship projects."
    },
    {
      text: "Design a prompt that forces an LLM to admit uncertainty. Test it on 10 questions — 5 the model should know, 5 it shouldn't. What patterns do you notice in the failures?",
      tags: "Prompt Engineering · Beginner",
      why: "Understanding model uncertainty is critical for building safe, trustworthy AI. This is a core skill for any practitioner."
    },
    {
      text: "Take a public dataset from data.gov or Kaggle and build a 3-chart data story that makes one clear argument. No ML required — just good visualization and a narrative.",
      tags: "Data Visualization · Beginner",
      why: "Communicating data clearly is as valuable as analyzing it. This sharpens both your technical and storytelling skills."
    },
    {
      text: "Train a simple image classifier to distinguish between two campus locations using 20 photos from your phone. Document where it fails and hypothesize why.",
      tags: "Computer Vision · Intermediate",
      why: "Building intuition for model failures is more valuable than building a perfect model. Real-world AI always starts with messy data."
    },
    {
      text: "Build a chatbot that answers questions about a single 10-page document. Then try to jailbreak it — what guardrails do you need to add?",
      tags: "LLMs · Intermediate",
      why: "Adversarial testing is a real engineering discipline. Understanding attack surfaces makes you a more thoughtful builder."
    },
    {
      text: "Write a two-paragraph algorithmic bias audit of any AI tool you use daily. What data was it trained on? Who might it systematically disadvantage?",
      tags: "AI Ethics · Beginner",
      why: "Bias audits are increasingly required in both industry and policy contexts. Structured ethical analysis is a genuine career skill."
    },
    {
      text: "Create an AI-powered study schedule generator: take a course syllabus as input and output a week-by-week prep plan. Then evaluate it against your own judgment.",
      tags: "Productivity AI · Beginner",
      why: "Building tools for your own life forces you to define success criteria and iterate on real feedback — the core product loop."
    },
    {
      text: "Implement a cosine similarity recommendation engine on a small text corpus like course descriptions or book summaries. Compare its suggestions to your own intuition.",
      tags: "Embeddings · Intermediate",
      why: "Embeddings power search, recommendation, and RAG systems. Getting hands-on with them demystifies how modern AI reasons about meaning."
    },
    {
      text: "Build an evaluation harness for a prompt: define 5 test cases with expected outputs, run them, score the results, then improve the prompt until it passes 4 out of 5.",
      tags: "Evals · Advanced",
      why: "A systematic eval loop is what separates prototype-level from production-level AI engineering. Most beginners skip this entirely."
    },
    {
      text: "Pick one AI safety concern — hallucination, bias, misuse, or job displacement — and write a 1-page policy memo as if advising a university. Back every claim with a real example.",
      tags: "AI Policy · Beginner",
      why: "Engineers who can translate technical risk into policy language are rare and valuable. This prompt builds that exact skill."
    },
    {
      text: "Use a free speech-to-text API to transcribe a 5-minute lecture clip. Build a summarizer on top. Measure quality by hand and document what the model gets wrong.",
      tags: "Multimodal · Intermediate",
      why: "Audio + language pipelines are exploding in accessibility tech and education tools. End-to-end pipeline experience is a practical superpower."
    },
    {
      text: "Design a rubric for evaluating whether an AI-generated essay meets college assignment standards. Define your criteria, then try to automate the scoring.",
      tags: "AI in Education · Beginner",
      why: "Defining quality for AI outputs is harder than it sounds. Building rubrics sharpens both product thinking and understanding of model limitations."
    }
  ];

  // Set the weekly prompt automatically based on week number
  const weekIndex = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)) % PROMPTS.length;
  let currentPromptIndex = weekIndex;

  const promptDisplay = $("#prompt-display");
  const promptTags    = $("#prompt-tags");
  const promptWhy     = $("#prompt-why");
  const generateBtn   = $("#generate-prompt");
  const copyBtn       = $("#copy-prompt");

  const setPrompt = (idx, animate) => {
    const p = PROMPTS[idx];
    if (promptTags) promptTags.textContent = p.tags;
    if (promptWhy)  promptWhy.textContent  = p.why;
    if (!promptDisplay) return;

    if (!animate || prefersReducedMotion) {
      promptDisplay.textContent = p.text;
      return;
    }

    // Typewriter animation
    promptDisplay.classList.add("typing");
    promptDisplay.textContent = "";
    let i = 0;
    const speed = 14; // ms per character
    const cursor = "▌";

    const tick = () => {
      if (i <= p.text.length) {
        promptDisplay.textContent = p.text.slice(0, i) + (i < p.text.length ? cursor : "");
        i++;
        setTimeout(tick, speed);
      } else {
        promptDisplay.classList.remove("typing");
      }
    };
    tick();
  };

  // Init with this week's prompt (no animation on load)
  setPrompt(currentPromptIndex, false);

  if (generateBtn) {
    generateBtn.addEventListener("click", () => {
      let nextIdx;
      do {
        nextIdx = Math.floor(Math.random() * PROMPTS.length);
      } while (nextIdx === currentPromptIndex && PROMPTS.length > 1);
      currentPromptIndex = nextIdx;
      setPrompt(currentPromptIndex, true);
    });
  }

  if (copyBtn && promptDisplay) {
    copyBtn.addEventListener("click", () => {
      const text = promptDisplay.textContent.replace("▌", "").trim();
      if (!navigator.clipboard) {
        // Fallback for older browsers
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      } else {
        navigator.clipboard.writeText(text).catch(() => {});
      }
      copyBtn.textContent = "Copied ✓";
      copyBtn.classList.add("btn-copied");
      setTimeout(() => {
        copyBtn.textContent = "Copy prompt";
        copyBtn.classList.remove("btn-copied");
      }, 2000);
    });
  }

  // ============================================================
  // Event card expand / collapse
  // ============================================================
  $$(".card-expand-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const card  = btn.closest(".card");
      const panel = card && card.querySelector(".card-expand-panel");
      if (!panel) return;

      const isOpen = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!isOpen));
      panel.hidden = isOpen;
    });
  });

  // ============================================================
  // Button click feedback (localized micro-bounce, no shake)
  // ============================================================
  $$(".btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (prefersReducedMotion) return;
      btn.classList.remove("btn-active-flash");
      void btn.offsetWidth;
      btn.classList.add("btn-active-flash");
      setTimeout(() => btn.classList.remove("btn-active-flash"), 200);
    });
  });

  // ============================================================
  // Stat counter animation (counts up on scroll into view)
  // ============================================================
  if (!prefersReducedMotion && "IntersectionObserver" in window) {
    const statEls = $$(".stat dt");

    const animateCount = (el) => {
      const raw = el.textContent.trim();
      const match = raw.match(/^(\d+)(\+?)$/);
      if (!match) return;
      const target = parseInt(match[1], 10);
      const suffix = match[2];
      const duration = 900;
      const startTime = performance.now();
      const easeOut = (t) => 1 - Math.pow(1 - t, 3);

      const tick = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = Math.round(easeOut(progress) * target);
        el.textContent = String(current) + suffix;
        if (progress < 1) window.requestAnimationFrame(tick);
      };

      window.requestAnimationFrame(tick);
    };

    const statIo = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          animateCount(entry.target);
          statIo.unobserve(entry.target);
        }
      },
      { threshold: 0.6 }
    );

    statEls.forEach((el) => statIo.observe(el));
  }

  // ============================================================
  // Auto-stagger reveal delays for grid cards
  // ============================================================
  const staggerSelectors = [
    ".card-grid",
    ".demo-grid",
    ".feature-grid",
    ".spotlight-grid",
    ".fp-grid",
  ];

  staggerSelectors.forEach((gridSel) => {
    const grid = $(gridSel);
    if (!grid) return;
    $$(".reveal", grid).forEach((card, i) => {
      if (!card.style.getPropertyValue("--reveal-delay")) {
        card.style.setProperty("--reveal-delay", `${i * 90}ms`);
      }
    });
  });

})();