import assert from "node:assert/strict";
import { escapeCsvCell, buildCsv, safeFilename } from "../lib/csv.ts";

assert.equal(escapeCsvCell("Hola; mundo", ";"), '"Hola; mundo"');
assert.equal(escapeCsvCell('Dice "hola"', ";"), '"Dice ""hola"""');
assert.equal(escapeCsvCell("=1+1"), "'=1+1");
assert.equal(escapeCsvCell("  +1+1"), "'  +1+1");
assert.equal(escapeCsvCell("@SUM(A1)"), "'@SUM(A1)");
assert.equal(escapeCsvCell(-12), "-12");
assert.equal(escapeCsvCell(null), "");
assert.equal(safeFilename("Mi Negócio"), "mi-negocio");
assert.equal(buildCsv(["Cliente","Importe"], [["CL-123", "50,00"]], ";"), "\uFEFFCliente;Importe\r\nCL-123;50,00\r\n");
console.log("PASS: localized CSV, escaping and formula injection protection");
