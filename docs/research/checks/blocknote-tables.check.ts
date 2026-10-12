/**
 * THROWAWAY CHECK for research ticket #29, "Can BlockNote hold the skeleton's
 * tables". Not app code: it changes nothing in src/ and is not in the app's
 * test suite. Delete it once the findings are used.
 *
 * A headless BlockNote 0.54.2 editor over the app's real block, inline and
 * style configs (as src/editor/headless.ts builds them) plus BlockNote's
 * default `table` block. Each `describe` answers one of the ticket's five
 * questions. Findings: docs/research/2026-09-24-engine-libraries.md,
 * "BlockNote tables".
 *
 * Run: pnpm exec vitest run --config docs/research/checks/vitest.config.ts
 */
import {
  BlockNoteEditor,
  BlockNoteSchema,
  createBlockSpec,
  createInlineContentSpec,
  createStyleSpec,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
  type BlockConfig,
  type PropSchema,
} from "@blocknote/core"
import type { Node as PMNode } from "@tiptap/pm/model"
import { TextSelection, type Command } from "@tiptap/pm/state"
import {
  addColumnAfter,
  addRowAfter,
  addRowBefore,
  deleteRow,
  goToNextCell,
  moveTableRow,
} from "@tiptap/pm/tables"
import type { Step } from "@tiptap/pm/transform"
import { describe, expect, it } from "vitest"

import { documentToBrief } from "@/brief/from-document"
import { sectionHeading } from "@/brief/to-document"
import { installLockGuard } from "@/editor/extensions"
import {
  fieldParagraph,
  hasHiddenStyle,
  walkSections,
} from "@/editor/field-line"
import { inlineToText } from "@/editor/inline-text"
import {
  briefBlockConfigs,
  entryBlockConfigs,
  entryGroupConfig,
  entryMentionConfig,
  hiddenStyleConfig,
  type SandsBlock,
} from "@/editor/schema-config"

// The schema: the app's headless schema plus BlockNote's default table block.

const noRender = () => ({ dom: {} as HTMLElement })

function spec<
  const T extends string,
  const P extends PropSchema,
  const C extends "inline" | "none",
>(config: BlockConfig<T, P, C>) {
  return createBlockSpec(config, { render: noRender })()
}

const schema = BlockNoteSchema.create({
  blockSpecs: {
    paragraph: defaultBlockSpecs.paragraph,
    heading: defaultBlockSpecs.heading,
    table: defaultBlockSpecs.table,
    entryGroup: spec(entryGroupConfig),
    ...Object.fromEntries(
      Object.entries({ ...briefBlockConfigs, ...entryBlockConfigs }).map(
        ([type, config]) => [type, spec(config)]
      )
    ),
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    entryMention: createInlineContentSpec(entryMentionConfig, {
      render: noRender,
    }),
  },
  styleSpecs: {
    ...defaultStyleSpecs,
    hidden: createStyleSpec(hiddenStyleConfig, { render: noRender }),
  },
})

// Loose JSON shapes for what the check reads back.

type Styles = Record<string, boolean>
type TextNode = { type: "text"; text: string; styles: Styles }
type CellJson = {
  type: "tableCell"
  props: Record<string, unknown>
  content: TextNode[]
}
type TableJson = {
  type: "tableContent"
  columnWidths: (number | undefined)[]
  headerRows?: number
  rows: { cells: CellJson[] }[]
}
type BlockJson = {
  id: string
  type: string
  props: Record<string, unknown>
  content?: unknown
  children: BlockJson[]
}

/**
 * An unmounted editor's state has no plugins: TipTap 3 attaches them when it
 * creates the view (Editor.createView: `state.reconfigure({ plugins })`), so
 * without this no filterTransaction (onBeforeChange) or appendTransaction
 * (prosemirror-tables' fixTables) would run. This does the same reconfigure
 * without a DOM. Plugin views (table handles) still do not exist.
 */
