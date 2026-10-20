/** @jsxImportSource @opentui/solid */
import { Plugin } from "@opencode/plugin/tui"
import { createEffect, createMemo, createRoot, Show } from "solid-js"
import { fitGamut, hex, MARK_COUNT, MARKS, markColor, textColor } from "./color.ts"

interface Assignments {
  sessions: Record<string, number>
  marks?: boolean
}

// Storage is shared live by every open TUI, so old sessions are dropped by age, not by what this TUI has open.
const MAX_REMEMBERED_SESSIONS = 200

function lowestFree(used: number[]): number {
  let index = 0
  while (used.includes(index)) index++
  return index
}

function stripMark(title: string): string {
  const mark = MARKS.find((candidate) => title.startsWith(`${candidate} `))
  return mark ? title.slice(mark.length + 1) : title
}

function SessionBar(props: { readonly index: number | undefined; readonly title: string | undefined }) {
  const style = createMemo(() => {
    if (props.index === undefined) return undefined
    const color = fitGamut(markColor(props.index))
    return { background: hex(color), foreground: textColor(color).hex, label: props.title ? stripMark(props.title) : "New session" }
  })

  return (
    <Show when={style()}>
      {(current) => (
        <box backgroundColor={current().background} paddingLeft={1} paddingRight={1} height={1} flexShrink={0}>
          <text fg={current().foreground}>{current().label}</text>
        </box>
      )}
    </Show>
  )
}

export default Plugin.define({
  id: "mrakodrap.tab-colors",
  setup(context) {
    const [state, update] = context.storage.store<Assignments>("tab-marks", { initial: { sessions: {} } })
    const requestedTitles = new Set<string>()

    const indexOf = (sessionID: string) => {
      const index = state.sessions[sessionID]
      return index === undefined ? undefined : index % MARK_COUNT
    }

    const openSessions = (): string[] => {
      if (context.ui.tabs.enabled()) return context.ui.tabs.list().map((tab) => tab.sessionID)
      const route = context.ui.router.current()
      return route.type === "session" ? [route.sessionID] : []
    }

    // On a clash the larger session ID moves, so every TUI picks the same tab to recolor.
    const needsIndex = (sessionID: string, open: string[]) => {
      const index = indexOf(sessionID)
      return index === undefined || open.some((other) => other < sessionID && indexOf(other) === index)
    }

    const assign = (open: string[]) => {
      const pending = open.filter((sessionID) => needsIndex(sessionID, open))
      if (pending.length === 0) return
      void update((draft) => {
        const taken = open.filter((id) => !pending.includes(id) && draft.sessions[id] !== undefined).map((id) => draft.sessions[id] % MARK_COUNT)
        for (const sessionID of pending) {
          const index = taken.length < MARK_COUNT ? lowestFree(taken) : taken.length % MARK_COUNT
          delete draft.sessions[sessionID]
          draft.sessions[sessionID] = index
          taken.push(index)
        }
        const remembered = Object.keys(draft.sessions)
        for (const id of remembered.slice(0, Math.max(0, remembered.length - MAX_REMEMBERED_SESSIONS))) {
          if (!open.includes(id)) delete draft.sessions[id]
        }
      })
    }

    const setTitle = (sessionID: string, title: string) => {
      const key = `${sessionID}\n${title}`
      if (requestedTitles.has(key)) return
      requestedTitles.add(key)
      void context.client.session
        .update({ sessionID, title })
        .catch(() => undefined)
        .finally(() => requestedTitles.delete(key))
    }

    // The tab strip only shows the session title, so the mark goes there; a regenerated title gets it back.
    const mark = (sessionID: string) => {
      const title = context.data.session.get(sessionID)?.title
      if (!title) return
      const base = stripMark(title)
      const index = indexOf(sessionID)
      const wanted = state.marks === false || index === undefined ? base : `${MARKS[index]} ${base}`
      if (wanted !== title) setTitle(sessionID, wanted)
    }

    const dispose = createRoot((dispose) => {
      createEffect(() => {
        const open = openSessions()
        assign(open)
        for (const sessionID of open) mark(sessionID)
      })
      return dispose
    })

    context.keymap.layer(() => ({
      mode: "global",
      commands: [
        {
          id: "tab-colors.marks.toggle",
          title: state.marks === false ? "Show tab color marks" : "Hide tab color marks",
          group: "Tab colors",
          palette: true,
          run: async () => {
            const hide = state.marks !== false
            await update((draft) => {
              draft.marks = !hide
            })
            if (!hide) return
            for (const session of context.data.session.list()) {
              if (session.title && stripMark(session.title) !== session.title) setTitle(session.id, stripMark(session.title))
            }
          },
        },
      ],
    }))

    const removeSlot = context.ui.slot({
      prepend: "session.composer.top",
      render: (input) => <SessionBar index={indexOf(input.sessionID)} title={context.data.session.get(input.sessionID)?.title} />,
    })

    return () => {
      dispose()
      removeSlot()
    }
  },
})
