import MarkdownIt from 'markdown-it'
import { useRouter } from 'vue-router'

// markdown 渲染实例：关闭原始 HTML（防注入），开启裸 URL 链接化与单换行转 <br>
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

// 自定义链接渲染：站内相对路径（/ 开头）加 .story-link 类供 SPA 导航拦截，
// 外部链接自动新开标签页
const defaultLinkOpen =
  md.renderer.rules.link_open ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const href = String(tokens[idx]?.attrGet('href') ?? '')
  if (href.startsWith('/')) {
    tokens[idx]?.attrJoin('class', 'story-link')
  } else {
    tokens[idx]?.attrSet('target', '_blank')
    tokens[idx]?.attrSet('rel', 'noopener noreferrer')
  }
  return defaultLinkOpen(tokens, idx, options, env, self)
}

// 用 markdown 库把正文渲染为 HTML（支持完整语法，替代手写 linkify/renderLists）
export function renderMarkdown(text: string): string {
  return md.render(text ?? '')
}

// 站内链接点击：拦截并交给 vue-router 做 SPA 导航
export function useStoryContent(): { onContentClick: (event: MouseEvent) => void } {
  const router = useRouter()

  function onContentClick(event: MouseEvent): void {
    const anchor = (event.target as HTMLElement).closest('a.story-link') as HTMLAnchorElement | null
    if (!anchor) return
    event.preventDefault()
    void router.push(anchor.getAttribute('href') ?? '')
  }

  return { onContentClick }
}