function makeEditor(blocks: readonly BlockJson[]) {
  const editor = BlockNoteEditor.create({
    schema,
    initialContent: blocks as never,
    trailingBlock: false,
  })
  const tiptap = editor._tiptapEditor
  tiptap.view.updateState(
    tiptap.state.reconfigure({ plugins: tiptap.extensionManager.plugins })
  )
  return editor
}
type Editor = ReturnType<typeof makeEditor>

function doc(editor: Editor): BlockJson[] {
  return editor.document as unknown as BlockJson[]
}

function tableBlock(editor: Editor, id: string): BlockJson {
  const find = (blocks: BlockJson[]): BlockJson | undefined => {
    for (const block of blocks) {
      if (block.id === id) return block
      const inner = find(block.children)
      if (inner) return inner
    }
    return undefined
  }
  const block = find(doc(editor))
  if (!block) throw new Error(`no block ${id}`)
  return block
}

// A typed table: the skeleton's Promises table, read and written as rows.

type Value = { text: string; hidden: boolean }
const v = (text: string, hidden = false): Value => ({ text, hidden })

const PROMISE_COLUMNS = [
  { key: "promise", label: "Promise" },
  { key: "setup", label: "Setup" },
  { key: "payoff", label: "Payoff" },
  { key: "notBefore", label: "Not before" },
] as const
type PromiseKey = (typeof PROMISE_COLUMNS)[number]["key"]
type PromiseRow = Record<PromiseKey, Value>

const ROWS: PromiseRow[] = [
  {
    promise: v("The locked chest"),
    setup: v("Seen in the first scene"),
    payoff: v("It holds the deed", true),
    notBefore: v("Arc 2"),
  },
  {
    promise: v("The stranger's name"),
    setup: v("He gives a false one\nThen a second"),
    payoff: v("The ferryman says it", true),
    notBefore: v(""),
  },
  {
    promise: v("The broken bell"),
    setup: v("Rung once at dawn"),
    payoff: v("It rings at the end"),
    notBefore: v("Arc 3"),
  },
]

function cell(content: TextNode[]): CellJson {
  return { type: "tableCell", props: {}, content }
}
function text(value: string, styles: Styles = {}): TextNode[] {
  return value ? [{ type: "text", text: value, styles }] : []
}

/** Typed rows -> a table block with one header row of column titles. */
function promisesTable(id: string, rows: PromiseRow[]): BlockJson {
  return {
    id,
    type: "table",
    props: { textColor: "default" },
    content: {
      type: "tableContent",
      columnWidths: PROMISE_COLUMNS.map(() => undefined),
      headerRows: 1,
      rows: [
        { cells: PROMISE_COLUMNS.map((column) => cell(text(column.label))) },
        ...rows.map((row) => ({
          cells: PROMISE_COLUMNS.map((column) => {
            const value = row[column.key]
            return cell(text(value.text, value.hidden ? { hidden: true } : {}))
          }),
        })),
      ],
    } satisfies TableJson,
    children: [],
  }
}

/** A table block -> typed rows, using the app's own inline readers. */
function readPromises(block: BlockJson) {
  const table = block.content as TableJson
  const [header, ...body] = table.rows
  const headerOk = PROMISE_COLUMNS.every(
    (column, index) =>
      inlineToText(header.cells[index]?.content).trim().toLowerCase() ===
      column.label.toLowerCase()
  )
  const rows = body.map(
    (row) =>
      Object.fromEntries(
        PROMISE_COLUMNS.map((column, index) => {
          const content = row.cells[index]?.content ?? []
          return [
            column.key,
            { text: inlineToText(content), hidden: hasHiddenStyle(content) },
          ]
        })
      ) as PromiseRow
  )
  return { headerOk, headerRows: table.headerRows, rows }
}

function simpleTable(id: string, rows: string[][]): BlockJson {
  return {
    id,
    type: "table",
    props: { textColor: "default" },
    content: {
      type: "tableContent",
      columnWidths: rows[0].map(() => undefined),
      headerRows: 1,
      rows: rows.map((row) => ({
        cells: row.map((value) => cell(text(value))),
      })),
    } satisfies TableJson,
    children: [],
  }
}

