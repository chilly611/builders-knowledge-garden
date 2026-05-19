import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Install Claude Desktop Extension | Builder's Knowledge Garden",
  description:
    "One-click install: connect Claude Desktop to BKG's 12-tool MCP server. Ask Claude about Marin energy code, OSHA fall protection, or your project's CSI estimate — answered live from BKG.",
};

const GREEN = "#1D9E75";

export default function InstallMcpPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#fafafa",
        fontFamily: "var(--font-archivo), sans-serif",
        color: "#1a1a1a",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "80px 24px" }}>
        <p
          style={{
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            fontSize: 13,
            fontWeight: 600,
            color: GREEN,
            marginBottom: 16,
          }}
        >
          Claude Desktop extension
        </p>

        <h1
          style={{
            fontSize: 44,
            lineHeight: 1.1,
            fontWeight: 800,
            fontFamily: "var(--font-archivo-black), sans-serif",
            marginBottom: 20,
          }}
        >
          Connect Claude to your jobsite knowledge.
        </h1>

        <p
          style={{
            fontSize: 18,
            color: "#444",
            lineHeight: 1.55,
            marginBottom: 36,
          }}
        >
          One file, one double-click, and Claude Desktop can answer questions
          using the same 40,000+ construction entities (codes, materials,
          safety, estimating) that power the Killer App.
        </p>

        <a
          href="/bkg-mcp.mcpb"
          download
          style={{
            display: "inline-block",
            backgroundColor: GREEN,
            color: "white",
            textDecoration: "none",
            padding: "16px 32px",
            borderRadius: 8,
            fontSize: 17,
            fontWeight: 700,
            marginBottom: 12,
          }}
        >
          Download bkg-mcp.mcpb
        </a>
        <p style={{ fontSize: 13, color: "#888", marginBottom: 56 }}>
          Requires Claude Desktop. macOS or Windows. ~5 KB.
        </p>

        <ol
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gap: 24,
          }}
        >
          <Step
            n={1}
            title="Download the bundle"
            body="Click the green button above. Your browser saves a small file called bkg-mcp.mcpb to your Downloads folder."
          />
          <Step
            n={2}
            title="Double-click bkg-mcp.mcpb"
            body="Claude Desktop opens with an install prompt. Click Install. Then fully quit Claude Desktop (Cmd-Q on Mac) and reopen it — extensions only load at startup."
          />
          <Step
            n={3}
            title="Ask Claude anything about construction"
            body={`Try: "What are the Marin County energy code requirements I need to plan for?" Claude calls the BKG MCP server live and returns Title 24 §110.10, CRC R301 wind/seismic, CalGreen, and more — each cited.`}
          />
        </ol>

        <div
          style={{
            marginTop: 56,
            padding: 20,
            borderRadius: 8,
            backgroundColor: "#fff",
            border: "1px solid #eaeaea",
            fontSize: 14,
            lineHeight: 1.6,
            color: "#555",
          }}
        >
          <strong style={{ color: "#1a1a1a" }}>Trouble installing?</strong>
          <br />
          If Claude Desktop doesn&apos;t recognize the .mcpb file (older
          versions), use the{" "}
          <a
            href="https://github.com/chilly611/builders-knowledge-garden/blob/main/docs/onboarding/CLAUDE-DESKTOP-MCP-SETUP.md"
            style={{ color: GREEN, fontWeight: 600 }}
          >
            manual setup guide
          </a>{" "}
          — clone the repo, drop a small block into{" "}
          <code style={{ fontSize: 13 }}>claude_desktop_config.json</code>,
          restart. Same bridge, different registration path.
        </div>

        <div style={{ marginTop: 40, fontSize: 13, color: "#999" }}>
          Server endpoint:{" "}
          <code>https://builders.theknowledgegardens.com/api/v1/mcp</code>
          <br />
          12 tools · 142+ jurisdictions · open access for the SF investor
          demo.
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li
      style={{
        display: "grid",
        gridTemplateColumns: "44px 1fr",
        gap: 16,
        alignItems: "start",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          backgroundColor: GREEN,
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 16,
        }}
      >
        {n}
      </div>
      <div>
        <h3
          style={{
            fontSize: 19,
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          {title}
        </h3>
        <p style={{ fontSize: 15, color: "#555", lineHeight: 1.55, margin: 0 }}>
          {body}
        </p>
      </div>
    </li>
  );
}
