interface Task {
  name: string
  id?: string
  isMilestone: boolean
  isCrit: boolean
  isDone: boolean
  isActive: boolean
  startStr?: string
  endStr?: string
  durationStr?: string
  start?: Date
  end?: Date
  prevInSection?: Task
  dependencies: string[]
}

interface Section {
  name: string
  tasks: Task[]
}

function parseDate(dateStr: string): Date {
  const parts = dateStr.trim().split(/[-/ :]/)
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1 // 0-indexed
  const day = parseInt(parts[2] || '1', 10)
  const hour = parseInt(parts[3] || '0', 10)
  const minute = parseInt(parts[4] || '0', 10)
  return new Date(year, month, day, hour, minute)
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDuration(date: Date, durationStr: string): Date {
  const match = durationStr
    .trim()
    .match(/^(\d+)\s*(d|day|days|w|week|weeks|h|hour|hours|m|minute|minutes)$/i)
  if (!match) {
    const res = new Date(date)
    res.setDate(res.getDate() + 1)
    return res
  }
  const value = parseInt(match[1], 10)
  const unit = match[2].toLowerCase()
  const res = new Date(date)
  if (unit.startsWith('d')) {
    res.setDate(res.getDate() + value)
  } else if (unit.startsWith('w')) {
    res.setDate(res.getDate() + value * 7)
  } else if (unit.startsWith('h')) {
    res.setHours(res.getHours() + value)
  } else if (unit.startsWith('m')) {
    res.setMinutes(res.getMinutes() + value)
  }
  return res
}

export function mermaidGanttToGantty(code: string): string {
  const lines = code.split('\n')
  let title = ''
  const sections: Section[] = []
  let currentSection: Section | null = null
  const tasksById = new Map<string, Task>()
  const allMilestones: { name: string; date: string }[] = []

  for (let line of lines) {
    line = line.replace(/%%[\s\S]*$/, '').trim()
    if (!line) continue

    if (line.startsWith('gantt')) {
      continue
    }

    if (line.startsWith('title ')) {
      title = line.substring(6).trim()
      continue
    }

    if (line.startsWith('dateFormat ')) {
      continue
    }

    if (line.startsWith('section ')) {
      const name = line.substring(8).trim()
      currentSection = { name, tasks: [] }
      sections.push(currentSection)
      continue
    }

    if (line.includes(':')) {
      const colonIdx = line.indexOf(':')
      const taskName = line.substring(0, colonIdx).trim()
      const argsStr = line.substring(colonIdx + 1).trim()
      const args = argsStr.split(',').map((s) => s.trim())

      let id: string | undefined
      let startStr: string | undefined
      let endStr: string | undefined
      let durationStr: string | undefined
      let isMilestone = false
      let isCrit = false
      let isDone = false
      let isActive = false
      const dependencies: string[] = []

      for (const arg of args) {
        if (!arg) continue

        if (arg === 'milestone') {
          isMilestone = true
        } else if (arg === 'crit') {
          isCrit = true
        } else if (arg === 'done') {
          isDone = true
        } else if (arg === 'active') {
          isActive = true
        } else if (arg.startsWith('after ')) {
          const deps = arg.substring(6).trim().split(/\s+/)
          for (const d of deps) {
            dependencies.push(d)
          }
          startStr = arg
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(arg)) {
          if (!startStr) {
            startStr = arg
          } else {
            endStr = arg
          }
        } else if (/^\d+[a-zA-Z]+$/.test(arg)) {
          durationStr = arg
        } else {
          id = arg
        }
      }

      const task: Task = {
        name: taskName,
        id,
        isMilestone,
        isCrit,
        isDone,
        isActive,
        startStr,
        endStr,
        durationStr,
        dependencies,
      }

      if (!currentSection) {
        currentSection = { name: 'General', tasks: [] }
        sections.push(currentSection)
      }
      currentSection.tasks.push(task)

      if (id) {
        tasksById.set(id, task)
      }
    }
  }

  for (const sec of sections) {
    let prev: Task | undefined
    for (const task of sec.tasks) {
      task.prevInSection = prev
      prev = task
    }
  }

  let projectStart = new Date()
  let hasAbsoluteStart = false
  for (const sec of sections) {
    for (const task of sec.tasks) {
      if (
        task.startStr &&
        !task.startStr.startsWith('after ') &&
        !isNaN(parseDate(task.startStr).getTime())
      ) {
        const d = parseDate(task.startStr)
        if (!hasAbsoluteStart || d < projectStart) {
          projectStart = d
          hasAbsoluteStart = true
        }
      }
    }
  }

  const resolving = new Set<Task>()
  const resolved = new Set<Task>()

  function resolveTask(task: Task) {
    if (resolved.has(task)) return
    if (resolving.has(task)) {
      throw new Error(`Circular dependency detected for task: ${task.name}`)
    }
    resolving.add(task)

    let start: Date
    if (!task.startStr) {
      if (task.prevInSection) {
        resolveTask(task.prevInSection)
        start = task.prevInSection.end!
      } else {
        start = projectStart
      }
    } else if (task.startStr.startsWith('after ')) {
      let maxEnd = projectStart
      for (const depId of task.dependencies) {
        const depTask = tasksById.get(depId)
        if (depTask) {
          resolveTask(depTask)
          if (depTask.end! > maxEnd) {
            maxEnd = depTask.end!
          }
        }
      }
      start = maxEnd
    } else {
      start = parseDate(task.startStr)
    }

    task.start = start

    if (task.endStr) {
      task.end = parseDate(task.endStr)
    } else if (task.durationStr) {
      task.end = addDuration(start, task.durationStr)
    } else {
      task.end = addDuration(start, '1d')
    }

    resolving.delete(task)
    resolved.add(task)
  }

  for (const sec of sections) {
    for (const task of sec.tasks) {
      resolveTask(task)
    }
  }

  const tasksWithoutMilestones: Section[] = []
  for (const sec of sections) {
    const activeTasks: Task[] = []
    for (const task of sec.tasks) {
      if (task.isMilestone) {
        allMilestones.push({
          name: task.name,
          date: formatDate(task.start!),
        })
      } else {
        activeTasks.push(task)
      }
    }
    if (activeTasks.length > 0) {
      tasksWithoutMilestones.push({
        name: sec.name,
        tasks: activeTasks,
      })
    }
  }

  let minStart = projectStart
  let maxEnd = projectStart
  let hasDates = false
  for (const sec of tasksWithoutMilestones) {
    for (const task of sec.tasks) {
      if (task.start && task.end) {
        if (!hasDates) {
          minStart = task.start
          maxEnd = task.end
          hasDates = true
        } else {
          if (task.start < minStart) minStart = task.start
          if (task.end > maxEnd) maxEnd = task.end
        }
      }
    }
  }

  const durationMs = maxEnd.getTime() - minStart.getTime()
  const durationDays = durationMs / (1000 * 60 * 60 * 24)

  const out: string[] = []

  if (title) {
    out.push(`#block(width: 100%, inset: (bottom: 0.5em))[`)
    out.push(`  #align(center, text(1.2em, weight: "bold", "${title}"))`)
    out.push(`]`)
  }

  out.push(`#block[`)
  out.push(`  #import "@preview/gantty:0.5.1": gantt, drawers, header`)

  let headerConfigs = ''
  if (durationDays < 30) {
    headerConfigs = `(header.default-month-header(), header.default-week-header(), header.default-day-header())`
  } else if (durationDays < 180) {
    headerConfigs = `(header.default-month-header(), header.default-week-header())`
  } else {
    headerConfigs = `(header.default-year-header(), header.default-month-header())`
  }

  out.push(`  #gantt((`)
  out.push(`    show-today: false,`)
  out.push(`    tasks: (`)

  for (const sec of tasksWithoutMilestones) {
    out.push(`      (`)
    out.push(`        name: "${sec.name}",`)
    out.push(`        subtasks: (`)
    for (const task of sec.tasks) {
      const depsStr =
        task.dependencies.length > 0
          ? `, dependencies: (${task.dependencies.map((d) => `(id: "${d}")`).join(', ')}${task.dependencies.length === 1 ? ',' : ''})`
          : ''
      const idStr = task.id ? `, id: "${task.id}"` : ''
      out.push(
        `          (name: "${task.name}", start: "${formatDate(task.start!)}", end: "${formatDate(task.end!)}"${idStr}${depsStr}),`
      )
    }
    out.push(`        ),`)
    out.push(`      ),`)
  }

  out.push(`    ),`)

  if (allMilestones.length > 0) {
    out.push(`    milestones: (`)
    for (const m of allMilestones) {
      out.push(`      (name: "${m.name}", date: "${m.date}"),`)
    }
    out.push(`    ),`)
  }

  out.push(`    drawer: (`)
  out.push(`      ..drawers.default-drawer,`)
  out.push(`      headers: header.default-headers-drawer.with(`)
  out.push(`        headers: ${headerConfigs},`)
  out.push(`      ),`)
  out.push(`    ),`)
  out.push(`  ))`)
  out.push(`]`)

  return out.join('\n')
}
