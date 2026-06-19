import { useState, useEffect, useRef } from "react";

// ─── Voidmark — Custom BBCode-like markup parser ─────────────────────────────
// Supports: [h], [b], [em], [u], [del], [quote], [code], [hr], [hr-theme],
//           [br], [theme], [color=HEX], [highlight], [spoiler], [list][item],
//           [left], [center], [right], [typewriter]text[/typewriter]
// Unlimited nesting is fully supported — tags can be freely mixed inside each other.
// Example: [typewriter][highlight]Hello[/highlight][/typewriter] works perfectly.

function stripTags(text: string): string {
  return text.replace(/\[[^\]]*\]/g, "");
}

function TypewriterSpan({
  rawText,
  innerNodes,
  speed = 60,
}: {
  rawText: string;
  innerNodes: React.ReactNode;
  speed?: number;
}) {
  const plainText = stripTags(rawText);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"typing" | "wait" | "erasing">("typing");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const clear = () => { if (timerRef.current) clearTimeout(timerRef.current); };

  useEffect(() => {
    clear();
    setIdx(0);
    setPhase("typing");
  }, [plainText]);

  // Typing phase: increment idx one char at a time, then switch to wait
  useEffect(() => {
    if (phase !== "typing") return;
    clear();
    if (idx < plainText.length) {
      timerRef.current = setTimeout(() => setIdx(i => i + 1), speed);
    } else {
      setPhase("wait");
    }
    return clear;
  }, [phase, idx, plainText, speed]);

  // Wait phase: hold fully-typed text for 3 seconds, then erase
  useEffect(() => {
    if (phase !== "wait") return;
    clear();
    timerRef.current = setTimeout(() => setPhase("erasing"), 3000);
    return clear;
  }, [phase]);

  // Erasing phase: decrement idx one char at a time, then start typing again
  useEffect(() => {
    if (phase !== "erasing") return;
    clear();
    if (idx > 0) {
      timerRef.current = setTimeout(() => setIdx(i => i - 1), speed / 2);
    } else {
      timerRef.current = setTimeout(() => setPhase("typing"), 500);
    }
    return clear;
  }, [phase, idx]);

  // When fully typed (wait phase), show the full rich innerNodes
  if (phase === "wait") {
    return (
      <span>
        {innerNodes}
        <span className="animate-pulse">|</span>
      </span>
    );
  }

  // During typing/erasing, show plain text character by character
  return (
    <span>
      {plainText.slice(0, idx)}
      <span className="animate-pulse">|</span>
    </span>
  );
}

function SpoilerSpan({ children }: { children: React.ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      onClick={() => setRevealed(r => !r)}
      className={`cursor-pointer rounded px-1 transition-all select-none ${revealed ? "bg-transparent" : "bg-current text-current opacity-100"}`}
      style={revealed ? {} : { filter: "blur(4px)", backgroundColor: "currentColor" }}
      title="Click to reveal"
    >
      {children}
    </span>
  );
}

