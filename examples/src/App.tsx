import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFormStore } from "@form/core";

type Field = {
  name: string;
  value: string;
};

const initialFields: Field[] = [
  { name: "email", value: "" },
  { name: "fullName", value: "" }
];

export function App() {
  const store = useMemo(() => createFormStore(), []);
  const [fields, setFields] = useState(initialFields);

  useEffect(() => {
    return store.subscribe((snapshot) => snapshot.getDirty("email"), () => {
      // expose subscription side effects for demo purposes only
    });
  }, [store]);

  useEffect(() => {
    const cleanups = [
      store.register("email", { initialValue: "" }),
      store.register("fullName", { initialValue: "" })
    ];
    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  }, [store]);

  function updateField(name: string, value: string) {
    setFields((prev) =>
      prev.map((field) => (field.name === name ? { ...field, value } : field))
    );
    store.markDirty(name);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const snapshot = store.read((path) => fields.find((field) => field.name === path)?.value ?? "");
    alert(
      `Submitting form with dirty flag for email: ${snapshot.getDirty("email")}`
    );
  }

  return (
    <main className="app">
      <h1>Rezend Form Demo</h1>
      <p>
        This Vite example currently demonstrates the low-level store API. A dedicated React adapter will be added soon.
      </p>

      <form onSubmit={handleSubmit} data-rezend-form="demo">
        {fields.map((field) => (
          <label key={field.name} className="field">
            <span>{field.name}</span>
            <input
              name={field.name}
              value={field.value}
              onChange={(event) => updateField(field.name, event.target.value)}
              onBlur={() => store.markTouched(field.name)}
            />
            <span className="hint">
              touched: {String(store.getTouched(field.name))} · dirty: {String(store.getDirty(field.name))}
            </span>
          </label>
        ))}

        <button type="submit">Submit</button>
      </form>
    </main>
  );
}

export default App;
