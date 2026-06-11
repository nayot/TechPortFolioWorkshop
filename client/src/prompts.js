// ─── Shared constants ─────────────────────────────────────────────────────────
// Switch this one line to change the output language across all steps.
export const OUTPUT_LANGUAGE_INSTRUCTION = `ใช้ภาษาไทยเป็นภาษาหลักในทุกคำแถลงและคำอธิบาย คงศัพท์เทคนิค ชื่อเฉพาะ และชื่องานวิจัยไว้ในรูปเดิม (มักเป็นภาษาอังกฤษ) ใช้ "นักวิจัย" เป็นสรรพนามบุรุษที่สามเสมอ ห้ามใช้ "คุณ" หรือ "ท่าน" เมื่อกล่าวถึงนักวิจัย`;

const JSON_ONLY = `ตอบกลับเป็น JSON ที่ถูกต้องเท่านั้น ไม่ต้องมีคำอธิบาย ไม่ต้องมี markdown หรือ code fence`;

const ANTI_HALLUCINATION = `ใช้เฉพาะข้อมูลที่ปรากฏใน CV หรือที่ผู้ใช้ระบุเท่านั้น ห้ามสร้างชื่อผลงาน ตัวเลข การอ้างอิง รางวัล ทุน หรือข้อเท็จจริงขึ้นเอง หากข้อมูลไม่เพียงพอ ให้เว้นว่างและทำเครื่องหมายว่า "ต้องการข้อมูลเพิ่มเติม"`;

// Parameterised rewrite template — used by Profile, Skills, Reflection.
function makeRewritePrompt(componentName) {
  return (userEditedText) =>
    `[ROLE] บรรณาธิการ Tech Portfolio โครงการ Deep Mentorship Program มหาวิทยาลัยแม่โจ้
[TASK] ปรับปรุงคำแถลง${componentName}ฉบับที่ผู้ใช้แก้ไข ให้กระชับ ชัดเจน และสอดคล้องกับกรอบ Tech Portfolio โดยคงความหมายและข้อเท็จจริงที่ผู้ใช้ระบุไว้ทุกประการ
[CONTEXT] คำแถลงฉบับผู้ใช้แก้ไข:
"""${userEditedText}"""
ใช้บริบทจากองค์ประกอบที่เลือกไว้ก่อนหน้า
[FORMAT] JSON: { "statement": "..." } — ห้ามเพิ่มข้อเท็จจริงใหม่ที่ผู้ใช้ไม่ได้ระบุ
${OUTPUT_LANGUAGE_INSTRUCTION}
${JSON_ONLY}`;
}

