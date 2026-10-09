// Vibe Check: a personality quiz with no right answers. Each answer adds points to career slugs.
// Tile order is always red ▲, blue ◆, yellow ●, green ■.

export interface VibeAnswer {
  text: string;
  points: Record<string, number>;
}
export interface VibeQuestion {
  prompt: string;
  answers: [VibeAnswer, VibeAnswer, VibeAnswer, VibeAnswer];
}

export const VIBE_CHECK: VibeQuestion[] = [
  {
    prompt: "Pick a weekend project",
    answers: [
      { text: "Break into an old router I own to see how it works", points: { penetration_testing: 2, embedded_systems_security: 2 } },
      { text: "Build a home server and lock it down", points: { network_security: 2, security_engineer: 1, cloud_security: 1 } },
      { text: "Train a little AI chatbot", points: { ai_with_cybersecurity: 3 } },
      { text: "Run a club's socials and budget", points: { security_consultant: 2, it_security: 1 } },
    ],
  },
  {
    prompt: "Group project due tomorrow. You're the one who…",
    answers: [
      { text: "finds the bug nobody else can", points: { malware_analyst: 2, penetration_testing: 1 } },
      { text: "sets up the shared drive so nobody deletes anything", points: { it_security: 2, cloud_security: 1 } },
      { text: "stays calm and gives everyone a job when it all goes wrong", points: { incident_response: 3 } },
      { text: "automates the boring bits with a script", points: { devsecops: 2, security_engineer: 1 } },
    ],
  },
  {
    prompt: "Pick a game",
    answers: [
      { text: "Among Us: spot who's lying", points: { security_analyst: 2, incident_response: 1 } },
      { text: "Portal: find a way through", points: { penetration_testing: 2 } },
      { text: "Minecraft redstone: build machines that just work", points: { embedded_systems_security: 2, security_engineer: 1 } },
      { text: "Chess: plan five moves ahead", points: { security_consultant: 2, malware_analyst: 1 } },
    ],
  },
  {
    prompt: "A friend's Instagram got hacked. You…",
    answers: [
      { text: "work out exactly how it happened", points: { incident_response: 2, malware_analyst: 1 } },
      { text: "turn on 2FA for all their accounts", points: { it_security: 2, security_analyst: 1 } },
      { text: "try the same trick on your own test account", points: { penetration_testing: 2 } },
      { text: "suspect an AI scam bot sent the link", points: { ai_with_cybersecurity: 2, security_analyst: 1 } },
    ],
  },
  {
    prompt: "Best possible Tuesday?",
    answers: [
      { text: "Catching an attacker live on the alert screen", points: { security_analyst: 3 } },
      { text: "Pulling apart a suspicious file in a safe lab", points: { malware_analyst: 3 } },
      { text: "Designing the cloud setup for a new app", points: { cloud_security: 2, devsecops: 1 } },
      { text: "Presenting a risk report to the bosses", points: { security_consultant: 3 } },
    ],
  },
  {
    prompt: "Pick a superpower",
    answers: [
      { text: "See every message flying through the air", points: { network_security: 3 } },
      { text: "Talk to machines", points: { embedded_systems_security: 2, ai_with_cybersecurity: 1 } },
      { text: "Rewind time", points: { incident_response: 2, malware_analyst: 1 } },
      { text: "Build anything instantly", points: { security_engineer: 2, devsecops: 1, cloud_security: 1 } },
    ],
  },
  {
    prompt: "Favourite subject?",
    answers: [
      { text: "Maths", points: { ai_with_cybersecurity: 2, malware_analyst: 1 } },
      { text: "Business", points: { security_consultant: 2, it_security: 1 } },
      { text: "Engineering / physics", points: { embedded_systems_security: 2, network_security: 1 } },
      { text: "Computer science", points: { devsecops: 1, security_engineer: 1, penetration_testing: 1 } },
    ],
  },
  {
    prompt: "How do you like to work?",
    answers: [
      { text: "Heads-down solo puzzles", points: { malware_analyst: 1, penetration_testing: 1 } },
      { text: "In a fast team where things kick off", points: { security_analyst: 1, incident_response: 1 } },
      { text: "Building systems that run without me", points: { devsecops: 2, cloud_security: 1 } },
      { text: "Explaining things to people", points: { it_security: 2, security_consultant: 1 } },
    ],
  },
];
