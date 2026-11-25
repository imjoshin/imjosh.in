const pageOrder = ["/", "/projects", "/uses", "/resume"];

export function pageDirection(from: string, to: string): "forward" | "back" | "none" {
  const normalize = (path: string) => path.split(/[?#]/)[0].replace(/\/$/, "") || "/";
  const source = normalize(from), target = normalize(to);
  if (source === target) return "none";
  const sourceIndex = pageOrder.indexOf(source), targetIndex = pageOrder.indexOf(target);
  return (targetIndex < 0 ? pageOrder.length : targetIndex) > (sourceIndex < 0 ? pageOrder.length : sourceIndex) ? "forward" : "back";
}
