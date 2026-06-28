import type { CSSProperties } from "react";
import { CFB, utils, type CellObject, type CellStyle, type CellStyleColor, type ColInfo, type Range, type WorkBook, type WorkSheet } from "xlsx-js-style";

export type HandsontableMergeCell = {
  row: number;
  col: number;
  rowspan: number;
  colspan: number;
};

export type HandsontableSheet = {
  data: string[][];
  mergeCells: HandsontableMergeCell[];
  colWidths: number[];
  cellStyles: Record<string, CSSProperties>;
};

export type HandsontableWorkbook = {
  sheetNames: string[];
  sheets: HandsontableSheet[];
};

type StyleTables = {
  CellXf?: Array<{
    fontId?: number | string;
    fontid?: number | string;
    fillId?: number | string;
    fillid?: number | string;
    borderId?: number | string;
    borderid?: number | string;
    applyFont?: boolean;
    applyFill?: boolean;
    applyBorder?: boolean;
    alignment?: CellStyle["alignment"];
  }>;
  Fonts?: Array<NonNullable<CellStyle["font"]>>;
  Fills?: Array<NonNullable<CellStyle["fill"]>>;
  Borders?: Array<NonNullable<CellStyle["border"]>>;
};

type ThemeWorkbook = WorkBook & {
  Styles?: StyleTables;
  Themes?: {
    themeElements?: {
      clrScheme?: Array<{ name?: string; rgb?: string }>;
    };
  };
};

const DEFAULT_COL_WIDTH_PX = 64;

function formatCellValue(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) {
    return value.toLocaleString("en-AU");
  }
  return String(value);
}

