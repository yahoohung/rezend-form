import { useState, type FormEvent } from "react";
import { useRezendForm } from "rezend-form";

type Field = {
  name: string;
  value: string;
};

const initialFields: Field[] = [
  { name: "email", value: "" },
  { name: "fullName", value: "" }
];

export function App() {
  const [fields, setFields] = useState(initialFields);
  const form = useRezendForm({ id: "demo-form" });

  function updateField(name: string, value: string) {
    setFields((prev) =>
      prev.map((field) => (field.name === name ? { ...field, value } : field))
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    alert(
      `Submitting ${form.id} with data: ` +
        JSON.stringify(
          Object.fromEntries(fields.map((field) => [field.name, field.value])),
          null,
          2
        )
    );
  }

  return (
    <main className="app">
      <h1>Rezend Form Demo</h1>
      <p>
        This Vite-powered example shows how <code>useRezendForm</code> keeps helpers memoized while you manage
        controlled inputs.
      </p>

      <form onSubmit={handleSubmit} data-rezend-form={form.id}>
        {fields.map((field) => (
          <label key={field.name} className="field">
            <span>{field.name}</span>
            <input
              name={field.name}
              value={field.value}
              onChange={(event) => updateField(field.name, event.target.value)}
            />
          </label>
        ))}

        <button type="submit">Submit</button>
      </form>
    </main>
  );
}

export default App;
