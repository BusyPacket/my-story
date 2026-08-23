export interface OptimizeResult {
  total: number
  generated: number
  skipped: number
}

export interface OptimizeOptions {
  photosDir?: string
  thumbsDir?: string
  width?: number
  quality?: number
  log?: {
    warn?: (...args: unknown[]) => void
    error?: (...args: unknown[]) => void
  }
}

export function optimizePhotos(options?: OptimizeOptions): Promise<OptimizeResult>
