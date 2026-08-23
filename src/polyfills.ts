import { Buffer } from 'buffer'

// gray-matter 在浏览器端依赖 Node 的 Buffer 全局对象（内部会调 Buffer.from），
// 这里补一个 polyfill。必须在其他模块（如 stories 的 index.ts）求值前导入本文件，
// 因此 main.ts 的第一行就 import 本模块。
if (!(globalThis as Record<string, unknown>).Buffer) {
  ;(globalThis as Record<string, unknown>).Buffer = Buffer
}

export {}
