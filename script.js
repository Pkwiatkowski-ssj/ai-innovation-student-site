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
})();

