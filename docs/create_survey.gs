/**
 * create_survey.gs
 *
 * Google Apps Script — creates the bilingual (Thai/English) survey for the paper:
 * "AI-Assisted vs. Traditional Tech Portfolio Workshop"
 * Maejo University Deep Mentorship Program — FY2569
 *
 * HOW TO RUN:
 *   1. Go to https://script.google.com  →  New project
 *   2. Paste this entire file, replacing the default content
 *   3. Click Run → createWorkshopSurvey
 *   4. Grant permissions when prompted
 *   5. Open Execution log (View → Logs) to find the form URL
 */

function createWorkshopSurvey() {

  // ─── Create form ────────────────────────────────────────────────────────────

  var form = FormApp.create(
    'AI-Assisted vs. Traditional Workshop Survey  |  ' +
    'แบบสอบถามการเปรียบเทียบ Workshop Tech Portfolio แบบดั้งเดิมและแบบที่ใช้ AI ช่วย'
  );

  form.setDescription(
    'Maejo University Deep Mentorship Program — FY2569\n' +
    'มหาวิทยาลัยแม่โจ้ — โครงการ Deep Mentorship ปีงบประมาณ 2569\n\n' +
    'This survey compares your experience with the AI-assisted Tech Portfolio workshop versus ' +
    'a traditional workshop. Estimated time: 10–12 minutes. ' +
    'Your responses are anonymous and used for research purposes only.\n\n' +
    'แบบสอบถามนี้เปรียบเทียบประสบการณ์ใน Workshop Tech Portfolio ที่ใช้ AI ช่วยกับแบบดั้งเดิม ' +
    'ใช้เวลาประมาณ 10–12 นาที คำตอบของท่านเป็นความลับและใช้เพื่อการวิจัยเท่านั้น'
  );

  form.setConfirmationMessage(
    'Thank you for completing the survey!\n' +
    'ขอบคุณมากสำหรับการตอบแบบสอบถาม!'
  );

  form.setAllowResponseEdits(true);
  form.setCollectEmail(false);

  // ─── Helper ─────────────────────────────────────────────────────────────────

  function likert(title) {
    form.addScaleItem()
      .setTitle(title)
      .setBounds(1, 5)
      .setLabels(
        'Strongly Disagree\nไม่เห็นด้วยอย่างยิ่ง',
        'Strongly Agree\nเห็นด้วยอย่างยิ่ง'
      )
      .setRequired(true);
  }

  function comparison(title) {
    form.addScaleItem()
      .setTitle(title)
      .setBounds(1, 5)
      .setLabels(
        'Much better with Traditional\nดีกว่ามากกับแบบดั้งเดิม',
        'Much better with AI\nดีกว่ามากกับการใช้ AI ช่วย'
      )
      .setRequired(true);
  }

  function subheader(title) {
    form.addSectionHeaderItem().setTitle(title);
  }

  // ─── SECTION 1: Participant Profile ─────────────────────────────────────────

  subheader(
    'Section 1 — Participant Profile\nข้อมูลพื้นฐานของผู้ตอบแบบสอบถาม'
  );

  form.addMultipleChoiceItem()
    .setTitle('1.  Current academic position\nตำแหน่งทางวิชาการปัจจุบัน')
    .setChoiceValues([
      'Lecturer / Instructor  |  อาจารย์ / ผู้สอน',
      'Assistant Professor  |  ผู้ช่วยศาสตราจารย์',
      'Associate Professor  |  รองศาสตราจารย์',
      'Professor  |  ศาสตราจารย์',
      'Researcher  |  นักวิจัย',
      'Other  |  อื่น ๆ'
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('2.  Years in research or academic work\nจำนวนปีที่ทำงานด้านการวิจัยหรือวิชาการ')
    .setChoiceValues([
      'Less than 5 years  |  น้อยกว่า 5 ปี',
      '5–10 years  |  5–10 ปี',
      '11–20 years  |  11–20 ปี',
      'More than 20 years  |  มากกว่า 20 ปี'
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('3.  Primary research field\nสาขาวิจัยหลัก')
    .setChoiceValues([
      'Agriculture  |  เกษตรศาสตร์',
      'Food Science  |  วิทยาศาสตร์การอาหาร',
      'Health Sciences  |  วิทยาศาสตร์สุขภาพ',
      'Other  |  อื่น ๆ'
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('4.  Prior experience with AI tools before this workshop\nประสบการณ์การใช้เครื่องมือ AI ก่อนเข้าร่วม Workshop นี้')
    .setChoiceValues([
      'None  |  ไม่มีประสบการณ์',
      'Minimal — heard about it but rarely used  |  น้อยมาก — เคยได้ยินแต่แทบไม่ได้ใช้',
      'Moderate — occasionally use tools like ChatGPT  |  ปานกลาง — ใช้เป็นครั้งคราว เช่น ChatGPT',
      'Extensive — regularly use multiple AI tools  |  มาก — ใช้ AI หลายตัวเป็นประจำ'
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle(
      '5.  Have you participated in a traditional portfolio or self-profiling workshop before?\n' +
      'เคยเข้าร่วม Workshop ทำ Portfolio หรือประเมินตนเองแบบดั้งเดิมมาก่อนหรือไม่?'
    )
    .setChoiceValues([
      'Yes  |  เคย',
      'No  |  ไม่เคย',
      'Not sure  |  ไม่แน่ใจ'
    ])
    .setRequired(true);

  // ─── SECTION 2: Traditional Workshop Perception ─────────────────────────────

  form.addPageBreakItem()
    .setTitle(
      'Section 2 — Traditional Workshop Perception\nทัศนคติต่อ Workshop แบบดั้งเดิม'
    )
    .setHelpText(
      'Think about how a workshop without AI assistance would feel, or recall a past similar experience.\n' +
      'ลองนึกถึงความรู้สึกหาก Workshop ไม่มี AI ช่วย หรือนึกถึงประสบการณ์ที่คล้ายกันในอดีต\n\n' +
      'Scale:  1 = Strongly Disagree / ไม่เห็นด้วยอย่างยิ่ง   ·   5 = Strongly Agree / เห็นด้วยอย่างยิ่ง'
    );

  likert(
    '6.  Without AI, I could clearly articulate my research strengths on my own.\n' +
    'หากไม่มี AI ช่วย ฉันสามารถอธิบายจุดแข็งด้านการวิจัยของตนเองได้อย่างชัดเจน'
  );
  likert(
    '7.  Writing a professional portfolio statement manually would be straightforward.\n' +
    'การเขียน Portfolio แบบมืออาชีพด้วยตนเองโดยไม่มี AI นั้นไม่ยาก'
  );
  likert(
    '8.  A traditional workshop without AI would take more time to complete.\n' +
    'Workshop แบบดั้งเดิมที่ไม่มี AI จะใช้เวลามากกว่าในการทำให้เสร็จสมบูรณ์'
  );
  likert(
    '9.  I would feel confident in the quality of a manually-drafted portfolio.\n' +
    'ฉันจะมั่นใจในคุณภาพของ Portfolio ที่เขียนด้วยตนเองโดยไม่มี AI'
  );
  likert(
    '10.  Self-reflection without AI prompts would be difficult.\n' +
    'การสะท้อนตนเองโดยไม่มีคำแนะนำจาก AI เป็นสิ่งที่ทำได้ยาก'
  );
  likert(
    '11.  A traditional workshop would help me identify my commercialization gaps effectively.\n' +
    'Workshop แบบดั้งเดิมจะช่วยให้ฉันระบุช่องว่างด้านการนำงานวิจัยไปใช้เชิงพาณิชย์ได้อย่างมีประสิทธิภาพ'
  );

  // ─── SECTION 3: AI-Assisted Workshop Experience ──────────────────────────────

  form.addPageBreakItem()
    .setTitle(
      'Section 3 — AI-Assisted Workshop Experience\nประสบการณ์ใน Workshop ที่ใช้ AI ช่วย'
    )
    .setHelpText(
      'Scale:  1 = Strongly Disagree / ไม่เห็นด้วยอย่างยิ่ง   ·   5 = Strongly Agree / เห็นด้วยอย่างยิ่ง'
    );

  subheader('Perceived Ease of Use  |  การรับรู้ความง่ายในการใช้งาน');

  likert(
    '12.  The AI-assisted tool was easy to learn and use.\n' +
    'เครื่องมือที่ใช้ AI ช่วยนั้นเรียนรู้และใช้งานได้ง่าย'
  );
  likert(
    '13.  The AI suggestions were presented clearly and were easy to understand.\n' +
    'คำแนะนำจาก AI ถูกนำเสนออย่างชัดเจนและเข้าใจง่าย'
  );
  likert(
    '14.  I could easily edit or adjust the AI-generated content to match my needs.\n' +
    'ฉันสามารถแก้ไขหรือปรับเนื้อหาที่ AI สร้างขึ้นให้ตรงกับความต้องการของตนเองได้ง่าย'
  );
  likert(
    '15.  The step-by-step AI guidance helped me stay on track throughout the workshop.\n' +
    'การแนะนำทีละขั้นตอนของ AI ช่วยให้ฉันดำเนินการได้อย่างถูกทิศทางตลอด Workshop'
  );

  subheader('Perceived Usefulness  |  การรับรู้ประโยชน์');

  likert(
    '16.  The AI assistance helped me complete the portfolio faster than I could have done manually.\n' +
    'ความช่วยเหลือจาก AI ทำให้ฉันสามารถทำ Portfolio เสร็จได้เร็วกว่าการทำด้วยตนเอง'
  );
  likert(
    '17.  The AI-generated content accurately reflected my research profile and expertise.\n' +
    'เนื้อหาที่ AI สร้างขึ้นสะท้อนโปรไฟล์และความเชี่ยวชาญด้านการวิจัยของฉันได้อย่างถูกต้อง'
  );
  likert(
    '18.  AI suggestions helped me identify strengths I had not previously considered.\n' +
    'คำแนะนำจาก AI ช่วยให้ฉันค้นพบจุดแข็งที่ตนเองไม่เคยนึกถึงมาก่อน'
  );
  likert(
    '19.  The AI tool was useful for identifying my commercialization gaps.\n' +
    'เครื่องมือ AI มีประโยชน์ในการระบุช่องว่างด้านการนำงานวิจัยไปใช้เชิงพาณิชย์'
  );
  likert(
    '20.  The AI-generated mentoring plan was relevant and practical.\n' +
    'แผนการ Mentoring ที่ AI สร้างขึ้นมีความเกี่ยวข้องและสามารถนำไปใช้ได้จริง'
  );

  subheader('Engagement & Control  |  การมีส่วนร่วมและการควบคุม');

  likert(
    '21.  I felt actively engaged throughout the AI-assisted workshop.\n' +
    'ฉันรู้สึกมีส่วนร่วมอย่างแข็งขันตลอด Workshop ที่มี AI ช่วย'
  );
  likert(
    '22.  The AI assistance reduced the mental effort of writing.\n' +
    'ความช่วยเหลือจาก AI ช่วยลดภาระทางความคิดในการเขียน'
  );
  likert(
    '23.  I had sufficient control over the final content despite AI involvement.\n' +
    'ฉันมีการควบคุมเนื้อหาขั้นสุดท้ายอย่างเพียงพอแม้จะมี AI เข้ามาเกี่ยวข้อง'
  );
  likert(
    '24.  I trusted the AI-generated content enough to use it as a meaningful starting point.\n' +
    'ฉันเชื่อถือเนื้อหาที่ AI สร้างขึ้นเพียงพอที่จะใช้เป็นจุดเริ่มต้นที่มีคุณค่า'
  );

  // ─── SECTION 4: Direct Comparison ───────────────────────────────────────────

  form.addPageBreakItem()
    .setTitle(
      'Section 4 — Direct Comparison\nการเปรียบเทียบโดยตรง'
    )
    .setHelpText(
      'For each dimension, rate which approach performed better.\n' +
      'สำหรับแต่ละมิติ กรุณาระบุว่าแนวทางใดให้ผลดีกว่า\n\n' +
      '1 = Much better with Traditional  /  ดีกว่ามากกับแบบดั้งเดิม\n' +
      '3 = About the same  /  พอ ๆ กัน\n' +
      '5 = Much better with AI-Assisted  /  ดีกว่ามากกับการใช้ AI ช่วย'
    );

  comparison(
    '25.  Overall efficiency of completing the portfolio\n' +
    'ประสิทธิภาพโดยรวมในการทำ Portfolio ให้เสร็จสมบูรณ์'
  );
  comparison(
    '26.  Quality of the final portfolio output\n' +
    'คุณภาพของ Portfolio ที่ได้รับในขั้นสุดท้าย'
  );
  comparison(
    '27.  Depth of self-reflection achieved\n' +
    'ความลึกของการสะท้อนตนเองที่เกิดขึ้น'
  );
  comparison(
    '28.  Ease of articulating research impact\n' +
    'ความง่ายในการอธิบายผลกระทบของงานวิจัย'
  );
  comparison(
    '29.  Time required to complete\n' +
    'ระยะเวลาที่ใช้ในการทำให้เสร็จสมบูรณ์'
  );
  comparison(
    '30.  Level of engagement during the process\n' +
    'ระดับการมีส่วนร่วมระหว่างกระบวนการ'
  );
  comparison(
    '31.  Confidence in the final output\n' +
    'ความมั่นใจในผลลัพธ์ขั้นสุดท้าย'
  );
  comparison(
    '32.  Ability to identify commercialization potential\n' +
    'ความสามารถในการระบุศักยภาพด้านการนำงานวิจัยไปใช้เชิงพาณิชย์'
  );

  // ─── SECTION 5: Acceptance & Intention to Use ───────────────────────────────

  form.addPageBreakItem()
    .setTitle(
      'Section 5 — Acceptance & Intention to Use\nการยอมรับและความตั้งใจจะใช้ต่อ'
    )
    .setHelpText(
      'Scale:  1 = Strongly Disagree / ไม่เห็นด้วยอย่างยิ่ง   ·   5 = Strongly Agree / เห็นด้วยอย่างยิ่ง'
    );

  likert(
    '33.  Overall, I prefer the AI-assisted workshop over a traditional one.\n' +
    'โดยรวม ฉันชอบ Workshop ที่มี AI ช่วยมากกว่าแบบดั้งเดิม'
  );
  likert(
    '34.  I would recommend this AI-assisted workshop to colleagues.\n' +
    'ฉันจะแนะนำ Workshop ที่มี AI ช่วยนี้ให้กับเพื่อนร่วมงาน'
  );
  likert(
    '35.  I would use this AI-assisted tool again for future portfolio updates.\n' +
    'ฉันจะใช้เครื่องมือ AI นี้อีกครั้งสำหรับการปรับปรุง Portfolio ในอนาคต'
  );
  likert(
    '36.  I am comfortable using AI-generated content as part of my professional profile.\n' +
    'ฉันรู้สึกสบายใจที่จะใช้เนื้อหาที่ AI สร้างขึ้นเป็นส่วนหนึ่งของโปรไฟล์วิชาชีพของฉัน'
  );

  // ─── SECTION 6: Learning Outcomes & Mentoring Readiness ─────────────────────

  form.addPageBreakItem()
    .setTitle(
      'Section 6 — Learning Outcomes & Mentoring Readiness\nผลลัพธ์การเรียนรู้และความพร้อมในการเป็น Mentor'
    )
    .setHelpText(
      'Scale:  1 = Strongly Disagree / ไม่เห็นด้วยอย่างยิ่ง   ·   5 = Strongly Agree / เห็นด้วยอย่างยิ่ง'
    );

  likert(
    '37.  This workshop helped me better understand my own research strengths and expertise.\n' +
    'Workshop นี้ช่วยให้ฉันเข้าใจจุดแข็งและความเชี่ยวชาญด้านการวิจัยของตนเองดีขึ้น'
  );
  likert(
    '38.  I feel more prepared to serve as a mentor after this workshop.\n' +
    'ฉันรู้สึกพร้อมมากขึ้นที่จะทำหน้าที่เป็น Mentor หลังจาก Workshop นี้'
  );
  likert(
    '39.  The AI-generated mentoring plan gave me practical ideas for mentoring sessions.\n' +
    'แผนการ Mentoring ที่ AI สร้างขึ้นให้แนวคิดที่นำไปปฏิบัติได้จริงสำหรับการประชุม Mentoring'
  );
  likert(
    '40.  I gained new insights about my research impact through the AI assistance.\n' +
    'ฉันได้รับมุมมองใหม่เกี่ยวกับผลกระทบของงานวิจัยผ่านความช่วยเหลือจาก AI'
  );
  likert(
    '41.  I feel confident using the portfolio created in this workshop for real mentoring purposes.\n' +
    'ฉันมีความมั่นใจในการนำ Portfolio ที่สร้างจาก Workshop นี้ไปใช้ใน Mentoring จริง'
  );
  likert(
    '42.  This workshop changed how I think about the value of my own research.\n' +
    'Workshop นี้เปลี่ยนวิธีที่ฉันมองคุณค่าของงานวิจัยของตนเอง'
  );

  // ─── SECTION 7: Open-Ended Feedback ─────────────────────────────────────────

  form.addPageBreakItem()
    .setTitle(
      'Section 7 — Open-Ended Feedback\nความคิดเห็นเพิ่มเติม'
    )
    .setHelpText(
      'Please respond in Thai or English. All questions are optional.\n' +
      'กรุณาตอบเป็นภาษาไทยหรือภาษาอังกฤษ ทุกข้อเป็นตัวเลือก ไม่บังคับตอบ'
    );

  form.addParagraphTextItem()
    .setTitle(
      '43.  What aspect of the AI-assisted workshop did you find most valuable?\n' +
      'ส่วนใดของ Workshop ที่มี AI ช่วยที่คุณพบว่ามีคุณค่ามากที่สุด?'
    )
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle(
      '44.  What aspect of the AI-assisted workshop could be improved?\n' +
      'ส่วนใดของ Workshop ที่มี AI ช่วยที่ควรได้รับการปรับปรุง?'
    )
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle(
      '45.  Compared to a traditional workshop, what do you think is the main advantage of AI assistance?\n' +
      'เมื่อเปรียบเทียบกับ Workshop แบบดั้งเดิม คุณคิดว่าข้อได้เปรียบหลักของการใช้ AI ช่วยคืออะไร?'
    )
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle(
      '46.  Do you have any concerns about using AI-generated content in your professional portfolio?\n' +
      'คุณมีข้อกังวลใด ๆ เกี่ยวกับการใช้เนื้อหาที่ AI สร้างขึ้นใน Portfolio วิชาชีพของคุณหรือไม่?'
    )
    .setRequired(false);

  // ─── Link a response spreadsheet ─────────────────────────────────────────────

  var ss = SpreadsheetApp.create(
    'Workshop Survey Responses — ' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd')
  );
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // ─── Log URLs ─────────────────────────────────────────────────────────────────

  Logger.log('========================================');
  Logger.log('FORM (share with participants):');
  Logger.log(form.getPublishedUrl());
  Logger.log('');
  Logger.log('FORM EDITOR (your edit link):');
  Logger.log(form.getEditUrl());
  Logger.log('');
  Logger.log('RESPONSE SPREADSHEET:');
  Logger.log(ss.getUrl());
  Logger.log('========================================');
}
