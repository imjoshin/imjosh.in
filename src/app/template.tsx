import { ViewTransition } from "react";

export default function PageTemplate({ children }: { children: React.ReactNode }) {
  const motion = { "page-forward": "page-forward", "page-back": "page-back", default: "none" };
  return <ViewTransition name="page-content" share={motion} enter={motion} exit={motion} default="none"><div className="page-transition relative z-10 flex min-w-0 flex-1 flex-col">{children}</div></ViewTransition>;
}