// ProseMirror positions of a cell's text, for placing a cursor or selection.

function cellRange(editor: Editor, tableId: string, row: number, col: number) {
  const state = editor.prosemirrorState
  let found: { from: number; to: number } | undefined
  state.doc.descendants((node, pos) => {
    if (found) return false
    if (node.type.name !== "blockContainer" || node.attrs.id !== tableId)
      return true
    const table = node.firstChild!
    let rowPos = pos + 2
    table.forEach((rowNode, rowOffset, rowIndex) => {
      if (rowIndex !== row) return
      rowPos = pos + 2 + rowOffset
      rowNode.forEach((cellNode, cellOffset, cellIndex) => {
        if (cellIndex !== col) return
        const paragraph = cellNode.firstChild!
        const from = rowPos + 1 + cellOffset + 2
        found = { from, to: from + paragraph.content.size }
      })
    })
    return false
  })
  if (!found) throw new Error(`no cell ${row},${col} in ${tableId}`)
  return found
}

/** Positions of a non-table block's inline content. */
function blockTextRange(editor: Editor, id: string) {
  let found: { from: number; to: number } | undefined
  editor.prosemirrorState.doc.descendants((node, pos) => {
    if (found) return false
    if (node.type.name !== "blockContainer" || node.attrs.id !== id) return true
    found = { from: pos + 2, to: pos + 2 + node.firstChild!.content.size }
    return false
  })
  if (!found) throw new Error(`no block ${id}`)
  return found
}

function select(editor: Editor, from: number, to = from) {
  editor.transact((tr) => {
    tr.setSelection(TextSelection.create(tr.doc, from, to))
  })
}

function cursorIn(editor: Editor, tableId: string, row: number, col = 0) {
  select(editor, cellRange(editor, tableId, row, col).to)
}

function run(editor: Editor, command: Command) {
  return editor.exec(command)
}

// Row locks. A table row has no id or attributes in BlockNote's JSON (it is
// rebuilt as `tableRow.createChecked({}, cells)`), so a lock must name the row
// by content: here, the text of its first cell.

const rowKey = (row: PMNode) => row.firstChild?.textContent.trim() ?? ""

function lockedRows(docNode: PMNode, locked: ReadonlySet<string>) {
  const rows: { key: string; node: PMNode; from: number; to: number }[] = []
  docNode.descendants((node, pos) => {
    if (node.type.name !== "tableRow") return true
    const key = rowKey(node)
    if (locked.has(key))
      rows.push({ key, node, from: pos, to: pos + node.nodeSize })
    return false
  })
  return rows
}

/** Ranges a step touches. Mark steps have an empty step map, so read their JSON. */
function touched(step: Step): [number, number][] {
  const json = step.toJSON() as {
    stepType?: string
    from?: number
    to?: number
    pos?: number
  }
  if (json.stepType === "addMark" || json.stepType === "removeMark")
    return [[json.from!, json.to!]]
  if (
    json.stepType === "attr" ||
    json.stepType === "addNodeMark" ||
    json.stepType === "removeNodeMark"
  )
    return [[json.pos!, json.pos! + 1]]
  const ranges: [number, number][] = []
  step.getMap().forEach((from, to) => ranges.push([from, to]))
  return ranges
}

/** Guard A: today's design (refuse any step whose range enters a locked node), applied to rows. */
function installRangeGuard(editor: Editor, locked: ReadonlySet<string>) {
  return editor.onBeforeChange(({ tr }) => {
    if (!tr.docChanged) return true
    return tr.steps.every((step, index) => {
      const rows = lockedRows(tr.docs[index], locked)
      return touched(step).every(
        ([from, to]) => !rows.some((row) => from < row.to && to > row.from)
      )
    })
  })
}

/** Guard B: an invariant. Every locked row must still exist, unchanged, after the transaction. */
function installInvariantGuard(editor: Editor, locked: ReadonlySet<string>) {
  return editor.onBeforeChange(({ tr }) => {
    if (!tr.docChanged) return true
    const after = lockedRows(tr.doc, locked)
    return lockedRows(tr.before, locked).every((row) =>
      after.some((other) => other.key === row.key && other.node.eq(row.node))
    )
  })
}

