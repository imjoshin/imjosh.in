export default function PageTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-transition relative z-10 flex min-w-0 flex-1 flex-col">{children}</div>;
}