function parseNodes(text: string, themeColor: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  const push = (node: React.ReactNode) => nodes.push(<span key={key++}>{node}</span>);

  while (remaining.length > 0) {
    const tagMatch = remaining.match(/^\[([a-z\-]+(?:=[^\]]+)?)\]/i);
    if (tagMatch) {
      const fullTag = tagMatch[0];
      const tagInner = tagMatch[1];
      const tagName = tagInner.split("=")[0].toLowerCase();
      const tagArg = tagInner.includes("=") ? tagInner.split("=").slice(1).join("=") : null;

      if (tagName === "hr") {
        nodes.push(<hr key={key++} className="my-3 border-white/10" />);
        remaining = remaining.slice(fullTag.length);
        continue;
      }
      if (tagName === "hr-theme") {
        nodes.push(<hr key={key++} className="my-3" style={{ borderColor: themeColor + "55" }} />);
        remaining = remaining.slice(fullTag.length);
        continue;
      }
      if (tagName === "br") {
        nodes.push(<br key={key++} />);
        remaining = remaining.slice(fullTag.length);
        continue;
      }

      const closingTag = `[/${tagName}]`;
      const closingIdx = remaining.toLowerCase().indexOf(closingTag.toLowerCase(), fullTag.length);

      if (closingIdx !== -1) {
        const innerText = remaining.slice(fullTag.length, closingIdx);
        const innerNodes = parseNodes(innerText, themeColor);

        switch (tagName) {
          case "h":
            nodes.push(<strong key={key++} className="text-lg font-black block leading-tight">{innerNodes}</strong>);
            break;
          case "b":
            nodes.push(<strong key={key++} className="font-black">{innerNodes}</strong>);
            break;
          case "em":
            nodes.push(<em key={key++}>{innerNodes}</em>);
            break;
          case "u":
            nodes.push(<u key={key++}>{innerNodes}</u>);
            break;
          case "del":
            nodes.push(<del key={key++}>{innerNodes}</del>);
            break;
          case "quote":
            nodes.push(
              <blockquote key={key++} className="border-l-2 pl-3 my-1 italic opacity-70" style={{ borderColor: themeColor }}>
                {innerNodes}
              </blockquote>
            );
            break;
          case "code":
            nodes.push(
              <code key={key++} className="bg-black/40 border border-white/10 px-1.5 py-0.5 rounded text-[0.85em] font-mono">
                {innerText}
              </code>
            );
            break;
          case "theme":
            nodes.push(<span key={key++} style={{ color: themeColor }}>{innerNodes}</span>);
            break;
          case "color":
            nodes.push(<span key={key++} style={{ color: tagArg ? `#${tagArg}` : "inherit" }}>{innerNodes}</span>);
            break;
          case "highlight":
            nodes.push(
              <mark key={key++} className="px-1 rounded" style={{ backgroundColor: themeColor + "55", color: "inherit" }}>
                {innerNodes}
              </mark>
            );
            break;
          case "spoiler":
            nodes.push(<SpoilerSpan key={key++}>{innerNodes}</SpoilerSpan>);
            break;
          case "left":
            nodes.push(<div key={key++} className="text-left">{innerNodes}</div>);
            break;
          case "center":
            nodes.push(<div key={key++} className="text-center">{innerNodes}</div>);
            break;
          case "right":
            nodes.push(<div key={key++} className="text-right">{innerNodes}</div>);
            break;
          case "list": {
            const items = innerText.split(/\[item\](.*?)\[\/item\]/is).filter((_, i) => i % 2 === 1);
            nodes.push(
              <ul key={key++} className="list-disc list-inside space-y-0.5 my-1">
                {items.map((item, i) => <li key={i}>{parseNodes(item, themeColor)}</li>)}
              </ul>
            );
            break;
          }
          case "typewriter":
            // Fully supports nested tags: types plain text, then displays rich content
            nodes.push(
              <TypewriterSpan key={key++} rawText={innerText} innerNodes={innerNodes} speed={60} />
            );
            break;
          case "dc-emoji-id":
            nodes.push(
              <img key={key++} src={`https://cdn.discordapp.com/emojis/${innerText}.webp?size=32`} alt="emoji" className="inline w-5 h-5 object-contain align-middle" />
            );
            break;
          case "glow":
            nodes.push(
              <span key={key++} style={{ textShadow: `0 0 8px ${themeColor}, 0 0 16px ${themeColor}88`, color: themeColor }}>
                {innerNodes}
              </span>
            );
            break;
          case "small":
            nodes.push(<span key={key++} className="text-[0.8em] opacity-70">{innerNodes}</span>);
            break;
          case "big":
            nodes.push(<span key={key++} className="text-[1.3em] font-bold">{innerNodes}</span>);
            break;
          case "rainbow":
            nodes.push(<span key={key++} style={{ animation: "rainbow-cycle 3s linear infinite" }}>{innerNodes}</span>);
            break;
          case "shake":
            nodes.push(
              <span key={key++} style={{ display: "inline-block", animation: "shake 0.5s ease-in-out infinite" }}>
                {innerNodes}
              </span>
            );
            break;
          default:
            nodes.push(<span key={key++}>{fullTag}{innerNodes}{closingTag}</span>);
        }

        remaining = remaining.slice(closingIdx + closingTag.length);
        continue;
      }
    }

    const nextTag = remaining.slice(1).search(/\[/);
    const plainEnd = nextTag === -1 ? remaining.length : nextTag + 1;
    const plain = remaining.slice(0, plainEnd);

    const lines = plain.split("\n");
    lines.forEach((line, i) => {
      if (i > 0) nodes.push(<br key={key++} />);
      if (line) nodes.push(<span key={key++}>{line}</span>);
    });

    remaining = remaining.slice(plainEnd);
  }

  return nodes;
}

export function VoidMark({
  text,
  themeColor = "#F97316",
  className = "",
}: {
  text: string;
  themeColor?: string;
  className?: string;
}) {
  if (!text) return null;
  const nodes = parseNodes(text, themeColor);
  return <span className={className}>{nodes}</span>;
}