const TABLE = "promises"
const LOCKED = new Set(["The locked chest"])

/** Row indices in the table: 0 header, 1 chest (locked), 2 stranger, 3 bell. */
type Operation = (editor: Editor) => void
const OPERATIONS: Record<string, Operation> = {
  "type in the locked row": (editor) => {
    const { to } = cellRange(editor, TABLE, 1, 1)
    editor.transact((tr) => tr.insertText("!", to))
  },
  "type in an unlocked row": (editor) => {
    const { to } = cellRange(editor, TABLE, 2, 1)
    editor.transact((tr) => tr.insertText("!", to))
  },
  "toggle Hidden in the locked row": (editor) => {
    const { from, to } = cellRange(editor, TABLE, 1, 1)
    select(editor, from, to)
    editor.toggleStyles({ hidden: true })
  },
  "delete the locked row": (editor) => {
    cursorIn(editor, TABLE, 1)
    run(editor, deleteRow)
  },
  "delete an unlocked row": (editor) => {
    cursorIn(editor, TABLE, 3)
    run(editor, deleteRow)
  },
  "add a row right after the locked row": (editor) => {
    cursorIn(editor, TABLE, 2)
    run(editor, addRowBefore)
  },
  "move an unlocked row past the locked row (prosemirror-tables)": (editor) => {
    cursorIn(editor, TABLE, 3)
    run(editor, moveTableRow({ from: 3, to: 1 }))
  },
  "move an unlocked row, not crossing the locked row (prosemirror-tables)": (
    editor
  ) => {
    cursorIn(editor, TABLE, 3)
    run(editor, moveTableRow({ from: 3, to: 2 }))
  },
  "move an unlocked row past the locked row (BlockNote drag path)": (
    editor
  ) => {
    // TableHandlesView.dropHandler: moveRow(), then updateBlock() with the new rows.
    const block = tableBlock(editor, TABLE)
    const table = block.content as TableJson
    const rows = [...table.rows]
    const [moved] = rows.splice(3, 1)
    rows.splice(1, 0, moved)
    editor.updateBlock(TABLE, {
      type: "table",
      content: { ...table, rows },
    } as never)
  },
  "add a column": (editor) => {
    cursorIn(editor, TABLE, 2, 3)
    run(editor, addColumnAfter)
  },
}

function outcome(guard: "range" | "invariant", name: string) {
  const editor = makeEditor([promisesTable(TABLE, ROWS)])
  const before = JSON.stringify(doc(editor))
  if (guard === "range") installRangeGuard(editor, LOCKED)
  else installInvariantGuard(editor, LOCKED)
  OPERATIONS[name](editor)
  return JSON.stringify(doc(editor)) === before ? "refused" : "applied"
}

describe("1. The Hidden style inside a table cell", () => {
  it("survives BlockNote's schema: a Hidden value in a cell keeps the style", () => {
    const editor = makeEditor([promisesTable(TABLE, ROWS)])
    const table = tableBlock(editor, TABLE).content as TableJson
    expect(table.rows[1].cells[2].content).toEqual([
      { type: "text", text: "It holds the deed", styles: { hidden: true } },
    ])
  })

  it("the app's Mod-Shift-h call (toggleStyles) applies Hidden to a selection in a cell", () => {
    const editor = makeEditor([promisesTable(TABLE, ROWS)])
    const { from, to } = cellRange(editor, TABLE, 3, 2)
    select(editor, from, to)
    editor.toggleStyles({ hidden: true })
    const { rows } = readPromises(tableBlock(editor, TABLE))
    expect(rows[2].payoff).toEqual({
      text: "It rings at the end",
      hidden: true,
    })
  })

  it("Hidden on part of a cell is kept as split text, the same as in a field", () => {
    const editor = makeEditor([promisesTable(TABLE, ROWS)])
    const { from } = cellRange(editor, TABLE, 3, 0)
    select(editor, from + 4, from + 10)
    editor.toggleStyles({ hidden: true })
    const table = tableBlock(editor, TABLE).content as TableJson
    expect(table.rows[3].cells[0].content).toEqual([
      { type: "text", text: "The ", styles: {} },
      { type: "text", text: "broken", styles: { hidden: true } },
      { type: "text", text: " bell", styles: {} },
    ])
  })
})

