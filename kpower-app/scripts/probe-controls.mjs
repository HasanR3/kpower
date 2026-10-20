import HID from "node-hid";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

function selfTestLog() {
  return execFileSync("python", [path.join(root, "inspect-selftest-log.py")], {
    encoding: "utf8",
  }).trim();
}

function send(reportId, ascii) {
  const info = HID.devices().find((d) => d.vendorId === 0x0463 && d.productId === 0x0001);
  const dev = new HID.HID(info.path);
  const buf = Buffer.alloc(8, 0);
  buf[0] = reportId;
  Buffer.from(ascii, "ascii").copy(buf, 1);
  try {
    const n = dev.sendFeatureReport(buf);
    console.log(`feat rid=${reportId} cmd=${ascii} n=${n} hex=${buf.toString("hex")}`);
  } catch (e) {
    console.log(`feat rid=${reportId} cmd=${ascii} FAIL ${e.message}`);
  }
  // also try exact-length buffer = 1 + ascii.length
  try {
    const buf2 = Buffer.alloc(1 + ascii.length);
    buf2[0] = reportId;
    Buffer.from(ascii, "ascii").copy(buf2, 1);
    const n = dev.sendFeatureReport(buf2);
    console.log(`feat-short rid=${reportId} cmd=${ascii} n=${n} hex=${buf2.toString("hex")}`);
  } catch (e) {
    console.log(`feat-short rid=${reportId} cmd=${ascii} FAIL ${e.message}`);
  }
  try {
    const g2 = Buffer.from(dev.getFeatureReport(2, 8));
    const g3 = Buffer.from(dev.getFeatureReport(3, 8));
    const g4 = Buffer.from(dev.getFeatureReport(4, 8));
    console.log(`  status 2=${g2.toString("hex")} 3=${g3.toString("hex")} 4=${g4.toString("hex")}`);
  } catch {}
  dev.close();
}

console.log("before", selfTestLog());

// Try report IDs commonly used by megatec-usb clones
for (const rid of [0x02, 0x06, 0x0a, 0x0c, 0x01]) {
  send(rid, "T");
}

await new Promise((r) => setTimeout(r, 4000));
console.log("after T sweeps", selfTestLog());

// Windows service custom controls (QtService user codes typically start at 128)
for (const code of [128, 129, 130, 131, 132, 133, 134, 135, 200, 201]) {
  try {
    const out = execFileSync("sc.exe", ["control", "KPower", String(code)], { encoding: "utf8" });
    console.log("sc", code, out.trim());
  } catch (e) {
    console.log("sc", code, (e.stderr || e.message || "").toString().slice(0, 120));
  }
}

await new Promise((r) => setTimeout(r, 2000));
console.log("after sc", selfTestLog());
