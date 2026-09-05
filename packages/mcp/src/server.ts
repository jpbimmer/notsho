#!/usr/bin/env node
/**
 * Notsho MCP server (stdio). Gives coding agents precise, current knowledge of
 * the design system: tokens, components, derivation, and validation.
 *
 * Claude Code:  claude mcp add notsho -- npx -y @notsho/mcp
 * Cursor/other: { "mcpServers": { "notsho": { "command": "npx", "args": ["-y", "@notsho/mcp"] } } }
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { deriveTheme, getComponent, getToken, listComponents, listTokens, meta, rules, validate } from "./tools.js";

const server = new McpServer({ name: "notsho", version: meta.version });
const text = (v: unknown) => ({ content: [{ type: "text" as const, text: typeof v === "string" ? v : JSON.stringify(v, null, 2) }] });

server.registerTool("list_tokens", {
  description: `Search Notsho design tokens (${meta.tokenCount} total). Use semantic tokens in app code; never primitives. Returns name, tier, type, CSS variable, and resolved light/dark values.`,
  inputSchema: { query: z.string().optional().describe("Substring match on name or description, e.g. 'accent', 'radius'"), tier: z.enum(["primitive", "semantic", "component"]).optional(), type: z.string().optional().describe("DTCG type: color, dimension, fontFamily, shadow, duration…") },
}, async (a) => text(listTokens(a)));

server.registerTool("get_token", {
  description: "Full detail for one token by name (color.accent) or CSS variable (--notsho-color-accent): value, references, usage snippets, which components use it, and whether it is safe to use directly.",
  inputSchema: { name: z.string() },
}, async ({ name }) => { const t = getToken(name); return t ? text(t) : text(`No token "${name}". Try list_tokens.`); });

server.registerTool("list_components", {
  description: "All registry components with descriptions and whether each is installed in the current project (per notsho.json).",
  inputSchema: { projectRoot: z.string().optional().describe("Defaults to the nearest project root from cwd") },
}, async ({ projectRoot }) => text(listComponents(projectRoot)));

server.registerTool("get_component", {
  description: "Component API and source: exports, props (with docs), tokens it consumes, import path, install command if missing, and full file contents from the registry.",
  inputSchema: { name: z.string(), projectRoot: z.string().optional() },
}, async ({ name, projectRoot }) => { const c = getComponent(name, projectRoot); return c ? text(c) : text(`No component "${name}". Try list_components.`); });

server.registerTool("validate", {
  description: "Lint CSS/TSX/JSX for hardcoded visual values (hex/rgb colors, fixed font-size, radius, shadow, duration, font-family) that will not follow the user's theme. Pass source text or a file path. Returns line/column findings with the token to use instead.",
  inputSchema: { source: z.string().optional(), path: z.string().optional(), filename: z.string().optional().describe("Used to infer CSS vs TSX when passing source") },
}, async (a) => text(validate(a)));

server.registerTool("derive_theme", {
  description: `Produce a coherent theme from a few choices, exactly as the end-user customizer would. Returns token overrides, CSS to commit, and meta the Customizer can reload. Presets: ${meta.presets.join(", ")}.`,
  inputSchema: {
    accent: z.string().optional().describe("Hex, e.g. #7c3aed"),
    tint: z.number().min(0).max(1).optional().describe("How much accent hue bleeds into neutrals"),
    preset: z.string().optional(),
    typography: z.object({ body: z.string().optional(), heading: z.string().optional(), code: z.string().optional(), size: z.union([z.literal(14), z.literal(15), z.literal(16), z.literal(17), z.literal(18)]).optional(), headingWeight: z.union([z.literal(500), z.literal(600), z.literal(700)]).optional() }).optional(),
    shape: z.object({ radius: z.enum(["sharp", "soft", "rounded", "round", "pill"]).optional(), density: z.enum(["compact", "comfortable", "spacious"]).optional(), elevation: z.enum(["flat", "soft", "lifted"]).optional(), borders: z.enum(["hairline", "bold"]).optional() }).optional(),
    motion: z.object({ speed: z.enum(["off", "reduced", "normal", "expressive"]).optional() }).optional(),
  },
}, async (a) => text(deriveTheme(a as Parameters<typeof deriveTheme>[0])));

server.registerTool("get_rules", {
  description: "The Notsho rules pack (AGENTS.md section): how to use tokens and components correctly in this project. Read this before writing UI.",
  inputSchema: { projectRoot: z.string().optional(), componentsDir: z.string().optional() },
}, async ({ projectRoot, componentsDir }) => text(rules(projectRoot, componentsDir)));

server.registerResource("rules", "notsho://rules", { description: "Notsho rules pack (markdown)", mimeType: "text/markdown" },
  async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: rules() }] }));
server.registerResource("tokens", "notsho://tokens", { description: "All tokens (JSON)", mimeType: "application/json" },
  async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(listTokens(), null, 2) }] }));

const transport = new StdioServerTransport();
await server.connect(transport);