function rgbToCss(rgb?: string): string | undefined {
  if (!rgb) return undefined;
  const hex = rgb.replace(/^#/, "").slice(-6);
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return undefined;
  return `#${hex.toUpperCase()}`;
}

function applyTint(rgb: string, tint: number): string {
  const hex = rgb.replace(/^#/, "").slice(-6);
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);

  const transform = (channel: number) => {
    if (tint < 0) {
      return Math.round(channel * (1 + tint));
    }
    return Math.round(channel * (1 - tint) + 255 * tint);
  };

  const toHex = (value: number) =>
    Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");

  return `#${toHex(transform(r))}${toHex(transform(g))}${toHex(transform(b))}`.toUpperCase();
}

function resolveThemeColor(
  themeIndex: number,
  tint: number | undefined,
  workbook: ThemeWorkbook,
): string | undefined {
  const scheme = workbook.Themes?.themeElements?.clrScheme;
  if (!scheme?.[themeIndex]?.rgb) return undefined;
  const rgb = scheme[themeIndex].rgb!;
  if (tint != null && tint !== 0) {
    return applyTint(rgb, tint);
  }
  return rgbToCss(rgb);
}

function colorToCss(
  color: CellStyleColor | string | undefined,
  workbook: ThemeWorkbook,
): string | undefined {
  if (!color) return undefined;
  if (typeof color === "string") return rgbToCss(color);
  if (color.rgb) return rgbToCss(color.rgb);
  if (color.theme != null) {
    return resolveThemeColor(color.theme, color.tint, workbook);
  }
  return undefined;
}

function isDarkColor(color: string): boolean {
  const hex = color.replace("#", "");
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.45;
}

function ensureReadableTextColor(
  fontColor: string | undefined,
  backgroundColor: string | undefined,
): string | undefined {
  if (!fontColor || !backgroundColor) return fontColor;

  const fontIsDark = isDarkColor(fontColor);
  const backgroundIsDark = isDarkColor(backgroundColor);
  if (fontIsDark && backgroundIsDark) return "#FFFFFF";
  if (!fontIsDark && !backgroundIsDark) return "#000000";
  return fontColor;
}

function resolveFontColor(
  fontColor: CellStyleColor | string | undefined,
  backgroundColor: string | undefined,
  workbook: ThemeWorkbook,
): string | undefined {
  const explicit = colorToCss(fontColor, workbook);
  if (explicit) {
    return ensureReadableTextColor(explicit, backgroundColor);
  }

  if (
    fontColor &&
    typeof fontColor === "object" &&
    ("auto" in fontColor || fontColor.theme != null)
  ) {
    if (backgroundColor && isDarkColor(backgroundColor)) {
      return "#FFFFFF";
    }
    return "#000000";
  }

  if (!fontColor && backgroundColor && isDarkColor(backgroundColor)) {
    return "#FFFFFF";
  }

  return undefined;
}

function normalizeCellStyle(style: unknown): CellStyle | undefined {
  if (!style || typeof style !== "object") return undefined;

  const candidate = style as CellStyle & {
    fgColor?: CellStyleColor;
    bgColor?: CellStyleColor;
    patternType?: string;
  };

  if (candidate.font || candidate.alignment || candidate.border || candidate.fill) {
    return candidate;
  }

  if (candidate.fgColor || candidate.bgColor || candidate.patternType) {
    return {
      fill: {
        fgColor: candidate.fgColor,
        bgColor: candidate.bgColor,
        patternType: candidate.patternType as "solid" | "none" | undefined,
      },
    };
  }

  return candidate;
}

function styleId(value: number | string | undefined): number | undefined {
  if (value == null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function resolveStyleFromTables(
  styleIndex: number | undefined,
  styles: StyleTables | undefined,
): CellStyle | undefined {
  if (styleIndex == null || !styles?.CellXf?.[styleIndex]) return undefined;

  const xf = styles.CellXf[styleIndex];
  const fontId = styleId(xf.fontId ?? xf.fontid);
  const fillId = styleId(xf.fillId ?? xf.fillid);
  const borderId = styleId(xf.borderId ?? xf.borderid);

  const font =
    fontId != null && xf.applyFont !== false ? styles.Fonts?.[fontId] : undefined;
  const fill =
    fillId != null && xf.applyFill !== false ? styles.Fills?.[fillId] : undefined;
  const border =
    borderId != null && xf.applyBorder ? styles.Borders?.[borderId] : undefined;

  return {
    font,
    fill,
    border,
    alignment: xf.alignment,
  };
}

function resolveCellStyle(
  cell: CellObject | undefined,
  styleIndex: number | undefined,
  styles: StyleTables | undefined,
): CellStyle | undefined {
  return (
    resolveStyleFromTables(styleIndex, styles) ?? normalizeCellStyle(cell?.s)
  );
}

function borderSideToCss(
  side?: { color?: CellStyleColor | string; style?: string },
  workbook?: ThemeWorkbook,
): string | undefined {
  if (!side) return undefined;

  const color = (workbook ? colorToCss(side.color, workbook) : undefined) ?? "#000000";
  const width =
    side.style === "thick"
      ? "3px"
      : side.style === "medium" ||
          side.style === "mediumDashed" ||
          side.style === "mediumDashDot" ||
          side.style === "mediumDashDotDot"
        ? "2px"
        : "1px";
  const lineStyle =
    side.style === "dashed" ||
    side.style === "mediumDashed" ||
    side.style === "dashDot" ||
    side.style === "mediumDashDot" ||
    side.style === "mediumDashDotDot" ||
    side.style === "slantDashDot"
      ? "dashed"
      : side.style === "dotted" || side.style === "dashDotDot"
        ? "dotted"
        : "solid";

  return `${width} ${lineStyle} ${color}`;
}

function cellStyleToCss(
  styleInput: CellStyle | undefined,
  workbook: ThemeWorkbook,
): CSSProperties | undefined {
  if (!styleInput) return undefined;

  const css: CSSProperties = {};

  const fill = styleInput.fill;
  let backgroundColor: string | undefined;
  if (fill && fill.patternType !== "none") {
    backgroundColor =
      colorToCss(fill.fgColor, workbook) ?? colorToCss(fill.bgColor, workbook);
    if (backgroundColor) css.backgroundColor = backgroundColor;
  }

  const font = styleInput.font;
  if (font) {
    if (font.bold) css.fontWeight = "bold";
    if (font.italic) css.fontStyle = "italic";
    if (font.name) css.fontFamily = `"${font.name}", sans-serif`;

    const fontSize = Number(font.sz);
    if (Number.isFinite(fontSize) && fontSize > 0) {
      css.fontSize = `${fontSize}pt`;
    } else {
      css.fontSize = "11pt";
    }

    const fontColor = resolveFontColor(font.color, backgroundColor, workbook);
    if (fontColor) css.color = fontColor;

    const decorations: string[] = [];
    if (font.underline) decorations.push("underline");
    if (font.strike) decorations.push("line-through");
    if (decorations.length > 0) css.textDecoration = decorations.join(" ");
  }

  const alignment = styleInput.alignment;
  if (alignment) {
    if (alignment.horizontal) {
      css.textAlign = alignment.horizontal;
    }
    if (alignment.vertical) {
      css.verticalAlign = alignment.vertical;
    }
    if (alignment.wrapText === false) {
      css.whiteSpace = "nowrap";
    } else if (alignment.wrapText) {
      css.whiteSpace = "pre-wrap";
    }
  }

  const border = styleInput.border;
  if (border) {
    const top = borderSideToCss(border.top, workbook);
    const right = borderSideToCss(border.right, workbook);
    const bottom = borderSideToCss(border.bottom, workbook);
    const left = borderSideToCss(border.left, workbook);
    if (top) css.borderTop = top;
    if (right) css.borderRight = right;
    if (bottom) css.borderBottom = bottom;
    if (left) css.borderLeft = left;
  }

  return Object.keys(css).length > 0 ? css : undefined;
}

function getCellDisplayValue(cell?: CellObject): string {
  if (!cell) return "";
  if (cell.w != null && cell.w !== "") return String(cell.w);
  return formatCellValue(cell.v);
}

function getSheetBounds(sheet: WorkSheet): Range {
  const ref = sheet["!ref"];
  const range = ref
    ? utils.decode_range(ref)
    : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };

  for (const merge of sheet["!merges"] ?? []) {
    range.s.r = Math.min(range.s.r, merge.s.r);
    range.s.c = Math.min(range.s.c, merge.s.c);
    range.e.r = Math.max(range.e.r, merge.e.r);
    range.e.c = Math.max(range.e.c, merge.e.c);
  }

  return range;
}

function colInfoToPixels(col: ColInfo | undefined): number {
  if (!col) return DEFAULT_COL_WIDTH_PX;
  if (col.wpx && col.wpx > 0) return Math.round(col.wpx);
  const mdw = col.MDW ?? 7;
  if (col.wch && col.wch > 0) return Math.round(col.wch * mdw + 5);
  if (col.width && col.width > 0) return Math.round((col.width * mdw) / 256 + 5);
  return DEFAULT_COL_WIDTH_PX;
}

function getColumnWidths(
  sheet: WorkSheet,
  startCol: number,
  colCount: number,
): number[] {
  const cols = sheet["!cols"] ?? [];
  return Array.from({ length: colCount }, (_, index) =>
    colInfoToPixels(cols[startCol + index]),
  );
}

function toBinaryInput(buffer: ArrayBuffer | Uint8Array): Uint8Array {
  return buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
}

function parseCellAddress(attrs: string): string | undefined {
  const raw = attrs.match(/\br="([^"]+)"/i)?.[1];
  if (!raw) return undefined;
  return raw.replace(/\$/g, "").toUpperCase();
}

function extractCellStyleIndices(
  buffer: ArrayBuffer | Uint8Array,
  sheetIndex: number,
): Map<string, number> {
  const styleIndices = new Map<string, number>();

  try {
    const cfb = CFB.read(toBinaryInput(buffer), { type: "array" });
    const entry = CFB.find(cfb, `/xl/worksheets/sheet${sheetIndex + 1}.xml`);
    if (!entry?.content) return styleIndices;

    const content = entry.content as string | ArrayBuffer | Uint8Array;
    const xml =
      typeof content === "string"
        ? content
        : new TextDecoder().decode(
            content instanceof Uint8Array ? content : new Uint8Array(content),
          );

    for (const match of xml.matchAll(/<(?:\w+:)?c\b([^>]*)\/?>/g)) {
      const attrs = match[1];
      const address = parseCellAddress(attrs);
      const style = attrs.match(/\bs="(\d+)"/)?.[1];
      if (address) {
        styleIndices.set(address, style ? Number(style) : 0);
      }
    }
  } catch {
    return styleIndices;
  }

  return styleIndices;
}

function trimSheetGrid(
  data: string[][],
  cellStyles: Record<string, CSSProperties>,
  mergeCells: HandsontableMergeCell[],
  colWidths: number[],
): HandsontableSheet {
  if (data.length === 0) {
    return { data: [], mergeCells: [], colWidths: [], cellStyles: {} };
  }

  const mergedCells = new Set<string>();
  for (const merge of mergeCells) {
    for (let row = merge.row; row < merge.row + merge.rowspan; row += 1) {
      for (let col = merge.col; col < merge.col + merge.colspan; col += 1) {
        mergedCells.add(`${row},${col}`);
      }
    }
  }

  let lastRow = data.length - 1;
  while (lastRow >= 0) {
    const rowIsEmpty = data[lastRow].every((value, colIndex) => {
      if (mergedCells.has(`${lastRow},${colIndex}`)) return false;
      return !value && !cellStyles[`${lastRow},${colIndex}`];
    });
    if (!rowIsEmpty) break;
    lastRow -= 1;
  }

  const trimmedData = data.slice(0, lastRow + 1);
  if (trimmedData.length === 0) {
    return { data: [], mergeCells: [], colWidths: [], cellStyles: {} };
  }

  let lastCol = trimmedData[0].length - 1;
  while (lastCol >= 0) {
    const colIsEmpty = trimmedData.every((row, rowIndex) => {
      if (mergedCells.has(`${rowIndex},${lastCol}`)) return false;
      return !row[lastCol] && !cellStyles[`${rowIndex},${lastCol}`];
    });
    if (!colIsEmpty) break;
    lastCol -= 1;
  }

  const nextData = trimmedData.map((row) => row.slice(0, lastCol + 1));
  const nextColWidths = colWidths.slice(0, lastCol + 1);
  const nextStyles: Record<string, CSSProperties> = {};
  const nextMerges: HandsontableMergeCell[] = [];

  for (const [key, style] of Object.entries(cellStyles)) {
    const [row, col] = key.split(",").map(Number);
    if (row <= lastRow && col <= lastCol) {
      nextStyles[`${row},${col}`] = style;
    }
  }

  for (const merge of mergeCells) {
    if (merge.row <= lastRow && merge.col <= lastCol) {
      nextMerges.push(merge);
    }
  }

  return {
    data: nextData,
    mergeCells: nextMerges,
    colWidths: nextColWidths,
    cellStyles: nextStyles,
  };
}

function parseSheet(
  sheet: WorkSheet,
  workbook: ThemeWorkbook,
  styleIndices: Map<string, number>,
): HandsontableSheet {
  const bounds = getSheetBounds(sheet);
  const styles = workbook.Styles;
  const rowCount = bounds.e.r - bounds.s.r + 1;
  const colCount = bounds.e.c - bounds.s.c + 1;
  const data: string[][] = [];
  const cellStyles: Record<string, CSSProperties> = {};
  const mergeCells: HandsontableMergeCell[] = [];

  for (const merge of sheet["!merges"] ?? []) {
    mergeCells.push({
      row: merge.s.r - bounds.s.r,
      col: merge.s.c - bounds.s.c,
      rowspan: merge.e.r - merge.s.r + 1,
      colspan: merge.e.c - merge.s.c + 1,
    });
  }

  for (let rowOffset = 0; rowOffset < rowCount; rowOffset += 1) {
    const rowIndex = bounds.s.r + rowOffset;
    const row: string[] = [];

    for (let colOffset = 0; colOffset < colCount; colOffset += 1) {
      const colIndex = bounds.s.c + colOffset;
      const address = utils.encode_cell({ r: rowIndex, c: colIndex });
      const cell = sheet[address] as CellObject | undefined;
      const resolvedStyle = resolveCellStyle(
        cell,
        styleIndices.get(address) ?? (cell ? 0 : undefined),
        styles,
      );
      const css = cellStyleToCss(resolvedStyle, workbook);

      if (css) {
        cellStyles[`${rowOffset},${colOffset}`] = css;
      }

      row.push(getCellDisplayValue(cell));
    }

    data.push(row);
  }

  return trimSheetGrid(
    data,
    cellStyles,
    mergeCells,
    getColumnWidths(sheet, bounds.s.c, colCount),
  );
}

export function parseWorkbookForHandsontable(
  workbook: WorkBook,
  buffer: ArrayBuffer | Uint8Array,
): HandsontableWorkbook {
  const sheetNames = workbook.SheetNames;
  const sheets = sheetNames.map((sheetName, sheetIndex) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      return { data: [], mergeCells: [], colWidths: [], cellStyles: {} };
    }

    const styleIndices = extractCellStyleIndices(buffer, sheetIndex);
    return parseSheet(sheet, workbook as ThemeWorkbook, styleIndices);
  });

  return { sheetNames, sheets };
}

/** @deprecated Use parseWorkbookForHandsontable */
export const parseWorkbook = parseWorkbookForHandsontable;

export type ParsedSheet = HandsontableSheet;
export type ParsedWorkbook = HandsontableWorkbook;
