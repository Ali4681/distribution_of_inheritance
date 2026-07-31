import type { Locale } from "@/lib/i18n";

const ARABIC_LEGAL_TEXT = new Map<string, string>([
  [
    "Qualified for inheritance analysis under Syrian Personal Status Law",
    "مؤهل لتحليل الإرث وفق قانون الأحوال الشخصية السوري",
  ],
  [
    "Article 275/276: father is closer than paternal grandfather",
    "المادة 275/276: الأب أقرب من الجد لأب",
  ],
  [
    "Article 283: grandmothers are blocked by the mother",
    "المادة 283: الجدات يحجبهن وجود الأم",
  ],
  [
    "Article 283: paternal grandmother is blocked by the father",
    "المادة 283: الجدة لأب يحجبها وجود الأب",
  ],
  [
    "Article 284: maternal siblings are blocked by father, paternal grandfather, child, or son of son",
    "المادة 284: الإخوة لأم يحجبهم الأب أو الجد لأب أو الولد أو ابن الابن",
  ],
  [
    "Article 286 by analogy with Article 275: full brothers are blocked by father or male descendant",
    "المادة 286 قياسًا على المادة 275: الإخوة الأشقاء يحجبهم الأب أو الفرع الوارث الذكر",
  ],
  [
    "Article 286: full sisters are blocked by father, son, or son of son",
    "المادة 286: الأخوات الشقيقات يحجبهن الأب أو الابن أو ابن الابن",
  ],
  [
    "Article 287 and Article 276: paternal siblings are blocked by father, male descendant, or stronger full brother",
    "المادة 287 والمادة 276: الإخوة والأخوات لأب يحجبهم الأب أو الفرع الوارث الذكر أو الأخ الشقيق الأقوى",
  ],
  [
    "Article 278/287: full sister as residuary with female descendants blocks paternal siblings",
    "المادة 278/287: الأخت الشقيقة إذا صارت عصبة مع البنات تحجب الإخوة والأخوات لأب",
  ],
  [
    "Article 287: two full sisters block paternal sisters unless a paternal brother makes them residuary",
    "المادة 287: الأختان الشقيقتان تحجبان الأخوات لأب ما لم يوجد أخ لأب يجعلهن عصبة",
  ],
  [
    "Article 275/276: son blocks lower descendants through sons",
    "المادة 275/276: الابن يحجب الفروع الأدنى من جهة الأبناء",
  ],
  [
    "Article 285: two daughters block daughters of son unless a son of son makes them residuary",
    "المادة 285: البنتان تحجبان بنات الابن ما لم يوجد ابن ابن يجعلهن عصبة",
  ],
  [
    "Articles 275/276: nearer residuary heir blocks agnatic uncles",
    "المادتان 275/276: العصبة الأقرب تحجب الأعمام العصبات",
  ],
  ["Article 268: husband fixed share", "المادة 268: للزوج فرض مقدر"],
  [
    "Article 268: wife fixed share, shared equally if multiple wives",
    "المادة 268: للزوجة فرض مقدر ويقسم بالتساوي عند التعدد",
  ],
  [
    "Article 271: mother takes one third of what remains after spouse in the two Umariyyatayn cases",
    "المادة 271: تأخذ الأم ثلث الباقي بعد الزوج أو الزوجة في العمريتين",
  ],
  ["Article 271: mother fixed share", "المادة 271: للأم فرض مقدر"],
  [
    "Article 266: father receives one sixth with descendants",
    "المادة 266: للأب السدس مع وجود الفرع الوارث",
  ],
  [
    "Article 266: paternal grandfather receives one sixth when father is absent and descendants exist",
    "المادة 266: للجد لأب السدس عند عدم الأب مع وجود الفرع الوارث",
  ],
  [
    "Article 272: fixed grandmothers share one sixth equally",
    "المادة 272: الجدات صاحبات الفرض يشتركن في السدس بالتساوي",
  ],
  ["Article 269: one daughter receives one half", "المادة 269: للبنت الواحدة النصف"],
  [
    "Article 269: multiple daughters share two thirds",
    "المادة 269: للبنات الثلثان عند التعدد",
  ],
  [
    "Article 269: one daughter of son receives one half when no daughter exists",
    "المادة 269: لبنت الابن الواحدة النصف عند عدم وجود بنت",
  ],
  [
    "Article 269: daughters of son share two thirds when no daughter exists",
    "المادة 269: لبنات الابن الثلثان عند التعدد وعدم وجود بنت",
  ],
  [
    "Article 269: daughters of son share one sixth with one daughter",
    "المادة 269: لبنات الابن السدس مع وجود بنت واحدة",
  ],
  [
    "Article 267: one maternal sibling receives one sixth",
    "المادة 267: للأخ أو الأخت لأم السدس عند الانفراد",
  ],
  [
    "Article 267: multiple maternal siblings share one third equally",
    "المادة 267: يشترك الإخوة لأم في الثلث بالتساوي عند التعدد",
  ],
  [
    "Article 270: one full sister receives one half",
    "المادة 270: للأخت الشقيقة الواحدة النصف",
  ],
  [
    "Article 270: multiple full sisters share two thirds",
    "المادة 270: للأخوات الشقيقات الثلثان عند التعدد",
  ],
  [
    "Article 270: one paternal sister receives one half when no full sister exists",
    "المادة 270: للأخت لأب الواحدة النصف عند عدم وجود أخت شقيقة",
  ],
  [
    "Article 270: paternal sisters share two thirds when no full sister exists",
    "المادة 270: للأخوات لأب الثلثان عند التعدد وعدم وجود أخت شقيقة",
  ],
  [
    "Article 270: paternal sisters share one sixth with one full sister",
    "المادة 270: للأخوات لأب السدس مع أخت شقيقة واحدة",
  ],
  [
    "Article 271: one third of remainder after spouse",
    "المادة 271: ثلث الباقي بعد الزوج أو الزوجة",
  ],
  [
    "Articles 274/277: sons inherit residue; male gets twice female",
    "المادتان 274/277: الأبناء يرثون الباقي، وللذكر مثل حظ الأنثيين",
  ],
  [
    "Articles 274/277: daughters inherit residue with sons",
    "المادتان 274/277: البنات يرثن الباقي مع الأبناء",
  ],
  [
    "Articles 274/277: sons of son inherit residue when no son exists",
    "المادتان 274/277: أبناء الابن يرثون الباقي عند عدم وجود ابن",
  ],
  [
    "Articles 274/277: daughters of son inherit residue with sons of son",
    "المادتان 274/277: بنات الابن يرثن الباقي مع أبناء الابن",
  ],
  [
    "Article 280: father receives one sixth plus residue with female descendants",
    "المادة 280: للأب السدس مع الباقي عند وجود فرع وارث من الإناث",
  ],
  [
    "Articles 274/275: father inherits residue when no descendants exist",
    "المادتان 274/275: الأب يرث الباقي عند عدم وجود فرع وارث",
  ],
  [
    "Articles 274/277: full brothers inherit residue",
    "المادتان 274/277: الإخوة الأشقاء يرثون الباقي",
  ],
  [
    "Articles 274/277: full sisters inherit residue with full brothers",
    "المادتان 274/277: الأخوات الشقيقات يرثن الباقي مع الإخوة الأشقاء",
  ],
  [
    "Article 278: full sisters inherit residue with female descendants",
    "المادة 278: الأخوات الشقيقات يرثن الباقي مع الفروع الوارثة من الإناث",
  ],
  [
    "Articles 274/277: paternal brothers inherit residue",
    "المادتان 274/277: الإخوة لأب يرثون الباقي",
  ],
  [
    "Articles 274/277: paternal sisters inherit residue with paternal brothers",
    "المادتان 274/277: الأخوات لأب يرثن الباقي مع الإخوة لأب",
  ],
  [
    "Article 278: paternal sisters inherit residue with female descendants",
    "المادة 278: الأخوات لأب يرثن الباقي مع الفروع الوارثة من الإناث",
  ],
  [
    "Articles 274/275/276: full paternal uncles inherit residue after closer residuaries",
    "المواد 274/275/276: الأعمام الأشقاء يرثون الباقي بعد سقوط العصبات الأقرب",
  ],
  [
    "Articles 274/275/276: paternal uncles inherit residue after stronger uncles",
    "المواد 274/275/276: الأعمام لأب يرثون الباقي بعد سقوط من هو أقوى منهم",
  ],
  [
    "Articles 274/275: paternal grandfather inherits residue when father is absent",
    "المادتان 274/275: الجد لأب يرث الباقي عند عدم وجود الأب",
  ],
  [
    "Article 279: paternal grandfather receives one third when sharing with siblings would reduce him below one third",
    "المادة 279: للجد لأب الثلث إذا كانت مقاسمته للإخوة تنقصه عن الثلث",
  ],
  [
    "Article 279: paternal grandfather shares with siblings as a brother",
    "المادة 279: الجد لأب يقاسم الإخوة كأخ",
  ],
  [
    "Article 279: siblings share with paternal grandfather",
    "المادة 279: يشترك الإخوة مع الجد لأب في المقاسمة",
  ],
  [
    "Article 279: siblings receive residue after paternal grandfather minimum share",
    "المادة 279: يأخذ الإخوة الباقي بعد الحد الأدنى المقرر للجد لأب",
  ],
  [
    "Article 273: shares reduced proportionally by awl because fixed shares exceed estate",
    "المادة 273: تنقص الأنصبة بنسبة العول لأن الفروض تجاوزت أصل التركة",
  ],
  [
    "Article 288: residue returned to non-spouse fixed heirs proportionally",
    "المادة 288: يرد الباقي على أصحاب الفروض من غير الزوجين بنسبة فروضهم",
  ],
  [
    "Article 288: spouse receives residue when no residuary, fixed relative, or uterine relative exists",
    "المادة 288: يأخذ أحد الزوجين الباقي عند عدم وجود عصبة أو صاحب فرض آخر أو ذوي أرحام",
  ],
  [
    "Articles 289-297: uterine relatives receive remaining estate when no residuary or return-eligible fixed heir takes it; male receives twice female",
    "المواد 289-297: ذوو الأرحام يأخذون باقي التركة عند عدم وجود عصبة أو صاحب فرض مستحق للرد، وللذكر مثل حظ الأنثيين",
  ],
  [
    "Articles 290-297: nearer class of uterine relatives blocks later classes",
    "المواد 290-297: الطبقة الأقرب من ذوي الأرحام تحجب الطبقات الأبعد",
  ],
  [
    "Article 260: heir must be alive at death of the deceased",
    "المادة 260: يشترط أن يكون الوارث حيًا عند وفاة المورث",
  ],
  [
    "Article 264: difference of religion prevents inheritance between Muslim and non-Muslim",
    "المادة 264: اختلاف الدين يمنع التوارث بين المسلم وغير المسلم",
  ],
  [
    "Articles 223/264: intentional killing prevents inheritance",
    "المادتان 223/264: القتل العمد يمنع الإرث",
  ],
  [
    "no distributable share after applying Syrian inheritance priority, awl, radd, and blocking rules",
    "لا يوجد نصيب قابل للتوزيع بعد تطبيق قواعد الأولوية والعول والرد والحجب في الميراث السوري",
  ],
]);

export function legalText(text: string | null | undefined, locale: Locale) {
  if (!text || locale !== "ar") return text ?? "";

  let translated = text;
  for (const [english, arabic] of ARABIC_LEGAL_TEXT) {
    translated = translated.replaceAll(english, arabic);
  }

  return translated
    .replace(/\bfinal fraction\s+/g, "الكسر النهائي ")
    .replace(/\bamount\s+/g, "المبلغ ")
    .replaceAll(";", "؛");
}
