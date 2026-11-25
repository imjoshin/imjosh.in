import type { Metadata } from "next";
import Image from "next/image";
import { projects } from "../../../content/projects";

export const metadata: Metadata = {
  title: "Projects",
  description: "Projects by Josh Johnson: CardScout, Dishin, and Oak Apparel.",
  alternates: { canonical: "/projects/" },
};

export default function ProjectsPage() {
  return (
    <main id="main" className="relative z-10 mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-10 px-gutter pt-[clamp(24px,5vw,72px)] pb-16">
      <div className="flex flex-col gap-5">
        <h1 className="page-title">My <em>projects</em></h1>
        <p className="max-w-[40ch] text-[18px] leading-[1.5] text-muted">Things I&apos;ve made and things I&apos;m building.</p>
      </div>

      <div className="flex flex-col gap-5">
        {projects.map((project, index) => (
          <article key={project.domain} className="group panel relative grid items-center gap-6 rounded-[24px] p-4 transition-colors hover:border-accent sm:p-6 md:grid-cols-[1.15fr_1fr] md:gap-8 lg:gap-10">
            <div className="overflow-hidden rounded-[12px] border border-line">
              <Image
                className="aspect-video w-full object-cover object-top"
                src={project.preview}
                alt={project.previewAlt}
                loading={index === 0 ? "eager" : "lazy"}
                unoptimized
              />
            </div>
            <div className="flex flex-col items-start gap-4 px-1 pb-2 sm:px-0 md:py-3">
              {project.building && <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[14px] font-medium text-accent">Building</span>}
              <h2 className="font-display text-[clamp(36px,4vw,52px)] leading-none tracking-[-.02em] transition-colors group-hover:text-accent">
                <a className="after:absolute after:inset-0 after:rounded-[24px] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-accent" href={project.url} target="_blank" rel="noopener noreferrer">
                  {project.name}<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </h2>
              <p className="max-w-[44ch] text-[17px] leading-[1.5] text-pretty">{project.description}</p>
              <span className="text-[14px] text-muted underline decoration-line underline-offset-[5px] transition-colors group-hover:text-accent">{project.domain}</span>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
