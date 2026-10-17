import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { extractDocx, extractXlsx } from "../src/office";

describe("extractDocx", () => {
  it("returns one line per paragraph with tabs, breaks and entities", () => {
    const xml =
      '<?xml version="1.0"?><w:document xmlns:w="x"><w:body>' +
      '<w:p><w:r><w:t>Hello</w:t></w:r><w:r><w:t xml:space="preserve"> world &amp; co</w:t></w:r></w:p>' +
      "<w:p><w:r><w:t>a</w:t><w:tab/><w:t>b</w:t><w:br/><w:t>c</w:t></w:r></w:p>" +
      "<w:p/>" +
      "<w:p><w:r><w:t>Last</w:t></w:r></w:p>" +
      "</w:body></w:document>";
    const zip = zipSync({ "word/document.xml": strToU8(xml) });
    expect(extractDocx(zip)).toBe("Hello world & co\na\tb\nc\n\nLast\n");
  });

  it("throws a clear error when the file is not a Word document", () => {
    expect(() => extractDocx(zipSync({ "x.txt": strToU8("x") }))).toThrow(/Word/);
  });
});

describe("extractXlsx", () => {
  const workbook = (sheets: string[]) =>
    '<workbook xmlns:r="r"><sheets>' + sheets.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") + "</sheets></workbook>";
  const rels = (n: number) =>
    "<Relationships>" + Array.from({ length: n }, (_, i) => `<Relationship Id="rId${i + 1}" Target="worksheets/sheet${i + 1}.xml"/>`).join("") + "</Relationships>";
  const shared = '<sst><si><t>Name</t></si><si><t>Ann, Jr.</t></si><si><r><t>Bo</t></r><r><t>b</t></r></si></sst>';
  const sheet1 =
    '<worksheet><sheetData>' +
    '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="inlineStr"><is><t>Age</t></is></c></row>' +
    '<row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2"><v>41</v></c></row>' +
    '<row r="3"><c r="A3" t="s"><v>2</v></c><c r="C3" t="b"><v>1</v></c></row>' +
    "</sheetData></worksheet>";

  it("turns the sheet into CSV using shared strings", () => {
    const zip = zipSync({
      "xl/workbook.xml": strToU8(workbook(["People"])),
      "xl/_rels/workbook.xml.rels": strToU8(rels(1)),
      "xl/sharedStrings.xml": strToU8(shared),
      "xl/worksheets/sheet1.xml": strToU8(sheet1),
    });
    expect(extractXlsx(zip)).toBe('Name,Age,\n"Ann, Jr.",41,\nBob,,TRUE\n');
  });

  it("labels each sheet when there are several", () => {
    const zip = zipSync({
      "xl/workbook.xml": strToU8(workbook(["One", "Two"])),
      "xl/_rels/workbook.xml.rels": strToU8(rels(2)),
      "xl/worksheets/sheet1.xml": strToU8('<worksheet><sheetData><row r="1"><c r="A1"><v>1</v></c></row></sheetData></worksheet>'),
      "xl/worksheets/sheet2.xml": strToU8('<worksheet><sheetData><row r="1"><c r="A1"><v>2</v></c></row></sheetData></worksheet>'),
    });
    expect(extractXlsx(zip)).toBe("# Sheet: One\n1\n\n# Sheet: Two\n2\n");
  });
});
