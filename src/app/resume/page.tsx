import type { Metadata } from "next";
import { experience, education, recommendation } from "../../../content/resume";
import { PrintButton } from "@/components/print-button";

export const metadata: Metadata = { title: "Resume", description: "Josh Johnson, Senior Engineering Manager at Tern. Experience in engineering, product, and building things that make people’s lives easier.", alternates: { canonical: "/resume/" } };

export default function ResumePage() {
  return (
    <main id="main" className="resume-page relative z-10 mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-10 px-gutter pt-[clamp(24px,5vw,72px)] pb-16">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <h1 className="page-title">Josh <em>Johnson</em></h1>
        <div className="print-actions flex flex-wrap gap-2">
          <a className="pill pill-filled px-5 py-3 text-[15px]" href="https://www.linkedin.com/in/imjoshin/" target="_blank" rel="noopener noreferrer">LinkedIn<span className="sr-only"> (opens in a new tab)</span></a>
          <PrintButton />
        </div>
      </div>

      <section className="panel overflow-hidden rounded-[24px]" aria-labelledby="experience-title">
        <h2 id="experience-title" className="eyebrow border-b border-line px-7 py-[18px]">Experience</h2>
        {experience.map((job) => (
          <article key={job.company} className="experience-row grid grid-cols-1 gap-x-8 gap-y-3 border-b border-line px-7 py-6 transition-colors duration-250 last:border-b-0 hover:bg-line sm:grid-cols-[1fr_2fr]">
            <div className="flex flex-col gap-1">
              <h3 className="experience-company font-display text-[36px] leading-none tracking-[-.01em]">{job.company}</h3>
              {job.acquisition && <a className="w-fit text-[14px] text-muted underline decoration-line underline-offset-4 hover:text-accent" href={job.acquisition.url}>acq. by {job.acquisition.company}, {job.acquisition.year}</a>}
              <p className="text-[14px] text-muted tabular-nums">{job.dates}</p>
            </div>
            <div className="flex flex-col gap-[6px]">
              <p className="text-[17px] font-semibold text-accent">{job.role}</p>
              <p className="experience-description text-[17px] leading-[1.45] text-pretty">{job.description}</p>
            </div>
          </article>
        ))}
      </section>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-5">
        <section className="resume-extra panel flex flex-col gap-3 rounded-[24px] px-7 py-6" aria-labelledby="education-title">
          <h2 id="education-title" className="eyebrow">Education</h2>
          <p className="font-display text-[32px] leading-[1.05]">{education.school}</p>
          <p className="text-[15px] text-muted">{education.location}</p>
        </section>
        <figure className="resume-extra panel flex flex-col gap-3 rounded-[24px] px-7 py-6">
          <h2 className="eyebrow">Kind words</h2>
          <blockquote className="font-display text-[28px] leading-[1.15] text-pretty italic">“{recommendation.quote}”</blockquote>
          <figcaption className="text-[15px] text-muted">{recommendation.author} - {recommendation.context}</figcaption>
        </figure>
      </div>
    </main>
  );
}
