import type { HeatMetric } from '../types/news'

export type HeatGroup = {
  platform: string
  sourceUrl: string
  checkedAt: string
  metrics: HeatMetric[]
}

export function formatHeatValue(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

export function groupHeatMetrics(metrics: HeatMetric[]) {
  const groups = new Map<string, HeatGroup>()

  for (const item of metrics) {
    const key = [item.platform, item.sourceUrl, item.checkedAt].join('|')
    const group = groups.get(key)

    if (group) group.metrics.push(item)
    else groups.set(key, { platform: item.platform, sourceUrl: item.sourceUrl, checkedAt: item.checkedAt, metrics: [item] })
  }

  return [...groups.values()]
}
