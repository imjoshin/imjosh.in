// Verified against Josh's signed-in LinkedIn profile on 2026-11-24:
// https://www.linkedin.com/in/imjoshin/
// https://www.linkedin.com/in/imjoshin/details/experience/
// Dates and roles below replace the handoff's placeholder JOBS array.
// Descriptions are concise editorial summaries of the listed responsibilities.
export type Experience = {
  company: string;
  dates: string;
  role: string;
  description: string;
  acquisition?: { company: string; year: number; url: string };
};

export const experience: readonly Experience[] = [
  {
    company: "Tern",
    dates: "Sep 2026 - now",
    role: "Senior Engineering Manager",
    description: "Building connected systems and a delightful app for travel advisors.",
    // Responsibilities also supported by Josh's public announcement:
    // https://www.linkedin.com/posts/imjoshin_excited-to-share-that-im-joining-tern-as-activity-7501274728343719936-rkkd
  },
  {
    company: "Alpine",
    dates: "Apr 2025 - Sep 2026",
    role: "Founding Engineer",
    description: "Shipped features from design through deployment. Cut CI runtime by about 90% and built out observability, incident response, and AI developer tooling.",
  },
  {
    company: "Beeper",
    dates: "May 2023 - Oct 2024",
    role: "Engineering Lead (Player/Coach)",
    description: "Led the desktop team as daily active users grew from 12,000 to 300,000. Built cross-platform delivery pipelines and helped integrate Beeper after its acquisition.",
    acquisition: {
      company: "Automattic",
      year: 2024,
      url: "https://blog.beeper.com/2024/04/09/beeper-is-joining-automattic/",
    },
  },
  {
    company: "Gatsby",
    dates: "Jan 2022 - May 2023",
    role: "Staff Software Engineer → Product Manager",
    description: "Co-created the Slice API and shipped Gatsby 5. Moved into product for Gatsby Cloud and Framework, then Netlify Builds and Ecosystem after the acquisition.",
    acquisition: {
      company: "Netlify",
      year: 2023,
      url: "https://www.netlify.com/press/netlify-acquires-gatsby-inc-to-accelerate-adoption-of-composable-web-architectures/",
    },
  },
  {
    company: "Duo Security",
    dates: "Jan 2019 - Jan 2022",
    role: "Software Engineer II / III → Design Engineer",
    description: "Built administration and endpoint-health features. Led architecture refactors across web, Windows, and macOS, and introduced TypeScript to the admin panel.",
  },
  {
    company: "Barracuda",
    dates: "Feb 2017 - Jan 2019",
    role: "Software Engineer I → II",
    description: "Built Backup features, developed support tooling in Go, and led development of the AWS Backup service.",
  },
] as const;

// Education and recommendation are supplied in the design handoff;
// the exact quotation was also verified in LinkedIn's public recommendation.
export const education = { school: "Michigan Technological University", location: "Houghton, MI" };
export const recommendation = {
  quote: "Josh combines deep technical skills with an empathetic, collaborative mindset.",
  author: "Vitaliy Peker",
  context: "Worked with Josh at Barracuda, Duo, Gatsby & Netlify",
};
