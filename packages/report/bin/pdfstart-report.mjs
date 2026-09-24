#!/usr/bin/env node
import { convert } from "../dist/cli.js";

let code = 0;
try {
  await convert(process.argv.slice(2));
} catch (err) {
  console.error(err && err.message ? err.message : String(err));
  code = 1;
}
process.exit(code);
