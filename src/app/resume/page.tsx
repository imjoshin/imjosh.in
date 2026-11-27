import type { Metadata } from "next";
import { experience, education, recommendations } from "../../../content/resume";

export const metadata: Metadata = { title: "Resume", description: "Josh Johnson, Senior Engineering Manager at Tern. Experience in engineering, product, and building things that make people’s lives easier.", alternates: { canonical: "/resume/" } };

export default function ResumePage() {
  return (
    <main id="main" className="resume-page relative z-10 mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-10 px-gutter pt-[clamp(24px,5vw,72px)] pb-20 sm:gap-12">
      <div className="resume-heading flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
        <div className="flex flex-col gap-5">
          <p className="eyebrow">Résumé</p>
          <h1 className="page-title">Josh <em>Johnson</em></h1>
        </div>
        <div className="print-actions pb-1">
          <a className="pill pill-filled gap-3 px-5 py-3 text-[15px]" href="https://www.linkedin.com/in/imjoshin/" target="_blank" rel="noopener noreferrer">
            LinkedIn <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span>
          </a>
          {/* TODO: Restore Save as PDF as a link once a real résumé PDF is hosted. */}
        </div>
      </div>

      <section className="panel overflow-hidden rounded-[24px]" aria-labelledby="experience-title">
        <h2 id="experience-title" className="eyebrow border-b border-line px-6 py-5 sm:px-8">Experience</h2>
        {experience.map((job) => (
          <article key={job.company} className="experience-row grid grid-cols-1 gap-x-8 gap-y-6 border-b border-line px-6 py-8 last:border-b-0 sm:grid-cols-[1fr_2fr] sm:px-8 sm:py-9">
            <div className="flex flex-col items-start gap-1.5">
              <h3 className="experience-company font-display text-[36px] leading-none tracking-[-.01em]">
                <a className="resume-organization" href={job.url} target="_blank" rel="noopener noreferrer">
                  {job.company}<span className="resume-link-arrow" aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span>
                </a>
              </h3>
              {job.acquisition && <a className="w-fit text-[14px] text-muted underline decoration-line underline-offset-4 hover:text-accent" href={job.acquisition.url}>acq. by {job.acquisition.company}, {job.acquisition.year}</a>}
              <p className="text-[14px] text-muted tabular-nums">{job.dates}</p>
            </div>
            <div className="min-w-0">
              <ol className={job.roles.length > 1 ? "resume-roles" : "flex flex-col"}>
                {job.roles.map((role) => (
                  <li key={role.title} className="resume-role">
                    <div className="mb-3 flex flex-col gap-1.5">
                      <h4 className="resume-role-title text-[20px] leading-[1.25] font-semibold tracking-[-.015em] text-accent sm:text-[22px]">{role.title}</h4>
                      {job.roles.length > 1 && <p className="resume-role-dates text-[13px] text-muted tabular-nums">{role.dates}</p>}
                    </div>
                    {role.summary && <p className="experience-description text-[16px] leading-[1.6] text-pretty sm:text-[17px]">{role.summary}</p>}
                    {role.highlights && (
                      <ul className="resume-highlights experience-description flex flex-col gap-2.5 text-[16px] leading-[1.6] text-pretty">
                        {role.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </article>
        ))}
      </section>

      <section className="resume-education panel overflow-hidden rounded-[24px]" aria-labelledby="education-title">
        <h2 id="education-title" className="eyebrow border-b border-line px-6 py-5 sm:px-8">Education</h2>
        <div className="resume-extra grid gap-x-8 gap-y-6 px-6 py-8 sm:grid-cols-[1fr_2fr] sm:px-8 sm:py-9">
          <div className="flex flex-col items-start gap-3">
            <h3 className="font-display text-[32px] leading-[1.05] tracking-[-.01em]">
              <a className="resume-organization" href={education.url} target="_blank" rel="noopener noreferrer">
                {education.school}<span className="resume-link-arrow" aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span>
              </a>
            </h3>
            <p className="text-[14px] leading-[1.6] text-muted">{education.location}<br /><span className="tabular-nums">{education.dates}</span></p>
          </div>
          <div className="flex flex-col items-start gap-4">
            <div className="flex flex-col gap-2">
              <p className="resume-degree text-[22px] leading-[1.25] font-semibold tracking-[-.015em] text-accent">{education.degree}</p>
              <p className="text-[17px] leading-[1.5]">Minor in {education.minor}</p>
            </div>
            <span className="rounded-full border border-accent/25 bg-accent/5 px-3 py-1 text-[13px] text-accent">{education.honors}</span>
          </div>
        </div>
      </section>

      <section className="resume-recommendations flex flex-col gap-5" aria-labelledby="recommendations-title">
        <h2 id="recommendations-title" className="eyebrow px-1">Kind words</h2>
        <div className="grid gap-5 md:grid-cols-2">
          {recommendations.map((recommendation) => (
            <figure key={recommendation.author} className="resume-extra panel flex flex-col justify-between gap-8 rounded-[24px] p-6 sm:p-8">
              <blockquote className="font-display text-[clamp(28px,3.1vw,36px)] leading-[1.15] text-pretty">“{recommendation.quote}”</blockquote>
              <figcaption className="flex flex-col items-start gap-1 border-t border-line pt-4">
                <a className="text-[15px] font-semibold hover:text-accent" href={recommendation.url} target="_blank" rel="noopener noreferrer">{recommendation.author}<span className="sr-only"> (opens in a new tab)</span></a>
                <span className="text-[13px] leading-[1.5] text-muted">{recommendation.context}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </main>
  );
}
