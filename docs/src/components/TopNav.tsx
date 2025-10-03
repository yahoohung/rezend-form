import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

interface NavLinkItem {
  label: string;
  to: string;
  external?: boolean;
}

const defaultLinks: readonly NavLinkItem[] = [
  { label: "Overview", to: "/#overview" },
  { label: "Quick Start", to: "/#quickstart" },
  { label: "Teams", to: "/#teams" },
  { label: "Core Ideas", to: "/#core" },
  { label: "Advanced", to: "/#advanced" },
  { label: "Examples", to: "/examples" },
  { label: "Performance", to: "/performance" }
];

interface TopNavProps {
  links?: readonly NavLinkItem[];
}

export function TopNav({ links = defaultLinks }: TopNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 32);
    handler();
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const activeKey = useMemo(() => `${location.pathname}${location.hash ?? ""}`, [location.pathname, location.hash]);

  const renderLink = (link: NavLinkItem) => {
    const isExternal = link.external || /^https?:/i.test(link.to);
    if (isExternal) {
      return (
        <a
          key={link.to}
          href={link.to}
          className="text-foreground/70 transition-colors hover:text-foreground"
        >
          {link.label}
        </a>
      );
    }

    const normalised = link.to.startsWith("/") ? link.to : `/${link.to}`;
    let isActive = false;
    if (normalised.startsWith("/#")) {
      isActive = activeKey === normalised;
    } else if (normalised === "/") {
      isActive = location.pathname === "/";
    } else {
      const matchPath = normalised.replace(/\/$/, "");
      isActive =
        location.pathname === matchPath ||
        location.pathname.startsWith(`${matchPath}/`);
    }

    return (
      <Link
        key={link.to}
        to={link.to}
        className={`transition-colors ${
          isActive ? "text-foreground" : "text-foreground/70 hover:text-foreground"
        }`}
      >
        {link.label}
      </Link>
    );
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all backdrop-blur-xl ${
        scrolled ? "bg-surface/85 border-b border-white/10" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 text-sm">
        <Link to="/" className="font-semibold tracking-tight text-foreground">
          Rezend Form
        </Link>
        <div className="hidden items-center gap-6 md:flex">
          {links.map(renderLink)}
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/rezend/rezend-form"
            className="hidden rounded-full border border-white/10 px-4 py-2 text-foreground/70 transition hover:border-accent/40 hover:text-foreground sm:flex"
          >
            GitHub
          </a>
          <a
            href="https://vercel.com/new"
            className="rounded-full bg-gradient-to-r from-accent to-accentSoft px-4 py-2 text-sm font-semibold text-surface shadow-lg shadow-accent/30 transition hover:shadow-accent/50"
          >
            Deploy
          </a>
        </div>
      </nav>
    </header>
  );
}
