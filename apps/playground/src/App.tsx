import { useTheme } from "@notsho/theme";
import { Button } from "@notsho/registry/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@notsho/registry/card";
import { Input } from "@notsho/registry/input";
import { Field, FieldLabel, FieldDescription, FieldError } from "@notsho/registry/field";

export function App() {
  const { theme, resolvedScheme, setScheme, setOverride, reset, hydrated } = useTheme();
  const accent = typeof theme.overrides["color.accent"] === "string" ? theme.overrides["color.accent"] : "";
  return (
    <main className="pg">
      <h1>Notsho playground</h1>
      <p data-testid="status" style={{ color: "var(--notsho-color-text-muted)" }}>
        scheme={theme.scheme} resolved={resolvedScheme} hydrated={String(hydrated)} overrides={Object.keys(theme.overrides).length}
      </p>

      <div className="pg-toolbar">
        <label>Scheme
          <select value={theme.scheme} onChange={(e) => setScheme(e.target.value as never)} data-testid="scheme">
            <option value="system">system</option><option value="light">light</option><option value="dark">dark</option>
          </select>
        </label>
        <label>Accent
          <input data-testid="accent" placeholder="oklch(0.62 0.22 300)" value={accent}
            onChange={(e) => setOverride("color.accent", e.target.value || undefined)} />
        </label>
        <Button size="sm" variant="secondary" onClick={() => setOverride("radius.control", "9999px")}>Pill controls</Button>
        <Button size="sm" variant="ghost" onClick={() => reset()}>Reset</Button>
      </div>

      <section className="pg-grid">
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>Four variants, three sizes, loading and disabled.</CardDescription>
          </CardHeader>
          <CardContent className="pg-stack">
            <div className="pg-row">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
            <div className="pg-row">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button iconOnly aria-label="Add">+</Button>
            </div>
            <div className="pg-row">
              <Button loading>Saving…</Button>
              <Button disabled>Disabled</Button>
              <Button variant="secondary" disabled>Disabled</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Form</CardTitle>
            <CardDescription>Input inside Field with validation.</CardDescription>
          </CardHeader>
          <CardContent className="pg-stack">
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input placeholder="you@example.com" type="email" />
              <FieldDescription>We only use this for receipts.</FieldDescription>
            </Field>
            <Field validate={(v) => (String(v).length < 3 ? "Must be at least 3 characters." : null)} validationMode="onChange">
              <FieldLabel>Display name</FieldLabel>
              <Input defaultValue="ab" />
              <FieldError />
            </Field>
            <Field disabled>
              <FieldLabel>Disabled</FieldLabel>
              <Input placeholder="Can't type here" />
            </Field>
            <div className="pg-row">
              <Input size="sm" placeholder="Small" />
              <Input size="lg" placeholder="Large" />
            </div>
          </CardContent>
          <CardFooter>
            <Button>Save</Button>
            <Button variant="ghost">Cancel</Button>
          </CardFooter>
        </Card>

        <Card interactive>
          <CardContent>
            <strong>Interactive card</strong>
            <p style={{ margin: "4px 0 0", color: "var(--notsho-color-text-muted)", fontSize: "var(--notsho-size-sm)" }}>Hover to lift.</p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
