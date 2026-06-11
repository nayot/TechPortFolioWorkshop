import { OUTPUT_LANGUAGE_INSTRUCTION } from '../prompts.js';

const SYSTEM_PROMPT = `คุณเป็นผู้เชี่ยวชาญด้าน Technology Commercialisation และ Research Mentorship ในบริบทมหาวิทยาลัยวิจัยไทย

${OUTPUT_LANGUAGE_INSTRUCTION}
ตอบกลับเป็น JSON ที่ถูกต้องเท่านั้น ไม่ต้องมีคำอธิบาย ไม่ต้องมี markdown หรือ code fence`;

const ANTI = `ข้อจำกัดสำคัญ: ใช้เฉพาะข้อมูลที่ได้รับ ห้ามอ้างอิงข้อมูลที่ไม่มีในข้อมูลที่ให้มา`;

const SESSION_NAMES = ['สำรวจและสร้างความไว้วางใจ', 'เจาะลึกและพัฒนา', 'วางแผนก้าวต่อไป'];

function menteeBlock(d) {
  const profStr = d.profile?.name
    ? `ชื่อ: ${d.profile.name}, ตำแหน่ง: ${d.profile.position || ''}, สาขา: ${d.profile.domain || ''}, สังกัด: ${d.profile.institution || ''}`
    : JSON.stringify(d.profile);
  return `ข้อมูล Mentee Portfolio:
<mentee_profile>${profStr}</mentee_profile>
<mentee_skills>${d.skills.join(', ') || '(ยังไม่ระบุ)'}</mentee_skills>
<mentee_projects>${d.projects.map(p => `${p.title}: ${p.description || ''}`).join('\n') || '(ยังไม่ระบุ)'}</mentee_projects>
<mentee_process>${d.process.join(', ') || '(ยังไม่ระบุ)'}</mentee_process>`;
}

export function buildOverviewPrompt(menteeData, mentorProfile) {
  const user = `${menteeBlock(menteeData)}

${mentorProfile ? `ข้อมูล Mentor:\n${mentorProfile}\n` : ''}
งาน:
1. สรุป mentee เป็น 3–4 ประโยค: ใครคือเขา/เธอ จุดแข็งหลัก ความท้าทายที่ชัดเจน
2. ระบุ 2–3 จุดแข็งของ mentor ที่ "match" กับความต้องการของ mentee คนนี้โดยเฉพาะ

ตอบในรูปแบบ JSON:
{ "menteeSnapshot": "...", "mentorStrengths": "..." }

${ANTI}`;
  return { system: SYSTEM_PROMPT, user };
}

export function buildFullDraftPrompt(menteeData, mentorProfile, snapshot) {
  const user = `${menteeBlock(menteeData)}

${mentorProfile ? `ข้อมูล Mentor:\n${mentorProfile}\n` : ''}
${snapshot ? `Mentee Snapshot ที่วิเคราะห์ไว้แล้ว:\n<mentee_snapshot>${snapshot}</mentee_snapshot>\n` : ''}
งาน: ร่าง Mentoring Plan สำหรับ 3 sessions แรก

Session 1 = ${SESSION_NAMES[0]}
Session 2 = ${SESSION_NAMES[1]}
Session 3 = ${SESSION_NAMES[2]}

สำหรับแต่ละ Session ให้ระบุ:
- sessionGoal: เป้าหมายหลักของ session นี้ (1–2 ประโยค)
- diagnosticQuestions: คำถาม 3–5 ข้อที่ mentor ควรถามใน session นี้ (array of strings)
- gapsToClose: ช่องว่างหรือปัญหาที่ session นี้ควรปิด (1–2 ประโยค)
- successMarkers: สัญญาณที่บอกว่า session สำเร็จ (1–2 ประโยค)

ตอบในรูปแบบ JSON:
{
  "sessions": [
    { "sessionNumber": 1, "sessionGoal": "...", "diagnosticQuestions": ["...", "...", "..."], "gapsToClose": "...", "successMarkers": "..." },
    { "sessionNumber": 2, "sessionGoal": "...", "diagnosticQuestions": ["...", "...", "..."], "gapsToClose": "...", "successMarkers": "..." },
    { "sessionNumber": 3, "sessionGoal": "...", "diagnosticQuestions": ["...", "...", "..."], "gapsToClose": "...", "successMarkers": "..." }
  ]
}

${ANTI}
คำถาม diagnostic ต้องเป็นคำถามปลายเปิดที่เจาะจงกับ mentee คนนี้ ไม่ใช่คำถาม generic
แต่ละ session ต้องแตกต่างกันชัดเจน ไม่ซ้ำกัน`;
  return { system: SYSTEM_PROMPT, user };
}

export function buildSingleFieldPrompt(fieldName, sessionIndex, planState, menteeData) {
  const snapshot = planState.menteeSnapshot || '';
  const session = sessionIndex !== null ? planState.sessions[sessionIndex] : null;
  const sessionNum = sessionIndex !== null ? sessionIndex + 1 : null;
  const sessionName = session ? (session.sessionName || SESSION_NAMES[sessionIndex]) : '';

  let taskDesc, jsonShape;

  if (fieldName === 'menteeSnapshot') {
    taskDesc = 'สรุป mentee ใหม่ เป็น 3–4 ประโยค: ใครคือเขา/เธอ จุดแข็งหลัก ความท้าทายที่ชัดเจน';
    jsonShape = '{ "menteeSnapshot": "..." }';
  } else if (fieldName === 'mentorStrengths') {
    taskDesc = 'ระบุ 2–3 จุดแข็งของ mentor ที่ match กับความต้องการของ mentee คนนี้โดยเฉพาะ';
    jsonShape = '{ "mentorStrengths": "..." }';
  } else if (fieldName === 'sessionGoal') {
    taskDesc = `ร่าง sessionGoal สำหรับ Session ${sessionNum} (${sessionName}) ใหม่ (1–2 ประโยค)`;
    jsonShape = '{ "sessionGoal": "..." }';
  } else if (fieldName === 'diagnosticQuestions') {
    taskDesc = `ร่าง diagnostic questions สำหรับ Session ${sessionNum} (${sessionName}) ใหม่ (3–5 คำถาม)\nคำถามต้องเป็นปลายเปิด เจาะจงกับ mentee คนนี้ และสอดคล้องกับเป้าหมาย session`;
    jsonShape = '{ "diagnosticQuestions": ["...", "...", "..."] }';
  } else if (fieldName === 'gapsToClose') {
    taskDesc = `ร่าง gapsToClose สำหรับ Session ${sessionNum} (${sessionName}) ใหม่ (1–2 ประโยค)`;
    jsonShape = '{ "gapsToClose": "..." }';
  } else if (fieldName === 'successMarkers') {
    taskDesc = `ร่าง successMarkers สำหรับ Session ${sessionNum} (${sessionName}) ใหม่ (1–2 ประโยค)`;
    jsonShape = '{ "successMarkers": "..." }';
  }

  const user = `${menteeBlock(menteeData)}

${snapshot ? `Mentee Snapshot:\n<mentee_snapshot>${snapshot}</mentee_snapshot>\n` : ''}
${session?.sessionGoal && fieldName !== 'sessionGoal' ? `Session Goal ของ Session ${sessionNum}:\n<session_goal>${session.sessionGoal}</session_goal>\n` : ''}
งาน: ${taskDesc}

ตอบในรูปแบบ JSON:
${jsonShape}

${ANTI}`;
  return { system: SYSTEM_PROMPT, user };
}
