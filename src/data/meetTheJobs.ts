// Meet the Jobs warm-up. Options are job titles; the answer is always options[0] here and is
// shuffled at play time. `career_slug` is the career whose one_liner is shown after answering.

export interface MeetTheJobsQuestion {
  career_slug: string;
  prompt: string;
  answer: string;
  distractors: [string, string, string];
}

export const MEET_THE_JOBS: MeetTheJobsQuestion[] = [
  {
    career_slug: "penetration_testing",
    prompt: "Who gets paid to hack companies, with permission, to find weak spots first?",
    answer: "Penetration Tester",
    distractors: ["Security Consultant", "Cloud Security Engineer", "Malware Analyst"],
  },
  {
    career_slug: "security_analyst",
    prompt: "Who watches alerts in a SOC and decides which ones are real attacks?",
    answer: "SOC Analyst",
    distractors: ["Incident Responder", "Network Security Engineer", "DevSecOps Engineer"],
  },
  {
    career_slug: "malware_analyst",
    prompt: "Who takes apart a suspicious file in a safe lab to see what it does?",
    answer: "Malware Analyst",
    distractors: ["Penetration Tester", "IT Security Specialist", "Security Engineer"],
  },
  {
    career_slug: "incident_response",
    prompt: "Who leads the response when a company gets breached?",
    answer: "Incident Responder",
    distractors: ["SOC Analyst", "Security Consultant", "Cloud Security Engineer"],
  },
  {
    career_slug: "embedded_systems_security",
    prompt: "Who secures smart cameras, cars and medical devices?",
    answer: "IoT & Embedded Security Engineer",
    distractors: ["Network Security Engineer", "AI Security Specialist", "IT Security Specialist"],
  },
  {
    career_slug: "devsecops",
    prompt: "Who builds security checks into the pipeline that ships code?",
    answer: "DevSecOps Engineer",
    distractors: ["Security Engineer", "Cloud Security Engineer", "Penetration Tester"],
  },
  {
    career_slug: "ai_with_cybersecurity",
    prompt: "Who tests chatbots against prompt injection?",
    answer: "AI Security Specialist",
    distractors: ["Penetration Tester", "Malware Analyst", "SOC Analyst"],
  },
  {
    career_slug: "security_consultant",
    prompt: "Who advises company bosses on risk using frameworks like NIST CSF?",
    answer: "Security Consultant",
    distractors: ["IT Security Specialist", "Incident Responder", "Security Engineer"],
  },
  {
    career_slug: "cloud_security",
    prompt: "Who locks down AWS and Azure accounts and their permissions?",
    answer: "Cloud Security Engineer",
    distractors: ["DevSecOps Engineer", "Network Security Engineer", "IT Security Specialist"],
  },
  {
    career_slug: "network_security",
    prompt: "Who configures firewalls and watches traffic across the network?",
    answer: "Network Security Engineer",
    distractors: ["SOC Analyst", "Security Engineer", "Cloud Security Engineer"],
  },
  {
    career_slug: "it_security",
    prompt: "Who manages staff accounts, MFA, patching and backups?",
    answer: "IT Security Specialist",
    distractors: ["Security Consultant", "SOC Analyst", "DevSecOps Engineer"],
  },
  {
    career_slug: "security_engineer",
    prompt: "Who designs systems to be secure from the start, with layers of defence?",
    answer: "Security Engineer",
    distractors: ["Security Consultant", "Network Security Engineer", "Penetration Tester"],
  },
];