describe("2. Conversion round trip: rows -> table block -> rows", () => {
  it("reads back the same typed rows, Hidden and multi-line values included", () => {
    const editor = makeEditor([promisesTable(TABLE, ROWS)])
    const read = readPromises(tableBlock(editor, TABLE))
    expect(read.headerOk).toBe(true)
    expect(read.headerRows).toBe(1)
    expect(read.rows).toEqual(ROWS)
  })

  it("BlockNote's stored document is stable: loading it again changes nothing", () => {
    const first = doc(makeEditor([promisesTable(TABLE, ROWS)]))
    const second = doc(makeEditor(first))
    expect(second).toEqual(first)
  })

  it("an edit in a cell reads back as an edit of that row's field", () => {
    const editor = makeEditor([promisesTable(TABLE, ROWS)])
    const { to } = cellRange(editor, TABLE, 3, 3)
    editor.transact((tr) => tr.insertText(", late", to))
    expect(readPromises(tableBlock(editor, TABLE)).rows[2].notBefore).toEqual(
      v("Arc 3, late")
    )
  })

  it("rows carry no id: BlockNote's JSON for a row is only its cells", () => {
    const editor = makeEditor([promisesTable(TABLE, ROWS)])
    const table = tableBlock(editor, TABLE).content as TableJson
    expect(Object.keys(table.rows[1])).toEqual(["cells"])
  })
})

describe("3. A locked row refuses edits by filtering transactions", () => {
  it("both guards refuse every edit to the locked row; only the invariant guard allows moving rows", () => {
    const observed: Record<string, { range: string; invariant: string }> = {}
    for (const name of Object.keys(OPERATIONS))
      observed[name] = {
        range: outcome("range", name),
        invariant: outcome("invariant", name),
      }
    console.table(observed)

    const both = (result: string) => ({ range: result, invariant: result })
    const movesBlockedByRange = { range: "refused", invariant: "applied" }
    expect(observed).toEqual({
      "type in the locked row": both("refused"),
      "type in an unlocked row": both("applied"),
      "toggle Hidden in the locked row": both("refused"),
      "delete the locked row": both("refused"),
      "delete an unlocked row": both("applied"),
      "add a row right after the locked row": both("applied"),
      // prosemirror-tables' moveRow replaces the whole table node, and
      // BlockNote's drag path (updateBlock) replaces every row between the two
      // indices: a range guard sees the locked row touched even when it is not.
      "move an unlocked row past the locked row (prosemirror-tables)":
        movesBlockedByRange,
      "move an unlocked row, not crossing the locked row (prosemirror-tables)":
        movesBlockedByRange,
      "move an unlocked row past the locked row (BlockNote drag path)":
        movesBlockedByRange,
      "add a column": both("refused"),
    })
  })

  it("today's installLockGuard refuses typing in a locked Entry but not a style change (mark steps have an empty step map)", () => {
    const editor = makeEditor([
      {
        id: "clue",
        type: "clueEntry",
        props: {
          entryId: "e1",
          source: "author",
          status: "locked",
          sourceTurn: -1,
          jevFlags: "[]",
        },
        content: text("The ledger"),
        children: [],
      },
      fieldParagraph("f1", "Description", "A torn page.") as BlockJson,
    ])
    installLockGuard(editor as never)
    const before = JSON.stringify(doc(editor))
    const changed = () =>
      JSON.stringify(doc(editor)) === before ? "refused" : "applied"
    const field = blockTextRange(editor, "f1")

    editor.transact((tr) => tr.insertText("!", field.to))
    const typed = changed()

    select(editor, field.to - 5, field.to)
    editor.toggleStyles({ hidden: true })
    const styled = changed()

    expect({ typed, styled }).toEqual({ typed: "refused", styled: "applied" })
    expect(doc(editor)[1].content).toContainEqual({
      type: "text",
      text: "page.",
      styles: { hidden: true },
    })
  })
})

