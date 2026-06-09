export const STEPS = [
  {
    id: 'profile',
    number: 1,
    title: 'Profile',
    titleTh: 'โปรไฟล์',
    outputType: 'json-profile',
    description: 'Who the researcher is + a rich positioning statement',
    buildPrompt: ({ cvText }) => `[ROLE] You are a research-portfolio editor helping a university researcher build a Tech Portfolio for the Maejo University Deep Mentorship Program (FY2569).

[TASK] From the CV below, (a) extract structured profile fields and (b) write a rich 4–6 sentence profile/positioning statement.

[CONTEXT] The portfolio is a shared language between mentor, mentee, and funder. The Profile component should convey identity, research domain, distinctive positioning, and trajectory. The researcher is a faculty member or researcher at Maejo University who will mentor entrepreneurial students in agriculture, food, and health domains.
CV TEXT:
"""
${cvText || '(No CV provided — please fill in the fields manually)'}
"""

[FORMAT] Return JSON only — no prose, no code fences:
{
  "name": "full name and title",
  "position": "position and department",
  "institution": "university/institute",
  "domain": "primary research domain",
  "expertise": ["keyword1", "keyword2", "keyword3"],
  "statement": "4–6 sentence profile/positioning statement"
}`,
  },
  {
    id: 'skills',
    number: 2,
    title: 'Skills',
    titleTh: 'ทักษะ',
    outputType: 'selectable-list',
    description: 'Technical/domain capabilities aligned to a theme',
    buildPrompt: ({ cvText, profile }) => `[ROLE] You are a research-portfolio editor for the Maejo University Deep Mentorship Program.

[TASK] Suggest a list of 10–15 specific technical and domain skills for this researcher, themed to their research area and relevant to mentoring entrepreneurial students in agriculture, food, and health.

[CONTEXT] Researcher profile: ${profile?.statement || '(see CV)'}
Research domain: ${profile?.domain || ''}
CV TEXT:
"""
${cvText || '(No CV provided)'}
"""

[FORMAT] Return JSON only — an array of skill strings, no prose, no code fences:
["Skill 1", "Skill 2", "Skill 3", ...]`,
  },
  {
    id: 'projects',
    number: 3,
    title: 'Projects',
    titleTh: 'โครงการ',
    outputType: 'selectable-cards',
    description: 'Key research/innovation projects',
    buildPrompt: ({ cvText, profile }) => `[ROLE] You are a research-portfolio editor for the Maejo University Deep Mentorship Program.

[TASK] Extract key research/innovation projects from this CV, then rank them by impact and relevance to mentoring agri-food-health entrepreneurs.

[CONTEXT] Researcher: ${profile?.name || ''}
Domain: ${profile?.domain || ''}
CV TEXT:
"""
${cvText || '(No CV provided)'}
"""

[FORMAT] Return JSON only — an array of project objects ranked from most to least relevant, no prose, no code fences:
[
  {
    "title": "Project title",
    "period": "year or year range",
    "description": "2–3 sentence description",
    "impact": "key outcome or impact",
    "relevance": "why relevant for mentoring entrepreneurs"
  }
]`,
  },
  {
    id: 'process',
    number: 4,
    title: 'Process',
    titleTh: 'กระบวนการ',
    outputType: 'selectable-list',
    description: 'How the researcher works',
    buildPrompt: ({ cvText, profile, skills }) => `[ROLE] You are a research-portfolio editor for the Maejo University Deep Mentorship Program.

[TASK] Suggest a list of 8–12 research/innovation process descriptors — how this researcher works, their methodology, and their approach to translating research to real-world impact.

[CONTEXT] Researcher: ${profile?.name || ''}
Domain: ${profile?.domain || ''}
Selected skills: ${skills?.join(', ') || ''}
CV TEXT:
"""
${cvText || '(No CV provided)'}
"""

[FORMAT] Return JSON only — an array of process descriptor strings, no prose, no code fences:
["Process 1", "Process 2", ...]`,
  },
  {
    id: 'evidence',
    number: 5,
    title: 'Evidence',
    titleTh: 'หลักฐาน',
    outputType: 'selectable-cards',
    description: 'Proof points: publications, patents, grants, prototypes',
    buildPrompt: ({ cvText, profile }) => `[ROLE] You are a research-portfolio editor for the Maejo University Deep Mentorship Program.

[TASK] Extract and rank evidence items (publications, patents, grants, awards, prototypes, demos) from this CV by relevance to the researcher's positioning as a mentor for agri-food-health entrepreneurs.

[CONTEXT] Researcher: ${profile?.name || ''}
Domain: ${profile?.domain || ''}
CV TEXT:
"""
${cvText || '(No CV provided)'}
"""

[FORMAT] Return JSON only — an array of evidence objects ranked from most to least relevant, no prose, no code fences:
[
  {
    "type": "publication | patent | grant | award | prototype | other",
    "title": "Title or name",
    "year": "year",
    "description": "1–2 sentence description",
    "significance": "why this matters as evidence"
  }
]`,
  },
  {
    id: 'impact',
    number: 6,
    title: 'Impact',
    titleTh: 'ผลกระทบ',
    outputType: 'selectable-list',
    description: 'Outcomes and value created',
    buildPrompt: ({ cvText, profile, projects }) => `[ROLE] You are a research-portfolio editor for the Maejo University Deep Mentorship Program.

[TASK] Suggest 8–12 specific impact statements for this researcher — outcomes and value created through their research, for communities, industries, or policy.

[CONTEXT] Researcher: ${profile?.name || ''}
Domain: ${profile?.domain || ''}
Selected projects: ${projects?.map(p => p.title).join(', ') || ''}
CV TEXT:
"""
${cvText || '(No CV provided)'}
"""

[FORMAT] Return JSON only — an array of impact statement strings (each 1–2 sentences), no prose, no code fences:
["Impact statement 1", "Impact statement 2", ...]`,
  },
  {
    id: 'reflection',
    number: 7,
    title: 'Reflection',
    titleTh: 'การสะท้อนคิด',
    outputType: 'text',
    description: 'Self-assessment + mentoring readiness',
    buildPrompt: ({ profile, skills, projects, impact }) => `[ROLE] You are a research-portfolio editor and reflective practice coach for the Maejo University Deep Mentorship Program.

[TASK] Help this researcher write a thoughtful reflection statement (3–5 paragraphs) covering: (1) their unique contribution as a mentor, (2) how their research journey prepares them to guide entrepreneurial students, (3) their vision for the mentor-mentee relationship, and (4) their readiness and commitment to deep mentorship.

[CONTEXT] Researcher: ${profile?.name || ''}
Domain: ${profile?.domain || ''}
Key skills: ${skills?.slice(0, 5).join(', ') || ''}
Key projects: ${projects?.slice(0, 3).map(p => p.title).join(', ') || ''}
Selected impacts: ${impact?.slice(0, 3).join('; ') || ''}
Portfolio statement: ${profile?.statement || ''}

[FORMAT] Return a well-structured reflection in plain prose (no JSON, no bullet points). Write in first person, authentic voice, suitable for a mentorship program portfolio.`,
  },
];

export const STEP_IDS = STEPS.map(s => s.id);
