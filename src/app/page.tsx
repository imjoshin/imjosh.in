import { RotatingWord } from "@/components/rotating-word";
import { SocialLinks } from "@/components/site-shell";

export default function HomePage() {
  return (
    <main id="main" className="home-page pointer-events-none relative z-10 flex flex-1 flex-col justify-end gap-[clamp(20px,3vw,40px)] px-gutter pt-24 pb-[clamp(24px,4vw,48px)]">
      <h1 className="font-display text-[clamp(84px,17.5vw,320px)] leading-[.8] font-normal tracking-[-.04em]">I&apos;m Josh<em className="text-accent">in&apos;</em></h1>
      <div className="flex flex-wrap items-end justify-between gap-7">
        <p className="max-w-[26ch] text-[clamp(20px,2.1vw,30px)] leading-[1.25] text-pretty">Hey! I&apos;m passionate about solving <RotatingWord /> problems and currently work at <a className="pointer-events-auto underline decoration-1 underline-offset-[5px] hover:text-accent" href="https://tern.travel" target="_blank" rel="noopener noreferrer">tern.travel</a>.</p>
        <div className="pointer-events-auto flex flex-col items-end gap-3 max-sm:items-start">
          <span className="font-display text-xl text-muted italic">nah, he&apos;s alright.</span>
          <SocialLinks />
        </div>
      </div>
    </main>
  );
}
