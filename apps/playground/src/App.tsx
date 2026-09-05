import { useTheme } from "@notsho/theme";
import { useState } from "react";
import { CustomizerDock, dockInset, type DockState } from "@notsho/customizer";
import { Button } from "@notsho/registry/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@notsho/registry/card";
import { Input } from "@notsho/registry/input";
import { Field, FieldLabel, FieldDescription, FieldError } from "@notsho/registry/field";
import { Badge } from "@notsho/registry/badge";
import { Checkbox } from "@notsho/registry/checkbox";
import { Switch } from "@notsho/registry/switch";
import { Select, SelectItem, SelectGroup, SelectGroupLabel, SelectSeparator } from "@notsho/registry/select";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@notsho/registry/dialog";
import { Tabs, TabsList, Tab, TabPanel } from "@notsho/registry/tabs";
import { Tooltip, TooltipProvider } from "@notsho/registry/tooltip";
import { Menu, MenuTrigger, MenuContent, MenuItem, MenuSeparator } from "@notsho/registry/menu";
import { useToast } from "@notsho/registry/toast";

const fonts = { sans: "Sans-serif", serif: "Serif", mono: "Monospace" };

export function App() {
  const { theme, resolvedScheme, hydrated } = useTheme();
  const toast = useToast();
  const [dock, setDock] = useState<DockState>({ position: "bottom", open: false });
  return (
    <div className="frame" style={dockInset(dock)} data-dock={dock.open ? dock.position : undefined}>
      <header className="frame-bar">
        <span className="frame-brand">Notsho</span>
        <span className="frame-status" data-testid="status">
          {theme.scheme} · {resolvedScheme} · {Object.keys(theme.overrides).length} overrides{hydrated ? "" : " · hydrating"}
        </span>
      </header>
      <main className="stage">

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

        <Card>
          <CardHeader>
            <CardTitle>Selection</CardTitle>
            <CardDescription>Select, Checkbox, Switch, Badge.</CardDescription>
          </CardHeader>
          <CardContent className="pg-stack">
            <Select items={fonts} defaultValue="sans" data-testid="select">
              <SelectGroup>
                <SelectGroupLabel>Family</SelectGroupLabel>
                <SelectItem value="sans">Sans-serif</SelectItem>
                <SelectItem value="serif">Serif</SelectItem>
              </SelectGroup>
              <SelectSeparator />
              <SelectItem value="mono">Monospace</SelectItem>
            </Select>
            <Checkbox defaultChecked label="Email me updates" description="Product news, about once a month." />
            <Checkbox indeterminate label="Select all" />
            <Checkbox disabled label="Unavailable" />
            <Switch defaultChecked label="Compact mode" description="Tighter spacing across the app." />
            <Switch size="sm" label="Small switch" />
            <div className="pg-row">
              <Badge>Neutral</Badge><Badge variant="accent">Accent</Badge><Badge variant="success" dot>Live</Badge><Badge variant="warning">Beta</Badge><Badge variant="danger">Failed</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overlays</CardTitle>
            <CardDescription>Dialog, Menu, Tooltip, Toast.</CardDescription>
          </CardHeader>
          <CardContent className="pg-stack">
            <div className="pg-row">
              <Dialog>
                <DialogTrigger render={<Button variant="secondary" />}>Open dialog</DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete workspace?</DialogTitle>
                    <DialogDescription>This removes all projects and members. It cannot be undone.</DialogDescription>
                  </DialogHeader>
                  <Field>
                    <FieldLabel>Type the workspace name to confirm</FieldLabel>
                    <Input placeholder="Acme Inc." />
                  </Field>
                  <DialogFooter>
                    <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
                    <DialogClose render={<Button variant="danger" />}>Delete</DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Menu>
                <MenuTrigger render={<Button variant="secondary" />}>Menu</MenuTrigger>
                <MenuContent>
                  <MenuItem>Rename</MenuItem>
                  <MenuItem>Duplicate</MenuItem>
                  <MenuSeparator />
                  <MenuItem danger>Delete</MenuItem>
                </MenuContent>
              </Menu>
              <TooltipProvider>
                <Tooltip content="Tooltips are for hints, not content.">
                  <Button variant="ghost">Hover me</Button>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="pg-row">
              <Button size="sm" variant="secondary" onClick={() => toast.add({ title: "Saved", description: "Your changes are live.", type: "success" })}>Success toast</Button>
              <Button size="sm" variant="secondary" onClick={() => toast.add({ title: "Sync failed", description: "Check your connection and retry.", type: "danger" })}>Danger toast</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tabs</CardTitle>
          </CardHeader>
          <CardContent className="pg-stack">
            <Tabs defaultValue="general">
              <TabsList>
                <Tab value="general">General</Tab><Tab value="members">Members</Tab><Tab value="billing">Billing</Tab>
              </TabsList>
              <TabPanel value="general">General settings for this workspace.</TabPanel>
              <TabPanel value="members">Invite and manage members.</TabPanel>
              <TabPanel value="billing">Plans and invoices.</TabPanel>
            </Tabs>
            <Tabs defaultValue="week">
              <TabsList variant="segmented">
                <Tab value="day">Day</Tab><Tab value="week">Week</Tab><Tab value="month">Month</Tab>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        <Card interactive>
          <CardContent>
            <strong>Interactive card</strong>
            <p style={{ margin: "4px 0 0", color: "var(--notsho-color-text-muted)", fontSize: "var(--notsho-size-sm)" }}>Hover to lift.</p>
          </CardContent>
        </Card>
      </section>
      </main>
      <CustomizerDock defaultOpen onPositionChange={(position) => setDock((d) => ({ ...d, position }))} onOpenChange={(open) => setDock((d) => ({ ...d, open }))} />
    </div>
  );
}
