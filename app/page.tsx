"use client";

import { FormEvent, useMemo, useState, useEffect } from "react";

interface ParsedQuestion {
  question: string;
  rubric: string;
}

// Antigravity-inspired Interview Question Generator using modern CSS with advanced animations
export default function Home() {
  // The job title input from the user, default to Customer Success Manager example
  const [jobTitle, setJobTitle] = useState("Customer Success Manager");
  
  // Advanced configuration options
  const [experienceLevel, setExperienceLevel] = useState("Mid Level");
  const [questionFocus, setQuestionFocus] = useState("Mixed");
  const [questionCount, setQuestionCount] = useState(3);
  
  // Raw AI response text from the backend
  const [questions, setQuestions] = useState<string | null>(null);
  
  // Loading state while API responds
  const [loading, setLoading] = useState(false);
  
  // Error message display
  const [error, setError] = useState<string | null>(null);
  
  // Expanded state for rubrics - tracks index of open question card
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({});
  
  // Copy clipboard/export feedback toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize interactive particle effect on mount
  useEffect(() => {
    const welcomeElement = document.querySelector("#welcome");
    if (!welcomeElement) return;

    // Create canvas for particle effect
    const canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "1";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let isHovering = false;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Particle class for ring effect
    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      size: number;

      constructor(x: number, y: number, angle: number) {
        this.x = x;
        this.y = y;
        const speed = 2 + Math.random() * 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1;
        this.size = 2 + Math.random() * 2;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.02;
        this.vx *= 0.98;
        this.vy *= 0.98;
      }

      draw() {
        ctx!.fillStyle = `rgba(100, 150, 255, ${this.life * 0.5})`;
        ctx!.fillRect(this.x, this.y, this.size, this.size);
      }
    }

    let particles: Particle[] = [];

    const handlePointerMove = (e: PointerEvent) => {
      if (e.clientY > window.innerHeight * 0.5) return; // Only in welcome section
      mouseX = e.clientX;
      mouseY = e.clientY;
      isHovering = true;

      // Create particles on mouse move
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        particles.push(new Particle(mouseX, mouseY, angle));
      }
    };

    const handlePointerLeave = () => {
      isHovering = false;
    };

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background gradient that responds to mouse
      const gradient = ctx.createRadialGradient(
        mouseX,
        mouseY,
        100,
        mouseX,
        mouseY,
        400
      );
      gradient.addColorStop(0, "rgba(200, 220, 255, 0.1)");
      gradient.addColorStop(0.5, "rgba(150, 180, 255, 0.05)");
      gradient.addColorStop(1, "rgba(100, 150, 255, 0)");

      if (isHovering) {
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Update and draw particles
      particles = particles.filter((p) => p.life > 0);
      particles.forEach((p) => {
        p.update();
        p.draw();
      });

      requestAnimationFrame(animate);
    };
    animate();

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("resize", resizeCanvas);
      document.body.removeChild(canvas);
    };
  }, []);

  // Parse raw question text into structured list
  const parsedQuestions = useMemo<ParsedQuestion[]>(() => {
    if (!questions) return [];

    const blocks = questions.split(/---\n?|---/g);
    const parsed: ParsedQuestion[] = [];

    for (const block of blocks) {
      if (!block.trim()) continue;

      let questionText = "";
      let rubricText = "";

      // Match Question: ...
      const questionMatch = block.match(/Question:\s*([\s\S]*?)(?=Rubric:|$)/i);
      if (questionMatch) {
        questionText = questionMatch[1].trim();
      }

      // Match Rubric: ...
      const rubricMatch = block.match(/Rubric:\s*([\s\S]*?)$/i);
      if (rubricMatch) {
        rubricText = rubricMatch[1].trim();
      }

      // Fallback: if we failed to match structured tags, but we have text
      if (!questionText && block.trim()) {
        questionText = block.trim().replace(/^Question:\s*/i, "");
      }

      if (questionText) {
        parsed.push({
          question: questionText,
          rubric: rubricText || "No grading guidelines provided."
        });
      }
    }

    return parsed;
  }, [questions]);

  // Submit form to run backend API generation
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuestions(null);
    setError(null);
    setLoading(true);
    setExpandedIndices({}); // Reset accordion state

    // Show instant generation toast to alert the user
    showToast(`✨ Generating ${questionCount} tailored questions & evaluation guides...`);

    try {
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle,
          experienceLevel,
          questionFocus,
          questionCount
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        // Provide more helpful error messages based on HTTP status
        let errorMessage = data?.error || "Failed to generate questions.";
        
        if (response.status === 503 || response.status === 504) {
          errorMessage = `${errorMessage} The service should recover shortly—try again in a moment.`;
        } else if (response.status === 429) {
          errorMessage = `${errorMessage} You're being rate-limited. Please wait before retrying.`;
        } else if (response.status === 400) {
          errorMessage = `${errorMessage} Please check your input parameters.`;
        }
        
        throw new Error(errorMessage);
      }

      setQuestions(data.questions);
      showToast("✅ Questions generated successfully!");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(errorMsg);
      showToast(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  }

  // Toast feedback helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Helper to copy text to clipboard
  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    showToast(`Question ${index + 1} copied to clipboard!`);
  };

  // Helper to export all questions as markdown file
  const exportAsMarkdown = () => {
    if (parsedQuestions.length === 0) return;

    let content = `# Generated Interview Questions: ${jobTitle} (${experienceLevel})\n`;
    content += `*Focus Area: ${questionFocus} | Generated by InterviewAI*\n\n`;
    content += `---\n\n`;

    parsedQuestions.forEach((q, idx) => {
      content += `### Question ${idx + 1}\n`;
      content += `> ${q.question}\n\n`;
      content += `#### Recommended Answer Rubric & Guidelines:\n`;
      content += `${q.rubric}\n\n`;
      content += `---\n\n`;
    });

    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${jobTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-questions.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("Questions successfully exported as Markdown!");
  };

  // Helper to toggle expand/collapse accordion
  const toggleExpanded = (index: number) => {
    setExpandedIndices(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero/Welcome Section */}
      <section id="welcome">
        <div className="container">
          <div className="hero-badge">
            <span className="sparkle">✨</span> Powered by Advanced Generative AI
          </div>
          <h1>
            Precision <span className="gradient-text">Interview Engineering</span>
          </h1>

          <p className="subtitle">
            Instantly architect deep, role-specific candidate assessments and grading rubrics.
            Tailor your criteria and generate perfect questions in seconds.
          </p>

          {/* Form Container */}
          <form onSubmit={handleSubmit} className="form-container">
            <div className="form-group">
              <label htmlFor="jobTitle">Job Title</label>
              <input
                id="jobTitle"
                type="text"
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
                placeholder="e.g. Software Engineer, Customer Success, Product Manager"
                disabled={loading}
                required
              />
            </div>

            <div className="form-row-grid">
              <div className="form-group">
                <label>Experience Level</label>
                <div className="selection-cards-grid">
                  {[
                    { id: "Entry Level", title: "Entry Level", desc: "Internships & Junior roles" },
                    { id: "Mid Level", title: "Mid Level", desc: "2-5 years experience" },
                    { id: "Senior", title: "Senior Level", desc: "5+ years & Tech Leads" },
                    { id: "Lead / Manager", title: "Lead / Manager", desc: "Managers, VPs, & Directors" }
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      className={`select-card-btn ${experienceLevel === lvl.id ? "active" : ""}`}
                      onClick={() => setExperienceLevel(lvl.id)}
                      disabled={loading}
                    >
                      <div className="select-card-indicator"></div>
                      <div className="select-card-content">
                        <span className="select-card-title">{lvl.title}</span>
                        <span className="select-card-desc">{lvl.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Question Focus</label>
                <div className="selection-cards-grid">
                  {[
                    { id: "Technical", title: "Technical Focus", desc: "Coding, systems, & hard skills" },
                    { id: "Behavioral", title: "Behavioral Focus", desc: "Soft skills & STAR method" },
                    { id: "Situational", title: "Situational Focus", desc: "Real-world scenario judgment" },
                    { id: "Mixed", title: "Mixed Standard", desc: "A balanced comprehensive mix" }
                  ].map((fcs) => (
                    <button
                      key={fcs.id}
                      type="button"
                      className={`select-card-btn ${questionFocus === fcs.id ? "active" : ""}`}
                      onClick={() => setQuestionFocus(fcs.id)}
                      disabled={loading}
                    >
                      <div className="select-card-indicator"></div>
                      <div className="select-card-content">
                        <span className="select-card-title">{fcs.title}</span>
                        <span className="select-card-desc">{fcs.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group slider-group">
              <div className="slider-label-row">
                <label htmlFor="questionCount">Number of Questions</label>
                <span className="slider-val">{questionCount}</span>
              </div>
              <input
                id="questionCount"
                type="range"
                min="3"
                max="10"
                value={questionCount}
                onChange={(event) => setQuestionCount(Number(event.target.value))}
                disabled={loading}
                className="range-slider"
              />
            </div>

            <button type="submit" className="primary-generate-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-icon"></span>
                  Generating...
                </>
              ) : (
                "Generate Tailored Interview Questions"
              )}
            </button>
          </form>

          {/* Results Section */}
          {error && (
            <div className="results">
              <div className="error">{error}</div>
            </div>
          )}

          {!loading && !questions && !error && (
            <div className="results">
              <div className="placeholder">
                Enter your hiring criteria above to generate tailored questions with answer guidelines
              </div>
            </div>
          )}

          {loading && (
            <div className="results">
              <div className="skeleton-loading-container">
                <div className="skeleton-loading-header">
                  <div className="skeleton-title-pulse"></div>
                  <div className="skeleton-btn-pulse"></div>
                </div>
                <div className="skeleton-cards-stack">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="skeleton-card">
                      <div className="skeleton-card-header">
                        <div className="skeleton-badge-pulse"></div>
                        <div className="skeleton-icon-pulse"></div>
                      </div>
                      <div className="skeleton-card-body">
                        <div className="skeleton-line-pulse long"></div>
                        <div className="skeleton-line-pulse short"></div>
                      </div>
                      <div className="skeleton-card-footer">
                        <div className="skeleton-btn-pulse-small"></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="loading-toast-indicator">
                  <span className="sparkle-spin">✨</span> Architecting {questionCount} customized interview questions...
                </div>
              </div>
            </div>
          )}

          {questions && !loading && (
            <div className="results">
              <div className="results-header-actions">
                <h2>Generated Questions ({parsedQuestions.length})</h2>
                <button type="button" onClick={exportAsMarkdown} className="secondary export-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Export Markdown
                </button>
              </div>

              <div className="question-list">
                {parsedQuestions.length > 0 ? (
                  parsedQuestions.map((item, index) => {
                    const isExpanded = !!expandedIndices[index];
                    return (
                      <div key={index} className={`question-card-item ${isExpanded ? "expanded" : ""}`}>
                        <div className="question-card-header">
                          <div className="question-number-badge">{index + 1}</div>
                          <div className="question-actions">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(item.question, index)}
                              className="action-icon-btn"
                              title="Copy Question"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            </button>
                          </div>
                        </div>
                        <div className="question-card-body">
                          <p className="question-card-text">{item.question}</p>
                        </div>
                        <div className="question-card-footer">
                          <button
                            type="button"
                            className="rubric-toggle-btn"
                            onClick={() => toggleExpanded(index)}
                          >
                            <span>{isExpanded ? "Hide Evaluation Guide" : "Show Interviewer Rubric"}</span>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className={`chevron-icon ${isExpanded ? "rotated" : ""}`}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>

                          {isExpanded && (
                            <div className="rubric-expanded-content">
                              <div className="rubric-title">IDEAL ANSWER & EVALUATION CRITERIA</div>
                              <p className="rubric-text">{item.rubric}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="question-card-item">
                    <p className="question-card-text">{questions}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

    </>
  );
}
