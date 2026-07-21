const assert = require("node:assert/strict");
const vscode = require("vscode");

suite("packaged platform extension", () => {
  test("loads its native SDK and activates", async () => {
    const extension = vscode.extensions.getExtension(
      "philnash.ngrok-for-vscode",
    );
    assert.ok(extension, "the packaged ngrok extension was not installed");

    await extension.activate();

    assert.equal(extension.isActive, true);
  });
});
