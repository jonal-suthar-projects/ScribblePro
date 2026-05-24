export const ROAST_TITLES = [
  'Certified Menace',
  'NPC Energy',
  'Most Dangerous Brain',
  'Google Search Personality',
  'Chaos Gremlin',
  'Main Character Syndrome',
  'Professional Overthinker',
  'Villain Arc Unlocked',
  'Group Chat Menace',
  'Unhinged Legend',
  'Delulu But Iconic',
  'Certified Drama Queen',
  'Meme Lord Supreme',
  'Chaotic Good',
  'Red Flag Parade',
  'Walking Plot Twist',
  'Too Online',
  'Emotional Support Disaster',
  'Roast Master General',
  'Certified Himbo/Fembo',
  'Brain Empty, Vibes Full',
  'Most Likely to Start a Cult (Joking)',
  'Professional Yapper',
  'Chaos Coordinator',
  'Unfiltered Icon',
  'Menace to Society (Affectionate)',
  'Walking Red Flag Detector',
  'Group Mom/Dad Energy',
  'Chaotic Neutral',
  'Most Dramatic',
];

export function assignAwards(players) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const shuffledTitles = [...ROAST_TITLES].sort(() => Math.random() - 0.5);
  const awards = [];

  if (sorted[0]) {
    awards.push({ playerId: sorted[0].id, title: 'MVP — ' + (shuffledTitles[0] || 'Certified Menace'), type: 'mvp' });
  }
  if (sorted[sorted.length - 1] && sorted.length > 1) {
    awards.push({
      playerId: sorted[sorted.length - 1].id,
      title: shuffledTitles[1] || 'NPC Energy',
      type: 'roast',
    });
  }
  const mid = sorted[Math.floor(sorted.length / 2)];
  if (mid && sorted.length > 2) {
    awards.push({
      playerId: mid.id,
      title: shuffledTitles[2] || 'Most Dangerous Brain',
      type: 'honorable',
    });
  }

  for (let i = 3; i < Math.min(sorted.length, 6); i++) {
    awards.push({
      playerId: sorted[i].id,
      title: shuffledTitles[i] || ROAST_TITLES[i % ROAST_TITLES.length],
      type: 'funny',
    });
  }

  return awards;
}
