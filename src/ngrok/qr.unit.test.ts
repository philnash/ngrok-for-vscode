import type { WebviewPanel } from "vscode";
import { describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({}));

import { showQR } from "./qr";

describe("showQR", () => {
  it("replaces the existing panel HTML and reveals it for each URL", async () => {
    const panel = {
      reveal: vi.fn(),
      webview: { html: "" },
    } as unknown as WebviewPanel;
    const firstUrl = "https://first.example";
    const secondUrl = "https://second.example";

    await showQR(firstUrl, panel);
    const firstHtml = panel.webview.html;
    await showQR(secondUrl, panel);

    expect(firstHtml).toContain(firstUrl);
    expect(firstHtml).not.toContain(secondUrl);
    expect(panel.webview.html).toContain(secondUrl);
    expect(panel.webview.html).not.toContain(firstUrl);
    expect(panel.reveal).toHaveBeenCalledTimes(2);
  });
});
