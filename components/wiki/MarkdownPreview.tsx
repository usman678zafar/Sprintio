"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="h-full overflow-y-auto bg-white p-5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="mt-6 text-3xl font-semibold tracking-tight text-text-base first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="mt-6 text-2xl font-semibold tracking-tight text-text-base">{children}</h2>,
          h3: ({ children }) => <h3 className="mt-5 text-xl font-semibold tracking-tight text-text-base">{children}</h3>,
          p: ({ children }) => <p className="mt-4 text-sm leading-7 text-muted sm:text-base">{children}</p>,
          ul: ({ children }) => <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-muted sm:text-base marker:text-primary">{children}</ul>,
          ol: ({ children }) => <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-7 text-muted sm:text-base marker:text-primary">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          blockquote: ({ children }) => <blockquote className="mt-4 rounded-r-2xl border-l-4 border-primary bg-primary/6 px-4 py-3 text-sm leading-7 text-text-base">{children}</blockquote>,
          code({ inline, children, ...props }: any) {
            if (inline) {
              return <code className="rounded-lg bg-base px-2 py-1 text-[13px] text-text-base" {...props}>{children}</code>;
            }
            return <pre className="mt-4 overflow-x-auto rounded-[24px] border border-border-subtle bg-[#151515] p-4 text-sm text-white"><code {...props}>{children}</code></pre>;
          },
          a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="font-medium text-primary underline underline-offset-4">{children}</a>,
          img: ({ src, alt }) => <img src={src || ""} alt={alt || ""} className="mt-4 w-full rounded-[24px] border border-border-subtle object-cover shadow-sm" />,
          hr: () => <hr className="my-6 border-border-subtle" />,
        }}
      >
        {content || "## Nothing here yet\n\nStart writing in the editor to preview the page."}
      </ReactMarkdown>
    </div>
  );
}
