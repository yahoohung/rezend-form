import { useEffect, useMemo, useState } from "react";
import { Highlight, themes, type Language } from "prism-react-renderer";

interface CodeVariant {
  id: string;
  label: string;
  language: Language;
  code: string;
}

interface CodeBlockProps {
  code?: string;
  language?: Language;
  variants?: CodeVariant[];
}

const baseTheme = themes.dracula;

const neonTheme = {
  ...baseTheme,
  plain: {
    ...baseTheme.plain,
    backgroundColor: "transparent",
    color: "#F8FAFC",
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SFMono-Regular', ui-monospace, monospace",
    fontSize: "14px",
    lineHeight: "1.7"
  },
  styles: baseTheme.styles.map((style) => {
    if (style.types.includes("comment")) {
      return {
        ...style,
        style: {
          ...style.style,
          color: "#6b7280"
        }
      };
    }
    if (style.types.includes("keyword")) {
      return {
        ...style,
        style: {
          ...style.style,
          color: "#34d399"
        }
      };
    }
    if (style.types.includes("string")) {
      return {
        ...style,
        style: {
          ...style.style,
          color: "#22d3ee"
        }
      };
    }
    if (style.types.includes("function")) {
      return {
        ...style,
        style: {
          ...style.style,
          color: "#fca5a5"
        }
      };
    }
    if (style.types.includes("builtin")) {
      return {
        ...style,
        style: {
          ...style.style,
          color: "#a855f7"
        }
      };
    }
    return style;
  })
};

function normalizeCode(source: string): string {
  const expanded = source.replace(/\t/g, "  ");
  const lines = expanded.replace(/^\n/, "").split("\n");
  const indents = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => line.match(/^\s*/)?.[0].length ?? 0);
  const baseline = indents.length > 0 ? Math.min(...indents) : 0;
  return lines
    .map((line) => line.slice(baseline))
    .join("\n")
    .trimEnd();
}

function formatLabel(language: Language) {
  switch (language) {
    case "tsx":
    case "typescript":
    case "ts":
      return "TypeScript";
    case "jsx":
    case "javascript":
    case "js":
      return "JavaScript";
    case "bash":
    case "shell":
      return "Shell";
    default:
      return language.toString().toUpperCase();
  }
}

export function CodeBlock({ code, language = "tsx", variants }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const variantList = useMemo<CodeVariant[]>(() => {
    if (variants && variants.length > 0) {
      return variants.map((variant, index) => ({
        ...variant,
        id: variant.id ?? `${variant.language}-${index}`,
        label: variant.label ?? formatLabel(variant.language)
      }));
    }

    return [
      {
        id: `${language}`,
        label: formatLabel(language),
        language,
        code: code ?? ""
      }
    ];
  }, [variants, language, code]);

  const [activeId, setActiveId] = useState<string>(variantList[0]?.id ?? "");

  useEffect(() => {
    if (!variantList.some((variant) => variant.id === activeId)) {
      setActiveId(variantList[0]?.id ?? "");
    }
  }, [variantList, activeId]);

  const activeVariant = useMemo(() => {
    const found = variantList.find((variant) => variant.id === activeId);
    return (
      found ??
      variantList[0] ?? {
        id: "fallback",
        label: formatLabel(language),
        language,
        code: code ?? ""
      }
    );
  }, [variantList, activeId, language, code]);

  const formatted = useMemo(() => normalizeCode(activeVariant.code), [activeVariant.code]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.warn("Copy failed", error);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[26px] border border-white/8 bg-gradient-to-br from-white/12 via-white/4 to-white/[0.02] p-[1px] shadow-glass">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),transparent_60%),radial-gradient(circle_at_bottom,_rgba(251,191,36,0.18),transparent_65%)] opacity-70" />
      <div className="relative rounded-[24px] bg-surface/80">
        <div className="flex items-center justify-between px-5 pb-2 pt-4 text-xs uppercase tracking-[0.3em] text-foreground/40">
          {variantList.length > 1 ? (
            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
              {variantList.map((variant) => {
                const isActive = variant.id === activeVariant.id;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setActiveId(variant.id)}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                      isActive
                        ? "bg-gradient-to-r from-emerald-400/60 to-sky-400/60 text-surface shadow-lg shadow-emerald-400/30"
                        : "text-foreground/60 hover:text-foreground"
                    }`}
                  >
                    {variant.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <span>{activeVariant.label}</span>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-foreground/70 transition hover:border-accent/50 hover:text-foreground"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <Highlight code={formatted} language={activeVariant.language} theme={neonTheme}>
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={`${className} custom-scrollbar m-0 max-h-[420px] overflow-x-auto overflow-y-auto px-5 pb-6 text-sm leading-relaxed`}
              style={{ ...style, background: "transparent" }}
            >
              <code className="flex flex-col gap-1">
                {tokens.map((line, i) => {
                  const lineNumber = i + 1;
                  const lineProps = getLineProps({ line, key: i });
                  return (
                    <span key={lineNumber} className="flex min-w-full">
                      <span className="mr-4 inline-block w-8 select-none text-right text-xs text-foreground/35">
                        {lineNumber}
                      </span>
                      <span
                        key={`line-${lineNumber}`}
                        className={lineProps.className}
                        style={lineProps.style}
                        data-line-number={lineNumber}
                      >
                        {line.map((token, key) => {
                          if (!token) {
                            return <span key={key} />;
                          }
                          const tokenProps = getTokenProps({ token, key });
                          const { key: _, ...rest } = tokenProps;
                          return <span key={key} {...rest} />;
                        })}
                      </span>
                    </span>
                  );
                })}
              </code>
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}