// ─── Step definitions ──────────────────────────────────────────────────────────
// Wizard order: Profile · Skills · Projects · Process · Evidence · Impact ·
//               Commercialization Gaps (diagnostic, excluded from export) · Reflection (closing)
export const STEPS = [
  // ── 1. Profile ──────────────────────────────────────────────────────────────
  {
    id: 'profile',
    number: 1,
    title: 'Profile',
    titleTh: 'โปรไฟล์',
    outputType: 'json-profile',
    description: 'ตัวตนและคำแถลงการวางตำแหน่งของนักวิจัย',
    buildRewritePrompt: makeRewritePrompt('โปรไฟล์'),
    buildPrompt: ({ cvText }) =>
      `[ROLE] คุณคือบรรณาธิการ Tech Portfolio สำหรับโครงการ Deep Mentorship Program ของมหาวิทยาลัยแม่โจ้ (FY2569)

[TASK] จากประวัติย่อ (CV) ด้านล่าง ให้ (ก) ดึงข้อมูลโปรไฟล์ที่มีโครงสร้าง และ (ข) เขียนคำแถลงโปรไฟล์/การวางตำแหน่ง 4–6 ประโยค

[CONTEXT] Portfolio นี้เป็นภาษากลางระหว่างพี่เลี้ยง ลูกศิษย์ และผู้ให้ทุน โปรไฟล์ควรสื่อถึงเอกลักษณ์ สาขาวิจัย การวางตำแหน่งที่โดดเด่น และทิศทางในอนาคต นักวิจัยเป็นอาจารย์หรือนักวิจัยของมหาวิทยาลัยแม่โจ้ที่จะเป็นพี่เลี้ยงให้นักศึกษาด้านเกษตร อาหาร และสุขภาพ
${OUTPUT_LANGUAGE_INSTRUCTION}
CV:
"""
${cvText || '(ไม่มี CV — กรุณากรอกข้อมูลในแบบฟอร์มด้วยตนเอง)'}
"""

[FORMAT] ${JSON_ONLY}:
{
  "name": "ชื่อ-สกุล และตำแหน่งทางวิชาการ",
  "position": "ตำแหน่งและภาควิชา",
  "institution": "มหาวิทยาลัย/หน่วยงาน",
  "domain": "สาขาวิจัยหลัก",
  "expertise": ["คีย์เวิร์ด1", "คีย์เวิร์ด2", "คีย์เวิร์ด3"],
  "brief": "สรุปโปรไฟล์ 2–3 ประโยค เป็นภาษาไทย",
  "statement": "คำแถลงโปรไฟล์/การวางตำแหน่ง 4–6 ประโยค เป็นภาษาไทย ใช้ 'นักวิจัย' แทน 'ผม/ดิฉัน'"
}`,
  },

  // ── 2. Skills ───────────────────────────────────────────────────────────────
  {
    id: 'skills',
    number: 2,
    title: 'Skills',
    titleTh: 'ทักษะ',
    outputType: 'selectable-list',
    description: 'ความสามารถทางเทคนิคและสาขาวิชาที่สอดคล้องกับธีมงาน',
    buildRewritePrompt: makeRewritePrompt('ทักษะ'),
    buildPrompt: ({ cvText, profile }) =>
      `[ROLE] คุณคือบรรณาธิการ Tech Portfolio สำหรับโครงการ Deep Mentorship Program ของมหาวิทยาลัยแม่โจ้

[TASK] เสนอรายการทักษะเฉพาะด้านเทคนิคและสาขาวิชา 10–15 รายการ สำหรับนักวิจัยคนนี้ โดยสอดคล้องกับสาขาวิจัยและความเกี่ยวข้องกับการเป็นพี่เลี้ยงนักศึกษาด้านเกษตร อาหาร และสุขภาพ

[CONTEXT] โปรไฟล์นักวิจัย: ${profile?.statement || '(ดูจาก CV)'}
สาขาวิจัย: ${profile?.domain || ''}
ความเชี่ยวชาญ: ${profile?.expertise?.join(', ') || ''}
${OUTPUT_LANGUAGE_INSTRUCTION}
CV:
"""
${cvText || '(ไม่มี CV)'}
"""

[FORMAT] ${JSON_ONLY}:
{
  "brief": "สรุปภาพรวมทักษะของนักวิจัย 2–3 ประโยค เป็นภาษาไทย ใช้ 'นักวิจัย' แทน 'ผม/ดิฉัน'",
  "items": ["ทักษะที่ 1", "ทักษะที่ 2", ...]
}`,
  },

  // ── 3. Projects ─────────────────────────────────────────────────────────────
  // NOTE: Google Scholar reference generation removed (no live web access via OpenRouter).
  // References field is populated only from CV-sourced data.
  // Future: enrich via Crossref / Semantic Scholar server-side API (separate task).
  {
    id: 'projects',
    number: 3,
    title: 'Projects',
    titleTh: 'โครงการ',
    outputType: 'selectable-cards',
    description: 'โครงการวิจัย/นวัตกรรมสำคัญ',
    buildPrompt: ({ cvText, profile, skills }) =>
      `[ROLE] คุณคือบรรณาธิการ Tech Portfolio สำหรับโครงการ Deep Mentorship Program ของมหาวิทยาลัยแม่โจ้

[TASK] ดึงโครงการวิจัย/นวัตกรรมสำคัญจาก CV นี้ แล้วจัดอันดับตามผลกระทบและความเกี่ยวข้องกับการเป็นพี่เลี้ยงด้านเกษตร อาหาร และสุขภาพ รวมเฉพาะข้อมูลการอ้างอิงที่ปรากฏใน CV จริงเท่านั้น

[CONTEXT] นักวิจัย: ${profile?.name || ''}
สาขา: ${profile?.domain || ''}
ความเชี่ยวชาญ: ${profile?.expertise?.join(', ') || ''}
ทักษะที่มี: ${Array.isArray(skills) ? skills.join(', ') : ''}
${ANTI_HALLUCINATION}
${OUTPUT_LANGUAGE_INSTRUCTION}
CV:
"""
${cvText || '(ไม่มี CV)'}
"""

[FORMAT] ${JSON_ONLY}:
{
  "brief": "สรุปภาพรวมโครงการของนักวิจัย 2–3 ประโยค เป็นภาษาไทย ใช้ 'นักวิจัย' แทน 'ผม/ดิฉัน'",
  "items": [
    {
      "title": "ชื่อโครงการ",
      "period": "ปี หรือช่วงเวลา",
      "description": "คำอธิบาย 2–3 ประโยค เป็นภาษาไทย",
      "impact": "ผลลัพธ์หรือผลกระทบหลัก เป็นภาษาไทย",
      "relevance": "เหตุผลที่เกี่ยวข้องกับการเป็นพี่เลี้ยง เป็นภาษาไทย",
      "references": ["เฉพาะการอ้างอิงที่ปรากฏใน CV จริง — เว้นว่างถ้าไม่มี"]
    }
  ]
}`,
  },

  // ── 4. Process ──────────────────────────────────────────────────────────────
  {
    id: 'process',
    number: 4,
    title: 'Process',
    titleTh: 'กระบวนการ',
    outputType: 'selectable-list',
    description: 'วิธีการทำงานและกระบวนการวิจัยของนักวิจัย',
    buildPrompt: ({ cvText, profile, skills }) =>
      `[ROLE] คุณคือบรรณาธิการ Tech Portfolio สำหรับโครงการ Deep Mentorship Program ของมหาวิทยาลัยแม่โจ้

[TASK] เสนอรายการคำอธิบายกระบวนการวิจัย/นวัตกรรม 8–12 รายการ — วิธีการทำงานของนักวิจัย วิธีการวิจัย และแนวทางการแปลงผลวิจัยสู่การใช้งานจริง

[CONTEXT] นักวิจัย: ${profile?.name || ''}
สาขา: ${profile?.domain || ''}
ทักษะที่เลือก: ${Array.isArray(skills) ? skills.join(', ') : ''}
${OUTPUT_LANGUAGE_INSTRUCTION}
CV:
"""
${cvText || '(ไม่มี CV)'}
"""

[FORMAT] ${JSON_ONLY}:
{
  "brief": "สรุปกระบวนการทำงานและปรัชญาการวิจัยของนักวิจัย 2–3 ประโยค เป็นภาษาไทย ใช้ 'นักวิจัย' แทน 'ผม/ดิฉัน'",
  "items": ["กระบวนการที่ 1", "กระบวนการที่ 2", ...]
}`,
  },

  // ── 5. Evidence ─────────────────────────────────────────────────────────────
  {
    id: 'evidence',
    number: 5,
    title: 'Evidence',
    titleTh: 'หลักฐาน',
    outputType: 'selectable-cards',
    description: 'หลักฐานยืนยัน: ผลงานวิชาการ สิทธิบัตร ทุนวิจัย ต้นแบบ',
    buildPrompt: ({ cvText, profile, skills, projects }) =>
      `[ROLE] คุณคือบรรณาธิการ Tech Portfolio สำหรับโครงการ Deep Mentorship Program ของมหาวิทยาลัยแม่โจ้

[TASK] ดึงและจัดอันดับหลักฐาน (ผลงานวิชาการ สิทธิบัตร ทุนวิจัย รางวัล ต้นแบบ การสาธิต) จาก CV นี้ ตามความเกี่ยวข้องกับการวางตำแหน่งนักวิจัยในฐานะพี่เลี้ยงสำหรับผู้ประกอบการด้านเกษตร อาหาร และสุขภาพ

[CONTEXT] นักวิจัย: ${profile?.name || ''}
สาขา: ${profile?.domain || ''}
ทักษะ: ${Array.isArray(skills) ? skills.join(', ') : ''}
โครงการที่เลือก: ${Array.isArray(projects) ? projects.map(p => p.title).join(', ') : ''}
${ANTI_HALLUCINATION}
${OUTPUT_LANGUAGE_INSTRUCTION}
CV:
"""
${cvText || '(ไม่มี CV)'}
"""

[FORMAT] ${JSON_ONLY}:
{
  "brief": "สรุปหลักฐานและความสำเร็จของนักวิจัย 2–3 ประโยค เป็นภาษาไทย ใช้ 'นักวิจัย' แทน 'ผม/ดิฉัน'",
  "items": [
    {
      "type": "publication | patent | grant | award | prototype | other",
      "title": "ชื่อผลงานหรือรางวัล (ตามที่ปรากฏใน CV)",
      "year": "ปี",
      "description": "คำอธิบาย 1–2 ประโยค เป็นภาษาไทย",
      "significance": "เหตุผลที่สำคัญ เป็นภาษาไทย"
    }
  ]
}`,
  },

  // ── 6. Impact ───────────────────────────────────────────────────────────────
  {
    id: 'impact',
    number: 6,
    title: 'Impact',
    titleTh: 'ผลกระทบ',
    outputType: 'selectable-list',
    description: 'ผลลัพธ์และคุณค่าที่สร้างขึ้น',
    buildPrompt: ({ cvText, profile, skills, projects, evidence }) =>
      `[ROLE] คุณคือบรรณาธิการ Tech Portfolio สำหรับโครงการ Deep Mentorship Program ของมหาวิทยาลัยแม่โจ้

[TASK] เสนอคำแถลงผลกระทบ 8–12 รายการ สำหรับนักวิจัยคนนี้ — ผลลัพธ์และคุณค่าที่เกิดขึ้นจากงานวิจัย ต่อชุมชน อุตสาหกรรม หรือนโยบาย

[CONTEXT] นักวิจัย: ${profile?.name || ''}
สาขา: ${profile?.domain || ''}
ทักษะ: ${Array.isArray(skills) ? skills.slice(0, 8).join(', ') : ''}
โครงการที่เลือก: ${Array.isArray(projects) ? projects.map(p => p.title).join(', ') : ''}
หลักฐาน/ผลงานที่เลือก: ${Array.isArray(evidence) ? evidence.map(e => e.title).join(', ') : ''}
${ANTI_HALLUCINATION}
${OUTPUT_LANGUAGE_INSTRUCTION}
CV:
"""
${cvText || '(ไม่มี CV)'}
"""

[FORMAT] ${JSON_ONLY}:
{
  "brief": "สรุปผลกระทบโดยรวมของงานวิจัย 2–3 ประโยค เป็นภาษาไทย ใช้ 'นักวิจัย' แทน 'ผม/ดิฉัน'",
  "items": ["คำแถลงผลกระทบที่ 1 (1–2 ประโยค)", "คำแถลงผลกระทบที่ 2", ...]
}`,
  },

  // ── 7. Commercialization Gaps — DIAGNOSTIC (excluded from portfolio export) ─
  {
    id: 'commercialization',
    number: 7,
    title: 'Commercialization Gaps',
    titleTh: 'ช่องว่างเชิงพาณิชย์',
    outputType: 'selectable-cards',
    description: 'วิเคราะห์ช่องว่างระหว่างงานวิจัยกับการนำไปใช้เชิงพาณิชย์ (เฉพาะพี่เลี้ยง)',
    diagnostic: true,
    excludeFromExport: true,
    buildPrompt: ({ cvText, profile, skills, projects, evidence, impact }) =>
      `[ROLE] คุณคือที่ปรึกษาเทคโนโลยีและนวัตกรรมสำหรับโครงการ Deep Mentorship Program ของมหาวิทยาลัยแม่โจ้ ผู้เชี่ยวชาญด้านการแปลงงานวิจัยสู่เชิงพาณิชย์ (Technology Transfer & Commercialization)

[TASK] วิเคราะห์ Portfolio ของนักวิจัยคนนี้และระบุ "ช่องว่างเชิงพาณิชย์" (Commercialization Gaps) — จุดที่งานวิจัยยังขาดหรือต้องการการพัฒนาเพื่อเข้าสู่ตลาดจริง เสนอ 5–8 ช่องว่างพร้อมคำแนะนำ

[CONTEXT] นักวิจัย: ${profile?.name || ''}
สาขา: ${profile?.domain || ''}
ทักษะ: ${Array.isArray(skills) ? skills.join(', ') : ''}
โครงการสำคัญ: ${Array.isArray(projects) ? projects.map(p => p.title).join(', ') : ''}
หลักฐาน: ${Array.isArray(evidence) ? evidence.map(e => e.title).join(', ') : ''}
ผลกระทบ: ${Array.isArray(impact) ? impact.slice(0, 4).join('; ') : ''}
${ANTI_HALLUCINATION}
${OUTPUT_LANGUAGE_INSTRUCTION}
CV:
"""
${cvText || '(ไม่มี CV)'}
"""

[FORMAT] ${JSON_ONLY}:
{
  "brief": "สรุปศักยภาพเชิงพาณิชย์และช่องว่างหลักของงานวิจัย 2–3 ประโยค เป็นภาษาไทย ใช้ 'นักวิจัย' แทน 'ผม/ดิฉัน'",
  "items": [
    {
      "gap": "ชื่อช่องว่าง (สั้น กระชับ)",
      "description": "คำอธิบายช่องว่าง 2–3 ประโยค เป็นภาษาไทย",
      "opportunity": "โอกาสเชิงพาณิชย์ที่เกิดขึ้น เป็นภาษาไทย",
      "barrier": "อุปสรรคหรือสิ่งที่ขาดหายในปัจจุบัน เป็นภาษาไทย",
      "recommendation": "คำแนะนำเชิงปฏิบัติ เป็นภาษาไทย"
    }
  ]
}`,
  },

  // ── 8. Reflection — closing canonical component ──────────────────────────────
  {
    id: 'reflection',
    number: 8,
    title: 'Reflection',
    titleTh: 'Reflection',
    outputType: 'selectable-cards',
    description: 'การสะท้อนคิดและความพร้อมในการเป็นพี่เลี้ยง',
    buildRewritePrompt: makeRewritePrompt('Reflection'),
    buildPrompt: ({ profile, skills, projects, evidence, impact }) =>
      `[ROLE] คุณคือโค้ชการสะท้อนคิด (Reflective Practice Coach) สำหรับโครงการ Deep Mentorship Program ของมหาวิทยาลัยแม่โจ้ (FY2569) ที่เน้นการพัฒนาผู้ประกอบการนักศึกษาในด้านเกษตร อาหาร และสุขภาพ

[TASK] สร้างตัวเลือก Reflection 3 แนวทาง สำหรับนักวิจัยคนนี้ แต่ละแนวทางต้องเน้น:
1. สิ่งที่นักวิจัยได้เรียนรู้จากเส้นทางวิจัยและนวัตกรรม — บทเรียนสำคัญที่ได้รับ
2. จุดที่นักวิจัยต้องการพัฒนาตนเองต่อไป — ทั้งด้านวิจัยและการเป็นพี่เลี้ยง
3. วิธีที่ประสบการณ์วิจัยเตรียมนักวิจัยสำหรับการแนะนำนักศึกษาผู้ประกอบการ
4. วิสัยทัศน์และความมุ่งมั่นในการเป็นพี่เลี้ยงเชิงลึก

[CONTEXT] นักวิจัย: ${profile?.name || ''}
สาขา: ${profile?.domain || ''}
โปรไฟล์: ${profile?.statement || profile?.brief || ''}
ทักษะสำคัญ: ${Array.isArray(skills) ? skills.slice(0, 6).join(', ') : ''}
โครงการสำคัญ: ${Array.isArray(projects) ? projects.slice(0, 3).map(p => p.title).join(', ') : ''}
หลักฐานผลงาน: ${Array.isArray(evidence) ? evidence.slice(0, 3).map(e => e.title).join(', ') : ''}
ผลกระทบ: ${Array.isArray(impact) ? impact.slice(0, 3).join('; ') : ''}
${OUTPUT_LANGUAGE_INSTRUCTION}

[FORMAT] ${JSON_ONLY}:
{
  "brief": "สรุปธีมหลักของ Reflection 2–3 ประโยค",
  "items": [
    {
      "title": "แนวทาง 1: [ชื่อแนวทาง เช่น เส้นทางแห่งการเรียนรู้และการเติบโต]",
      "text": "บท Reflection 3–4 ย่อหน้า เน้นสิ่งที่ได้เรียนรู้และจุดพัฒนาตนเอง"
    },
    {
      "title": "แนวทาง 2: [ชื่อแนวทาง เช่น จากห้องแล็บสู่การเป็นพี่เลี้ยง]",
      "text": "บท Reflection 3–4 ย่อหน้า เน้นวิสัยทัศน์และความพร้อมในการเป็นพี่เลี้ยง"
    },
    {
      "title": "แนวทาง 3: [ชื่อแนวทาง เช่น เชื่อมวิจัยกับผู้ประกอบการรุ่นใหม่]",
      "text": "บท Reflection 3–4 ย่อหน้า เน้นการเชื่อมโยงงานวิจัยกับการพัฒนาผู้ประกอบการ"
    }
  ]
}`,
  },
];

export const STEP_IDS = STEPS.map(s => s.id);