describe("4. Rows from the keyboard: the commands exist; no default keys", () => {
  it("add, remove and reorder rows with a text cursor in a cell", () => {
    const editor = makeEditor([promisesTable(TABLE, ROWS)])
    const keys = () =>
      (tableBlock(editor, TABLE).content as TableJson).rows.map((row) =>
        inlineToText(row.cells[0].content)
      )

    cursorIn(editor, TABLE, 2)
    expect(run(editor, addRowAfter)).toBe(true)
    expect(keys()).toEqual([
      "Promise",
      "The locked chest",
      "The stranger's name",
      "",
      "The broken bell",
    ])

    cursorIn(editor, TABLE, 3)
    expect(run(editor, deleteRow)).toBe(true)
    expect(keys()).toHaveLength(4)

    cursorIn(editor, TABLE, 3)
    expect(run(editor, moveTableRow({ from: 3, to: 2 }))).toBe(true)
    expect(keys()).toEqual([
      "Promise",
      "The locked chest",
      "The broken bell",
      "The stranger's name",
    ])

    cursorIn(editor, TABLE, 1)
    expect(run(editor, addRowBefore)).toBe(true)
    expect(keys()[1]).toBe("")
  })

  it("Tab in the last cell does not add a row: goToNextCell(1) has nowhere to go", () => {
    const editor = makeEditor([promisesTable(TABLE, ROWS)])
    cursorIn(editor, TABLE, 3, 3)
    expect(run(editor, goToNextCell(1))).toBe(false)
    expect((tableBlock(editor, TABLE).content as TableJson).rows).toHaveLength(
      4
    )
  })
})

describe("5. A table in a section run under a custom heading block", () => {
  const AGENDA = [
    ["Character", "Want this arc", "Steps, in order", "If blocked"],
    ["The ferryman", "Be paid twice", "Ask\nRefuse\nBargain", "Sink the boat"],
  ]

  it("BlockNote holds a table as the next sibling of a custom heading and its fields", () => {
    const blocks = [
      sectionHeading("arc", "arc-1", { name: "The crossing" }),
      fieldParagraph("f-desc", "Description", "Reach the far bank."),
      simpleTable("agenda-1", AGENDA),
    ] as BlockJson[]
    const stored = doc(makeEditor(blocks))
    expect(stored.map((block) => block.type)).toEqual([
      "arc",
      "paragraph",
      "table",
    ])
  })

  it("BlockNote also holds a table as a child of a custom heading", () => {
    const heading = sectionHeading("arc", "arc-1", {
      name: "The crossing",
    }) as BlockJson
    const stored = doc(
      makeEditor([{ ...heading, children: [simpleTable("agenda-1", AGENDA)] }])
    )
    expect(stored[0].type).toBe("arc")
    expect(stored[0].children.map((block) => block.type)).toEqual(["table"])
  })

  it("today's walkSections ends the section at the table, and documentToBrief drops it", () => {
    const blocks = doc(
      makeEditor([
        sectionHeading("arc", "arc-1", { name: "The crossing" }),
        fieldParagraph("f-desc", "Description", "Reach the far bank."),
        simpleTable("agenda-1", AGENDA),
        fieldParagraph("f-exit", "Exit condition", "They land."),
      ] as BlockJson[])
    ) as unknown as SandsBlock[]

    const walked = walkSections(
      blocks,
      (block): block is SandsBlock => block.type === "arc"
    )
    expect(
      walked.map((item) =>
        item.type === "section" ? "section" : `prose:${item.block.type}`
      )
    ).toEqual(["section", "prose:table", "prose:paragraph"])

    const { draft } = documentToBrief(blocks)
    expect(draft.arcs[0].exitConditions).toEqual([])
    expect(JSON.stringify(draft)).not.toContain("ferryman")
  })
})
