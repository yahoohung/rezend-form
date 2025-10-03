import { ReactNode } from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { TopNav } from "../components/TopNav";
import { UncontrolledForm } from "../examples/components/UncontrolledForm";
import { ControlledForm } from "../examples/components/ControlledForm";
import { ValidationForm } from "../examples/components/ValidationForm";
import { ServerUpdatesForm } from "../examples/components/ServerUpdatesForm";
import { PerformanceForm } from "../examples/components/PerformanceForm";

interface ExampleScreen {
  path: string;
  label: string;
  title: string;
  description: string;
  element: ReactNode;
}

const exampleScreens: ExampleScreen[] = [
  {
    path: "uncontrolled",
    label: "Uncontrolled Form",
    title: "Uncontrolled form",
    description: "Handle submissions by reading inputs from the DOM while keeping store snapshots authoritative.",
    element: <UncontrolledForm />
  },
  {
    path: "controlled",
    label: "Controlled Form",
    title: "Controlled form",
    description: "Register controlled fields for first and last name, then submit with values pulled from the store.",
    element: <ControlledForm />
  },
  {
    path: "validation",
    label: "Validation",
    title: "Validation",
    description: "Attach validators for synchronous checks and surface field-level errors with touched tracking.",
    element: <ValidationForm />
  },
  {
    path: "server-updates",
    label: "Server Updates",
    title: "Server updates",
    description: "Mix client input with live updates by writing to the store from intervals and reacting to status flags.",
    element: <ServerUpdatesForm />
  },
  {
    path: "performance",
    label: "Performance",
    title: "Performance",
    description: "Stress-test thousands of fields with precise updates, idle scheduling, and responsive metrics.",
    element: <PerformanceForm />
  }
];

function ExamplesSidebar() {
  return (
    <aside className="examples-sidebar">
      <p className="examples-sidebar-label">Examples</p>
      <nav className="examples-sidebar-nav">
        {exampleScreens.map((screen) => (
          <NavLink
            key={screen.path}
            to={screen.path}
            className={({ isActive }) =>
              `examples-nav-link${isActive ? " examples-nav-link--active" : ""}`
            }
          >
            <span>{screen.label}</span>
            <span aria-hidden className="examples-nav-link-icon">&gt;</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

function ExampleView({ screen }: { screen: ExampleScreen }) {
  return (
    <div className="examples-card">
      <header className="examples-card-header">
        <p className="examples-card-eyebrow">Scenario</p>
        <h2 className="examples-card-title">{screen.title}</h2>
        <p className="examples-card-subtitle">{screen.description}</p>
      </header>
      <div className="examples-card-body">{screen.element}</div>
    </div>
  );
}

function ExamplesContent() {
  return (
    <ChakraProvider value={defaultSystem}>
      <main className="examples-main">
        <div className="examples-gradient examples-gradient--primary" aria-hidden />
        <div className="examples-gradient examples-gradient--accent" aria-hidden />
        <section className="examples-shell">
          <div className="examples-intro">
            <p className="examples-intro-eyebrow">Use cases</p>
            <h1 className="examples-intro-title">Explore Rezend Form in practice</h1>
            <p className="examples-intro-subtitle">
              Toggle between live demos to see how the store adapts to different integration patterns without sacrificing performance.
            </p>
          </div>
          <div className="examples-layout">
            <ExamplesSidebar />
            <div className="examples-view">
              <Routes>
                <Route index element={<Navigate to="uncontrolled" replace />} />
                {exampleScreens.map((screen) => (
                  <Route key={screen.path} path={screen.path} element={<ExampleView screen={screen} />} />
                ))}
                <Route path="*" element={<Navigate to="uncontrolled" replace />} />
              </Routes>
            </div>
          </div>
        </section>
      </main>
    </ChakraProvider>
  );
}

export function ExamplesPage() {
  return (
    <div className="examples-page-wrapper">
      <TopNav />
      <ExamplesContent />
    </div>
  );
}
