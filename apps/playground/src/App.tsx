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
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter, SheetClose } from "@notsho/registry/sheet";
import { Segmented } from "@notsho/registry/segmented";
import { Nav, NavSection, NavItem } from "@notsho/registry/nav";
import { Command, CommandGroup, CommandItem, CommandEmpty, useCommandShortcut } from "@notsho/registry/command";
import { DataTable, createColumnHelper } from "@notsho/registry/data-table";
import { Stat, StatGroup } from "@notsho/registry/stat";
import { EmptyState } from "@notsho/registry/empty-state";
import { SearchIcon } from "@notsho/registry/lib/icons";

type Venue = { id: string; name: string; city: string; visits: number };
const venues: Venue[] = Array.from({ length: 200 }, (_, i) => ({
  id: String(i),
  name: ["Sycamore Den", "The Rose", "Bar Moga", "Attaboy", "Death & Co", "Please Don't Tell", "Dutch Kills"][i % 7]! + (i > 6 ? ` ${Math.floor(i / 7) + 1}` : ""),
  city: ["Brooklyn", "New York", "Asheville", "Chicago"][i % 4]!,
  visits: (i * 37) % 41 + 1,
}));
const col = createColumnHelper<Venue>();
const venueColumns = [
  col.accessor("name", { header: "Venue", meta: { width: "minmax(10rem, 2fr)" } }),
  col.accessor("city", { header: "City", meta: { hideOnMobile: true } }),
  col.accessor("visits", { header: "Visits", meta: { align: "end", width: "5rem" } }),
];
const commandItems = ["Check-ins", "Spirits", "Rittenhouse BIB", "Attaboy", "Laphroaig 10", "Settings"];

function NavDemo() {
  const [active, setActive] = useState("checkins");
  const items = [["home", "Home", 0], ["checkins", "Check-ins", 6698], ["spirits", "Spirits", 112]] as const;
  return (
    <div className="pg-stack">
      <Nav>
        <NavSection label="Datasets">
          {items.map(([id, label, count]) => (
            <NavItem key={id} href="#" active={active === id} count={count || undefined} icon={<SearchIcon />} onClick={(e) => { e.preventDefault(); setActive(id); }}>{label}</NavItem>
          ))}
        </NavSection>
      </Nav>
      <Nav orientation="horizontal" style={{ borderTop: "var(--notsho-border-width) solid var(--notsho-color-border)" }}>
        <NavSection>
          {items.map(([id, label]) => (
            <NavItem key={id} href="#" active={active === id} icon={<SearchIcon />} onClick={(e) => { e.preventDefault(); setActive(id); }}>{label}</NavItem>
          ))}
        </NavSection>
      </Nav>
    </div>
  );
}

function CommandDemo() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  useCommandShortcut(() => setOpen((o) => !o));
  const results = commandItems.filter((c) => c.toLowerCase().includes(query.toLowerCase()));
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>Command ⌘K</Button>
      <Command open={open} onOpenChange={setOpen} query={query} onQueryChange={setQuery} placeholder="Search everything…" footer={<><span>↑↓ navigate</span><span>↵ open</span></>}>
        {results.length ? (
          <CommandGroup heading="Results">
            {results.map((r) => <CommandItem key={r} icon={<SearchIcon />} hint="Dataset" description="Jump to it" onSelect={() => setOpen(false)}>{r}</CommandItem>)}
          </CommandGroup>
        ) : <CommandEmpty>No matches for “{query}”</CommandEmpty>}
      </Command>
    </>
  );
}

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
            <CardTitle>Get started</CardTitle>
            <CardDescription>Everything on this page is themed by the dock. Add it to your app:</CardDescription>
          </CardHeader>
          <CardContent className="pg-stack">
            <pre className="pg-code">{`npx notsho init
npx notsho add button card input
claude mcp add notsho -- npx -y @notsho/mcp`}</pre>
            <p className="pg-muted">Then wrap your app in <code>ThemeProvider</code> and drop in <code>CustomizerDock</code>. Your agent reads <code>AGENTS.md</code>; your users get this panel.</p>
          </CardContent>
        </Card>

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


        <Card>
          <CardHeader>
            <CardTitle>Data</CardTitle>
            <CardDescription>Stat, Segmented, DataTable, EmptyState.</CardDescription>
          </CardHeader>
          <CardContent className="pg-stack">
            <StatGroup>
              <Stat label="Check-ins" value="6,698" delta="+42" trend="up" hint="since 2009" />
              <Stat label="Bottles" value="112" unit="on hand" />
              <Stat label="Restock" value="24" delta="−3" trend="down" />
            </StatGroup>
            <Segmented aria-label="View" options={[{ value: "list", label: "List" }, { value: "map", label: "Map" }, { value: "stats", label: "Stats" }]} />
            <Segmented fullWidth aria-label="Range" options={[{ value: "d", label: "Day" }, { value: "w", label: "Week" }, { value: "m", label: "Month" }]} defaultValue="w" />
            <div style={{ height: "16rem", border: "var(--notsho-border-width) solid var(--notsho-color-border)", borderRadius: "var(--notsho-radius-control)", overflow: "hidden" }}>
              <DataTable data={venues} columns={venueColumns} onRowClick={() => {}} activeRowId="2" />
            </div>
            <EmptyState size="sm" icon={<SearchIcon />} title="No bars yet" description="Import your Swarm export to see every bar you've checked into.">
              <Button size="sm">Import</Button>
            </EmptyState>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Navigation</CardTitle>
            <CardDescription>Nav (sidebar + tab bar), Sheet, Command.</CardDescription>
          </CardHeader>
          <CardContent className="pg-stack">
            <NavDemo />
            <div className="pg-row">
              <Sheet>
                <SheetTrigger render={<Button variant="secondary" />}>Side sheet</SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Rittenhouse BIB</SheetTitle>
                    <SheetDescription>Rye · 100 proof · 750ml</SheetDescription>
                  </SheetHeader>
                  <SheetBody><p className="pg-muted">Swipe right or press Esc to dismiss.</p></SheetBody>
                  <SheetFooter>
                    <SheetClose render={<Button variant="ghost" />}>Close</SheetClose>
                    <Button>Mark finished</Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
              <Sheet side="bottom">
                <SheetTrigger render={<Button variant="secondary" />}>Bottom sheet</SheetTrigger>
                <SheetContent>
                  <SheetHeader><SheetTitle>Quick actions</SheetTitle></SheetHeader>
                  <SheetBody className="pg-stack">
                    <Button variant="secondary">Open bottle</Button>
                    <Button variant="secondary">Adjust fill</Button>
                  </SheetBody>
                </SheetContent>
              </Sheet>
              <CommandDemo />
            </div>
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
