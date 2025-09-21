import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { useRezendForm } from "../src";

type HookResult = ReturnType<typeof useRezendForm>;

describe("useRezendForm", () => {
  function TestComponent({
    formId,
    onRender
  }: {
    formId: string;
    onRender?: (value: HookResult) => void;
  }) {
    const form = useRezendForm({ id: formId });

    useEffect(() => {
      onRender?.(form);
    }, [form, onRender]);

    return <span data-testid="form-id">{form.id}</span>;
  }

  it("exposes the provided form id", () => {
    render(<TestComponent formId="checkout" />);

    expect(screen.getByTestId("form-id")).toHaveTextContent("checkout");
  });

  it("memoizes the returned form helpers while the id is stable", () => {
    const renders: HookResult[] = [];
    const { rerender } = render(
      <TestComponent formId="stable" onRender={(value) => renders.push(value)} />
    );

    rerender(<TestComponent formId="stable" onRender={(value) => renders.push(value)} />);

    expect(renders).toHaveLength(2);
    expect(renders[0]).toBe(renders[1]);
  });

  it("returns a new helpers object when the id changes", () => {
    const renders: HookResult[] = [];
    const { rerender } = render(
      <TestComponent formId="initial" onRender={(value) => renders.push(value)} />
    );

    rerender(<TestComponent formId="next" onRender={(value) => renders.push(value)} />);

    expect(renders).toHaveLength(2);
    expect(renders[0]).not.toBe(renders[1]);
    expect(screen.getByTestId("form-id")).toHaveTextContent("next");
  });
});
