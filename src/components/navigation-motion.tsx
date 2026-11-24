"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { pageDirection } from "@/lib/navigation";

export function DirectionalLink({ href, ...props }: ComponentProps<typeof Link>) {
  const pathname = usePathname();
  const destination = typeof href === "string" ? href : href.pathname ?? "/";
  const direction = pageDirection(pathname, destination);
  return <Link {...props} href={href} transitionTypes={direction === "none" ? [] : [`page-${direction}`]} />;
}
