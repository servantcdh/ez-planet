import type { LabelingTool, RectInitConfig } from '../../types/internal'
import { getRectInit } from './common'

export const blankRectTool = (): LabelingTool => {
  const init = (config: RectInitConfig) => {
    return getRectInit(config, true)
  }
  return { id: 'bounded-box', init }
}

export const filledRectTool = (): LabelingTool => {
  const init = (config: RectInitConfig) => {
    return getRectInit(config, false)
  }
  return { id: 'filled-box', init }
}

export const segmentAnythingTool = (): LabelingTool => {
  const init = ({ callback }: { callback?: RectInitConfig['callback'] }) => {
    return getRectInit({ colorCode: '#13C0A4', callback }, true, true)
  }
  return { id: 'seg-anything', init }
}
