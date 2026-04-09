import {
  TASK_STATUS_MAP,
  ROOM_STATUS_MAP,
  CONSTRUCTION_TYPE_MAP
} from './constants'

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/
const MS_PER_DAY = 24 * 60 * 60 * 1000

export function parseDateOnly(date) {
  if (!date) return null

  if (date instanceof Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
  }

  if (typeof date === 'string') {
    const matched = date.match(DATE_ONLY_REGEX)
    if (matched) {
      const [, year, month, day] = matched
      return new Date(Number(year), Number(month) - 1, Number(day))
    }
  }

  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

export function getTodayDateOnly() {
  return parseDateOnly(new Date())
}

export function diffCalendarDays(startDate, endDate) {
  const start = parseDateOnly(startDate)
  const end = parseDateOnly(endDate)
  if (!start || !end) return 0
  return Math.round((end - start) / MS_PER_DAY)
}

/**
 * 获取任务状态文本
 */
export function getTaskStatusText(status) {
  return TASK_STATUS_MAP[status]?.text || status
}

/**
 * 获取任务状态类型（用于el-tag）
 */
export function getTaskStatusType(status) {
  return TASK_STATUS_MAP[status]?.type || 'info'
}

/**
 * 获取机房状态文本
 */
export function getRoomStatusText(status) {
  return ROOM_STATUS_MAP[status]?.text || status
}

/**
 * 获取机房状态类型（用于el-tag）
 */
export function getRoomStatusType(status) {
  return ROOM_STATUS_MAP[status]?.type || 'info'
}

/**
 * 获取建设方式文本
 */
export function getConstructionTypeText(type) {
  return CONSTRUCTION_TYPE_MAP[type]?.text || type
}

/**
 * 获取建设方式描述
 */
export function getConstructionTypeDesc(type) {
  return CONSTRUCTION_TYPE_MAP[type]?.desc || ''
}

/**
 * 格式化日期
 */
export function formatDate(date) {
  if (!date) return '-'
  const d = typeof date === 'string' && DATE_ONLY_REGEX.test(date)
    ? parseDateOnly(date)
    : new Date(date)
  if (!d || Number.isNaN(d.getTime())) return '-'
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 格式化日期时间
 */
export function formatDateTime(date) {
  if (!date) return '-'
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

/**
 * 计算延期天数
 */
export function calculateDelayDays(plannedEndDate) {
  if (!plannedEndDate) return 0
  return Math.max(0, diffCalendarDays(plannedEndDate, getTodayDateOnly()))
}

/**
 * 导出数据为Excel
 */
export function exportToExcel(data, filename, headers) {
  // 构建CSV内容
  const headerRow = headers.map(h => h.label).join(',')
  const dataRows = data.map(row =>
    headers.map(h => {
      let value = row[h.prop]
      // 处理包含逗号的值
      if (value && typeof value === 'string' && value.includes(',')) {
        value = `"${value}"`
      }
      return value ?? ''
    }).join(',')
  )

  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\n')

  // 创建下载链接
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}_${formatDate(new Date())}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}