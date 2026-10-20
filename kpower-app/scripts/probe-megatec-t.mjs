import HID from "node-hid";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

function selfTestLog() {
  return execFileSync(
    "python",
    [path.join(root, "inspect-selftest-log.py")],
    { encoding: "utf8" },
  ).trim();
}

console.log("before", selfTestLog());
const info = HID.devices().find((d) => d.vendorId === 0x0463 && d.productId === 0x0001);
if (!info) throw new Error("no device");
const dev = new HID.HID(info.path);
const buf = Buffer.alloc(8, 0);
buf[0] = 0x06;
buf[1] = 0x54; // 'T'
console.log("sendFeatureReport", dev.sendFeatureReport(buf), buf.toString("hex"));
dev.close();
await new Promise((r) => setTimeout(r, 3000));
console.log("after", selfTestLog());
