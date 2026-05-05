import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Gender,
  Language,
  Prisma,
  RelationType,
  ReportType,
  Role,
} from '@prisma/client';
import PDFDocument from 'pdfkit';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AuthUser } from '../auth/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { preparePdfText, prepareArabicForPdf } from './pdf-text.util';

const reportCaseInclude = {
  familyMembers: {
    include: { parent: true },
    orderBy: [{ relationType: 'asc' }, { fullName: 'asc' }],
  },
  heirs: {
    include: {
      member: true,
      blockedBy: {
        include: { blockedBy: { include: { member: true } } },
      },
    },
    orderBy: [{ isEligible: 'desc' }, { sharePercentage: 'desc' }],
  },
} as const satisfies Prisma.CaseInclude;

type ReportCaseData = Prisma.CaseGetPayload<{
  include: typeof reportCaseInclude;
}>;

type ReportLabels = ReturnType<ReportsService['labels']>;
type TableColumn<T> = {
  label: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  value: (row: T, index: number) => string;
};

const FONT_CANDIDATES = [
  join(process.cwd(), 'assets/fonts/Cairo-Regular.ttf'),
  'C:\\Windows\\Fonts\\arial.ttf',
  'C:\\Windows\\Fonts\\tahoma.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
];

const BOLD_FONT_CANDIDATES = [
  join(process.cwd(), 'assets/fonts/Cairo-Bold.ttf'),
  'C:\\Windows\\Fonts\\arialbd.ttf',
  'C:\\Windows\\Fonts\\tahomabd.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
];

const INVALID_FILENAME_CHARS = new Set([
  '<',
  '>',
  ':',
  '"',
  '/',
  '\\',
  '|',
  '?',
  '*',
]);

const ARABIC_REPORT_TEXT_REPLACEMENTS: ReadonlyArray<
  readonly [string, string]
> = [
  [
    'Qualified for inheritance analysis under Syrian Personal Status Law',
    'مؤهل لتحليل الإرث وفق قانون الأحوال الشخصية السوري',
  ],
  [
    'Article 275/276: father is closer than paternal grandfather',
    'المادة 275/276: الأب أقرب من الجد لأب',
  ],
  [
    'Article 283: grandmothers are blocked by the mother',
    'المادة 283: الجدات يحجبهن وجود الأم',
  ],
  [
    'Article 283: paternal grandmother is blocked by the father',
    'المادة 283: الجدة لأب يحجبها وجود الأب',
  ],
  [
    'Article 284: maternal siblings are blocked by father, paternal grandfather, child, or son of son',
    'المادة 284: الإخوة لأم يحجبهم الأب أو الجد لأب أو الولد أو ابن الابن',
  ],
  [
    'Article 286 by analogy with Article 275: full brothers are blocked by father or male descendant',
    'المادة 286 قياساً على المادة 275: الإخوة الأشقاء يحجبهم الأب أو الفرع الوارث الذكر',
  ],
  [
    'Article 286: full sisters are blocked by father, son, or son of son',
    'المادة 286: الأخوات الشقيقات يحجبهن الأب أو الابن أو ابن الابن',
  ],
  [
    'Article 287 and Article 276: paternal siblings are blocked by father, male descendant, or stronger full brother',
    'المادة 287 والمادة 276: الإخوة والأخوات لأب يحجبهم الأب أو الفرع الوارث الذكر أو الأخ الشقيق الأقوى',
  ],
  [
    'Article 278/287: full sister as residuary with female descendants blocks paternal siblings',
    'المادة 278/287: الأخت الشقيقة إذا صارت عصبة مع البنات تحجب الإخوة والأخوات لأب',
  ],
  [
    'Article 287: two full sisters block paternal sisters unless a paternal brother makes them residuary',
    'المادة 287: الأختان الشقيقتان تحجبان الأخوات لأب ما لم يوجد أخ لأب يجعلهن عصبة',
  ],
  [
    'Article 275/276: son blocks lower descendants through sons',
    'المادة 275/276: الابن يحجب الفروع الأدنى من جهة الأبناء',
  ],
  [
    'Article 285: two daughters block daughters of son unless a son of son makes them residuary',
    'المادة 285: البنتان تحجبان بنات الابن ما لم يوجد ابن ابن يجعلهن عصبة',
  ],
  [
    'Articles 275/276: nearer residuary heir blocks agnatic uncles',
    'المادتان 275/276: العصبة الأقرب تحجب الأعمام العصبات',
  ],
  ['Article 268: husband fixed share', 'المادة 268: للزوج فرض مقدر'],
  [
    'Article 268: wife fixed share, shared equally if multiple wives',
    'المادة 268: للزوجة فرض مقدر ويقسم بالتساوي عند التعدد',
  ],
  [
    'Article 271: mother takes one third of what remains after spouse in the two Umariyyatayn cases',
    'المادة 271: تأخذ الأم ثلث الباقي بعد الزوج أو الزوجة في العمريتين',
  ],
  ['Article 271: mother fixed share', 'المادة 271: للأم فرض مقدر'],
  [
    'Article 266: father receives one sixth with descendants',
    'المادة 266: للأب السدس مع وجود الفرع الوارث',
  ],
  [
    'Article 266: paternal grandfather receives one sixth when father is absent and descendants exist',
    'المادة 266: للجد لأب السدس عند عدم الأب مع وجود الفرع الوارث',
  ],
  [
    'Article 272: fixed grandmothers share one sixth equally',
    'المادة 272: الجدات صاحبات الفرض يشتركن في السدس بالتساوي',
  ],
  [
    'Article 269: one daughter receives one half',
    'المادة 269: للبنت الواحدة النصف',
  ],
  [
    'Article 269: multiple daughters share two thirds',
    'المادة 269: للبنات الثلثان عند التعدد',
  ],
  [
    'Article 269: one daughter of son receives one half when no daughter exists',
    'المادة 269: لبنت الابن الواحدة النصف عند عدم وجود بنت',
  ],
  [
    'Article 269: daughters of son share two thirds when no daughter exists',
    'المادة 269: لبنات الابن الثلثان عند التعدد وعدم وجود بنت',
  ],
  [
    'Article 269: daughters of son share one sixth with one daughter',
    'المادة 269: لبنات الابن السدس مع وجود بنت واحدة',
  ],
  [
    'Article 267: one maternal sibling receives one sixth',
    'المادة 267: للأخ أو الأخت لأم السدس عند الانفراد',
  ],
  [
    'Article 267: multiple maternal siblings share one third equally',
    'المادة 267: يشترك الإخوة لأم في الثلث بالتساوي عند التعدد',
  ],
  [
    'Article 270: one full sister receives one half',
    'المادة 270: للأخت الشقيقة الواحدة النصف',
  ],
  [
    'Article 270: multiple full sisters share two thirds',
    'المادة 270: للأخوات الشقيقات الثلثان عند التعدد',
  ],
  [
    'Article 270: one paternal sister receives one half when no full sister exists',
    'المادة 270: للأخت لأب الواحدة النصف عند عدم وجود أخت شقيقة',
  ],
  [
    'Article 270: paternal sisters share two thirds when no full sister exists',
    'المادة 270: للأخوات لأب الثلثان عند التعدد وعدم وجود أخت شقيقة',
  ],
  [
    'Article 270: paternal sisters share one sixth with one full sister',
    'المادة 270: للأخوات لأب السدس مع أخت شقيقة واحدة',
  ],
  [
    'Article 271: one third of remainder after spouse',
    'المادة 271: ثلث الباقي بعد الزوج أو الزوجة',
  ],
  [
    'Articles 274/277: sons inherit residue; male gets twice female',
    'المادتان 274/277: الأبناء يرثون الباقي، وللذكر مثل حظ الأنثيين',
  ],
  [
    'Articles 274/277: daughters inherit residue with sons',
    'المادتان 274/277: البنات يرثن الباقي مع الأبناء',
  ],
  [
    'Articles 274/277: sons of son inherit residue when no son exists',
    'المادتان 274/277: أبناء الابن يرثون الباقي عند عدم وجود ابن',
  ],
  [
    'Articles 274/277: daughters of son inherit residue with sons of son',
    'المادتان 274/277: بنات الابن يرثن الباقي مع أبناء الابن',
  ],
  [
    'Article 280: father receives one sixth plus residue with female descendants',
    'المادة 280: للأب السدس مع الباقي عند وجود فرع وارث من الإناث',
  ],
  [
    'Articles 274/275: father inherits residue when no descendants exist',
    'المادتان 274/275: الأب يرث الباقي عند عدم وجود فرع وارث',
  ],
  [
    'Articles 274/277: full brothers inherit residue',
    'المادتان 274/277: الإخوة الأشقاء يرثون الباقي',
  ],
  [
    'Articles 274/277: full sisters inherit residue with full brothers',
    'المادتان 274/277: الأخوات الشقيقات يرثن الباقي مع الإخوة الأشقاء',
  ],
  [
    'Article 278: full sisters inherit residue with female descendants',
    'المادة 278: الأخوات الشقيقات يرثن الباقي مع الفروع الوارثة من الإناث',
  ],
  [
    'Articles 274/277: paternal brothers inherit residue',
    'المادتان 274/277: الإخوة لأب يرثون الباقي',
  ],
  [
    'Articles 274/277: paternal sisters inherit residue with paternal brothers',
    'المادتان 274/277: الأخوات لأب يرثن الباقي مع الإخوة لأب',
  ],
  [
    'Article 278: paternal sisters inherit residue with female descendants',
    'المادة 278: الأخوات لأب يرثن الباقي مع الفروع الوارثة من الإناث',
  ],
  [
    'Articles 274/275/276: full paternal uncles inherit residue after closer residuaries',
    'المواد 274/275/276: الأعمام الأشقاء يرثون الباقي بعد سقوط العصبات الأقرب',
  ],
  [
    'Articles 274/275/276: paternal uncles inherit residue after stronger uncles',
    'المواد 274/275/276: الأعمام لأب يرثون الباقي بعد سقوط من هو أقوى منهم',
  ],
  [
    'Articles 274/275: paternal grandfather inherits residue when father is absent',
    'المادتان 274/275: الجد لأب يرث الباقي عند عدم وجود الأب',
  ],
  [
    'Article 279: paternal grandfather receives one third when sharing with siblings would reduce him below one third',
    'المادة 279: للجد لأب الثلث إذا كان مقاسمته للإخوة تنقصه عن الثلث',
  ],
  [
    'Article 279: paternal grandfather shares with siblings as a brother',
    'المادة 279: الجد لأب يقاسم الإخوة كأخ',
  ],
  [
    'Article 279: siblings share with paternal grandfather',
    'المادة 279: يشترك الإخوة مع الجد لأب في المقاسمة',
  ],
  [
    'Article 279: siblings receive residue after paternal grandfather minimum share',
    'المادة 279: يأخذ الإخوة الباقي بعد الحد الأدنى المقرر للجد لأب',
  ],
  [
    'Article 273: shares reduced proportionally by awl because fixed shares exceed estate',
    'المادة 273: تنقص الأنصبة بنسبة العول لأن الفروض تجاوزت أصل التركة',
  ],
  [
    'Article 288: residue returned to non-spouse fixed heirs proportionally',
    'المادة 288: يرد الباقي على أصحاب الفروض من غير الزوجين بنسبة فروضهم',
  ],
  [
    'Article 288: spouse receives residue when no residuary, fixed relative, or uterine relative exists',
    'المادة 288: يأخذ أحد الزوجين الباقي عند عدم وجود عصبة أو صاحب فرض آخر أو ذوي أرحام',
  ],
  [
    'Articles 289-297: uterine relatives receive remaining estate when no residuary or return-eligible fixed heir takes it; male receives twice female',
    'المواد 289-297: ذوو الأرحام يأخذون باقي التركة عند عدم وجود عصبة أو صاحب فرض مستحق للرد، وللذكر مثل حظ الأنثيين',
  ],
  [
    'Articles 290-297: nearer class of uterine relatives blocks later classes',
    'المواد 290-297: الطبقة الأقرب من ذوي الأرحام تحجب الطبقات الأبعد',
  ],
  [
    'Article 260: heir must be alive at death of the deceased',
    'المادة 260: يشترط أن يكون الوارث حياً عند وفاة المورث',
  ],
  [
    'Article 264: difference of religion prevents inheritance between Muslim and non-Muslim',
    'المادة 264: اختلاف الدين يمنع التوارث بين المسلم وغير المسلم',
  ],
  [
    'Articles 223/264: intentional killing prevents inheritance',
    'المادتان 223/264: القتل العمد يمنع الإرث',
  ],
  [
    'no distributable share after applying Syrian inheritance priority, awl, radd, and blocking rules',
    'لا يوجد نصيب قابل للتوزيع بعد تطبيق قواعد الأولوية والعول والرد والحجب في الميراث السوري',
  ],
];

// --- Tree member info used for PDF family tree drawing ---
type PdfTreeMember = {
  id: string;
  name: string;
  relation: string;
  relationType: RelationType;
  isAlive: boolean;
  heir: {
    isEligible: boolean;
    shareFraction: string | null;
    sharePercentage: number;
  } | null;
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, caseId?: string) {
    if (caseId) {
      await this.assertCanAccessCase(caseId, user);
    }

    return this.prisma.report.findMany({
      where:
        user.role === Role.ADMIN
          ? { caseId }
          : { generatedBy: user.id, caseId },
      include: { case: true, generator: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async generatePdf(caseId: string, user: AuthUser, language: Language) {
    await this.assertCanAccessCase(caseId, user);
    const caseData = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: reportCaseInclude,
    });

    if (!caseData) {
      throw new NotFoundException('Case not found');
    }

    if (!caseData.heirs.length) {
      throw new NotFoundException(
        'Calculate inheritance before exporting a report',
      );
    }

    const buffer = await this.buildPdf(caseData, language);
    const reportsDir = join(process.cwd(), 'reports');
    await mkdir(reportsDir, { recursive: true });

    let storedFilename: string;
    let filename: string;
    try {
      const safeName = caseData.deceasedName.replace(/[^a-zA-Z0-9؀-ۿ]/g, '_');
      const dateStr = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
        .format(new Date(caseData.deathDate))
        .replace(/\//g, '-');
      storedFilename = `inheritance_report_${safeName}_${dateStr}.pdf`;
      filename = this.buildDownloadFilename(caseData.deceasedName, language);
    } catch (e) {
      console.error('Filename error:', e);
      storedFilename = `inheritance_report_${caseId}_${Date.now()}.pdf`;
      filename =
        language === Language.AR ? 'تقرير ميراث.pdf' : 'Inheritance Report.pdf';
    }
    console.log('Generated filenames:', { storedFilename, filename });
    const filePath = join(reportsDir, storedFilename);
    await writeFile(filePath, buffer);

    const report = await this.prisma.report.create({
      data: {
        caseId,
        generatedBy: user.id,
        filePath,
        reportType: ReportType.PDF,
        language,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        caseId,
        action: 'PDF_REPORT_GENERATED',
        changes: { reportId: report.id, filePath, language },
      },
    });

    return { buffer, report, filename };
  }

  private buildDownloadFilename(deceasedName: string, language: Language) {
    const cleanedName = Array.from(deceasedName)
      .map((char) => {
        if (INVALID_FILENAME_CHARS.has(char) || char.charCodeAt(0) < 32) {
          return ' ';
        }

        return char;
      })
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    const safeName = cleanedName || 'Unknown';
    const prefix =
      language === Language.AR ? 'تقرير ميراث' : 'Inheritance Report';
    return `${prefix} ${safeName}.pdf`;
  }

  private async buildPdf(caseData: ReportCaseData, language: Language) {
    const labels = this.labels(language);
    const rtl = language === Language.AR;
    const doc = new PDFDocument({
      margin: 42,
      size: 'A4',
      bufferPages: true,
      autoFirstPage: true,
    });
    const chunks: Buffer<ArrayBufferLike>[] = [];

    doc.on('data', (chunk: unknown) => {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
      }
    });

    const done = new Promise<Buffer<ArrayBufferLike>>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    this.registerFonts(doc);
    this.useRegularFont(doc);

    this.drawCover(doc, caseData, labels, language);

    doc.addPage();
    doc.y = doc.page.margins.top;
    this.drawFamilyTree(doc, caseData, labels, language);

    doc.addPage();
    doc.y = doc.page.margins.top;
    this.drawEstateSummary(doc, caseData, labels, language);

    doc.addPage();
    doc.y = doc.page.margins.top;
    this.drawFamilyMembers(doc, caseData, labels, language);

    doc.addPage();
    doc.y = doc.page.margins.top;
    this.drawEligibleHeirs(doc, caseData, labels, language);

    doc.addPage();
    doc.y = doc.page.margins.top;
    this.drawBlockedHeirs(doc, caseData, labels, language);

    doc.addPage();
    doc.y = doc.page.margins.top;
    this.drawLegalNotes(doc, labels, language);

    this.addPageNumbers(doc, labels, rtl);

    // احذف الصفحات الفارغة في النهاية
    const range = doc.bufferedPageRange();
    for (let i = range.start + range.count - 1; i >= range.start; i--) {
      doc.switchToPage(i);
      if (doc.y <= doc.page.margins.top + 10) {
        // صفحة فارغة — لكن PDFKit لا يدعم حذف الصفحات
        break;
      }
      break;
    }

    doc.end();

    return done;
  }

  private drawCover(
    doc: PDFKit.PDFDocument,
    caseData: ReportCaseData,
    labels: ReportLabels,
    language: Language,
  ) {
    const rtl = language === Language.AR;
    const contentX = doc.page.margins.left;
    const contentWidth = this.contentWidth(doc);
    const pw = doc.page.width;
    const ph = doc.page.height;

    // Page background
    doc.rect(0, 0, pw, ph).fill('#f0fdf4');

    // Header bar
    doc.rect(0, 0, pw, 200).fill('#0f766e');
    // Golden accent stripe at bottom of header
    doc.rect(0, 196, pw, 4).fill('#f59e0b');

    // Title
    doc
      .fillColor('#ffffff')
      .font('AppBold')
      .fontSize(28)
      .text(this.displayText(labels.title, rtl), contentX, 58, {
        width: contentWidth,
        align: 'center',
      });
    // Subtitle
    doc
      .font('AppRegular')
      .fontSize(11)
      .fillColor('#a7f3d0')
      .text(this.displayText(labels.subtitle, rtl), contentX, 108, {
        width: contentWidth,
        align: 'center',
      });

    doc.y = 224;
    this.sectionTitle(doc, labels.caseSummary, rtl);
    this.keyValueGrid(
      doc,
      [
        [labels.deceased, caseData.deceasedName],
        [labels.deathDate, this.formatDate(caseData.deathDate, language)],
        [labels.status, caseData.status],
        [labels.generatedAt, this.formatDate(new Date(), language, true)],
      ],
      rtl,
    );

    doc.moveDown(1.2);
    this.sectionTitle(doc, labels.distributionSnapshot, rtl);
    const totalEstate = Number(caseData.totalEstate ?? 0);
    const deductions = this.deductions(caseData);
    const net = this.distributableEstate(caseData);
    this.metricRow(
      doc,
      [
        {
          label: labels.totalEstate,
          value: this.formatMoney(totalEstate, caseData.currency),
        },
        {
          label: labels.deductions,
          value: this.formatMoney(deductions, caseData.currency),
        },
        {
          label: labels.distributableEstate,
          value: this.formatMoney(net, caseData.currency),
          accent: true,
        },
      ],
      rtl,
    );
  }

  // ─── Family Tree ─────────────────────────────────────────────────────────────

  private drawFamilyTree(
    doc: PDFKit.PDFDocument,
    caseData: ReportCaseData,
    labels: ReportLabels,
    language: Language,
  ) {
    const rtl = language === Language.AR;
    this.sectionTitle(doc, labels.familyTree, rtl);

    const heirMap = new Map(caseData.heirs.map((h) => [h.member.id, h]));

    const toInfo = (m: ReportCaseData['familyMembers'][0]): PdfTreeMember => {
      const heir = heirMap.get(m.id);
      return {
        id: m.id,
        name: m.fullName,
        relation: this.relationLabel(m.relationType, language),
        relationType: m.relationType,
        isAlive: m.isAlive,
        heir: heir
          ? {
              isEligible: heir.isEligible,
              shareFraction: heir.shareFraction,
              sharePercentage: Number(heir.sharePercentage ?? 0),
            }
          : null,
      };
    };

    const inTypes =
      (...types: RelationType[]) =>
      (m: ReportCaseData['familyMembers'][0]) =>
        types.includes(m.relationType);

    const grandparents = caseData.familyMembers
      .filter(
        inTypes(
          RelationType.PATERNAL_GRANDFATHER,
          RelationType.PATERNAL_GRANDMOTHER,
          RelationType.MATERNAL_GRANDFATHER,
          RelationType.MATERNAL_GRANDMOTHER,
        ),
      )
      .map(toInfo);

    const parents = caseData.familyMembers
      .filter(inTypes(RelationType.FATHER, RelationType.MOTHER))
      .map(toInfo);

    const unclesAunts = caseData.familyMembers
      .filter(
        inTypes(
          RelationType.PATERNAL_UNCLE,
          RelationType.PATERNAL_UNCLE_FULL,
          RelationType.PATERNAL_UNCLE_PATERNAL,
          RelationType.PATERNAL_AUNT,
          RelationType.MATERNAL_UNCLE,
          RelationType.MATERNAL_AUNT,
        ),
      )
      .map(toInfo);

    const spouses = caseData.familyMembers
      .filter(inTypes(RelationType.HUSBAND, RelationType.WIFE))
      .map(toInfo);

    const siblings = caseData.familyMembers
      .filter(
        inTypes(
          RelationType.BROTHER,
          RelationType.SISTER,
          RelationType.FULL_BROTHER,
          RelationType.FULL_SISTER,
          RelationType.PATERNAL_BROTHER,
          RelationType.PATERNAL_SISTER,
          RelationType.MATERNAL_BROTHER,
          RelationType.MATERNAL_SISTER,
        ),
      )
      .map(toInfo);

    const children = caseData.familyMembers
      .filter(inTypes(RelationType.SON, RelationType.DAUGHTER))
      .map(toInfo);

    const grandchildren = caseData.familyMembers
      .filter(inTypes(RelationType.SON_OF_SON, RelationType.DAUGHTER_OF_SON))
      .map(toInfo);

    const BW = 100; // box width
    const BH = 46; // box height
    const BGAP = 8; // gap between boxes
    const RGAP = 22; // gap between rows
    const contentX = doc.page.margins.left;
    const contentW = this.contentWidth(doc);
    const CX = contentX + contentW / 2;

    // Lay out a row of boxes centered on CX, return bottom Y
    const drawRow = (
      members: PdfTreeMember[],
      startY: number,
      boxW = BW,
    ): number => {
      if (!members.length) return startY;
      const n = members.length;
      const maxPerRow = Math.max(
        1,
        Math.floor((contentW + BGAP) / (boxW + BGAP)),
      );
      let y = startY;

      for (let i = 0; i < n; i += maxPerRow) {
        if (y + BH > this.pageBottom(doc)) {
          doc.addPage();
          y = doc.page.margins.top;
        }
        const chunk = members.slice(i, i + maxPerRow);
        const totalW = chunk.length * boxW + (chunk.length - 1) * BGAP;
        let x = CX - totalW / 2;

        for (const m of chunk) {
          this.drawTreeBox(doc, m, x, y, boxW, BH, rtl, language);
          x += boxW + BGAP;
        }
        y += BH + (i + maxPerRow < n ? 6 : 0);
      }
      return y;
    };

    // Group label helper
    const groupLabel = (text: string, y: number): number => {
      if (y + 14 > this.pageBottom(doc)) {
        doc.addPage();
        y = doc.page.margins.top;
      }
      doc
        .font('AppBold')
        .fontSize(7.5)
        .fillColor('#475569')
        .text(this.displayText(text, rtl), contentX, y, {
          width: contentW,
          align: rtl ? 'right' : 'left',
        });
      return y + 14;
    };

    // Connector arrow (vertical line with small arrowhead)
    const drawConnector = (fromY: number, toY: number) => {
      const midX = CX;
      doc
        .moveTo(midX, fromY)
        .lineTo(midX, toY - 5)
        .lineWidth(0.8)
        .strokeColor('#94a3b8')
        .stroke();
      doc
        .moveTo(midX - 4, toY - 8)
        .lineTo(midX, toY - 2)
        .lineTo(midX + 4, toY - 8)
        .lineWidth(0.8)
        .strokeColor('#94a3b8')
        .stroke();
    };

    let y = doc.y;
    let prevBottomY: number | null = null;

    const drawGroup = (groupLbl: string, members: PdfTreeMember[]) => {
      if (!members.length) return;
      if (prevBottomY !== null && y + RGAP + BH < this.pageBottom(doc)) {
        drawConnector(prevBottomY, y + RGAP);
        y += RGAP;
      }
      y = groupLabel(groupLbl, y);
      y = drawRow(members, y) + RGAP;
      prevBottomY = y - RGAP;
    };

    // ── Ancestors ──
    drawGroup(rtl ? 'الأجداد والجدات' : 'Grandparents', grandparents);
    drawGroup(rtl ? 'الوالدان' : 'Parents', parents);
    drawGroup(
      rtl ? 'الأعمام والأخوال والعمات والخالات' : 'Uncles & Aunts',
      unclesAunts,
    );

    // ── Deceased box (prominent) ──
    if (prevBottomY !== null && y + RGAP + 58 < this.pageBottom(doc)) {
      drawConnector(prevBottomY, y + RGAP);
      y += RGAP;
    }
    if (y + 58 > this.pageBottom(doc)) {
      doc.addPage();
      y = doc.page.margins.top;
      prevBottomY = null;
    }

    const decW = 150;
    const decH = 62;
    const decX = CX - decW / 2;
    doc
      .roundedRect(decX, y, decW, decH, 8)
      .lineWidth(2)
      .fillAndStroke('#0f766e', '#f59e0b');
    doc
      .font('AppBold')
      .fontSize(9.5)
      .fillColor('#ffffff')
      .text(this.displayText(caseData.deceasedName, rtl), decX + 6, y + 9, {
        width: decW - 12,
        align: 'center',
      });
    doc
      .font('AppRegular')
      .fontSize(7)
      .fillColor('#a7f3d0')
      .text(this.displayText(labels.deceased, rtl), decX + 6, y + 26, {
        width: decW - 12,
        align: 'center',
      });
    doc
      .font('AppRegular')
      .fontSize(6.5)
      .fillColor('#a7f3d0')
      .text(this.formatDate(caseData.deathDate, language), decX + 6, y + 40, {
        width: decW - 12,
        align: 'center',
      });

    // Draw spouses beside the deceased box
    if (spouses.length) {
      const spouseX = decX + decW + 14;
      let sx = spouseX;
      for (const spouse of spouses) {
        if (sx + BW <= contentX + contentW) {
          this.drawTreeBox(doc, spouse, sx, y, BW, decH, rtl, language);
          // Horizontal line from deceased to spouse
          doc
            .moveTo(decX + decW, y + decH / 2)
            .lineTo(sx, y + decH / 2)
            .lineWidth(1)
            .strokeColor('#d97706')
            .stroke();
          sx += BW + BGAP;
        }
      }
    }

    prevBottomY = y + decH;
    y += decH + RGAP;

    // ── Siblings ──
    drawGroup(rtl ? 'الإخوة والأخوات' : 'Siblings', siblings);

    // ── Children ──
    drawGroup(rtl ? 'الأبناء والبنات' : 'Children', children);

    // ── Grandchildren ──
    drawGroup(rtl ? 'أبناء الأبناء' : 'Grandchildren', grandchildren);

    doc.y = y;
  }

  private drawTreeBox(
    doc: PDFKit.PDFDocument,
    member: PdfTreeMember,
    x: number,
    y: number,
    bw: number,
    bh: number,
    rtl: boolean,
    language: Language,
  ) {
    const isSpouse =
      member.relationType === RelationType.HUSBAND ||
      member.relationType === RelationType.WIFE;

    let bgColor: string;
    let borderColor: string;

    let borderWidth = 1;
    if (isSpouse) {
      bgColor = '#fffbeb';
      borderColor = '#f59e0b';
    } else if (!member.heir) {
      bgColor = member.isAlive ? '#f8fafc' : '#e2e8f0';
      borderColor = '#cbd5e1';
    } else {
      bgColor = member.heir.isEligible ? '#ecfdf5' : '#fff1f2';
      borderColor = member.heir.isEligible ? '#0f766e' : '#ef4444';
      borderWidth = member.heir.isEligible ? 1.5 : 1;
    }

    doc
      .roundedRect(x, y, bw, bh, 8)
      .lineWidth(borderWidth)
      .fillAndStroke(bgColor, borderColor);

    // Gold dot for eligible heirs
    if (member.heir?.isEligible) {
      doc.circle(x + bw - 7, y + 7, 4).fill('#f59e0b');
    }

    // Name
    doc
      .font('AppBold')
      .fontSize(7)
      .fillColor('#0f172a')
      .text(this.displayText(member.name, rtl), x + 4, y + 5, {
        width: bw - 8,
        align: 'center',
      });

    // Relation label
    doc
      .font('AppRegular')
      .fontSize(6)
      .fillColor('#64748b')
      .text(this.displayText(member.relation, rtl), x + 4, y + 17, {
        width: bw - 8,
        align: 'center',
      });

    // Heir status or deceased indicator
    if (member.heir) {
      const pct = member.heir.sharePercentage.toFixed(1);
      const statusText = member.heir.isEligible
        ? member.heir.shareFraction
          ? `${member.heir.shareFraction} (${pct}%)`
          : `${pct}%`
        : this.labels(language).blocked;
      doc
        .font('AppRegular')
        .fontSize(5.5)
        .fillColor(member.heir.isEligible ? '#0f766e' : '#dc2626')
        .text(this.displayText(statusText, rtl), x + 4, y + 31, {
          width: bw - 8,
          align: 'center',
        });
    } else if (!member.isAlive) {
      doc
        .font('AppRegular')
        .fontSize(5.5)
        .fillColor('#94a3b8')
        .text(
          this.displayText(this.labels(language).deceasedMember, rtl),
          x + 4,
          y + 31,
          { width: bw - 8, align: 'center' },
        );
    }
  }

  // ─── Estate summary ───────────────────────────────────────────────────────────

  private drawEstateSummary(
    doc: PDFKit.PDFDocument,
    caseData: ReportCaseData,
    labels: ReportLabels,
    language: Language,
  ) {
    const rtl = language === Language.AR;
    this.sectionTitle(doc, labels.estateBreakdown, rtl);

    this.drawTable(
      doc,
      [
        {
          label: labels.item,
          width: 285,
          value: (row) => row.label,
          align: rtl ? 'right' : 'left',
        },
        {
          label: labels.amount,
          width: 220,
          value: (row) => this.formatMoney(row.value, caseData.currency),
          align: rtl ? 'left' : 'right',
        },
      ],
      [
        { label: labels.totalEstate, value: Number(caseData.totalEstate) },
        {
          label: labels.funeralCosts,
          value: Number(caseData.funeralCosts ?? 0),
        },
        { label: labels.debts, value: Number(caseData.debts ?? 0) },
        {
          label: labels.mandatoryWill,
          value: Number(caseData.mandatoryWill ?? 0),
        },
        {
          label: labels.optionalWill,
          value: Number(caseData.optionalWill ?? 0),
        },
        {
          label: labels.distributableEstate,
          value: this.distributableEstate(caseData),
        },
      ],
      labels,
      rtl,
    );
  }

  private drawFamilyMembers(
    doc: PDFKit.PDFDocument,
    caseData: ReportCaseData,
    labels: ReportLabels,
    language: Language,
  ) {
    const rtl = language === Language.AR;
    this.sectionTitle(doc, labels.familyMembers, rtl);

    this.drawTable(
      doc,
      [
        {
          label: labels.name,
          width: 140,
          value: (member) => member.fullName,
          align: rtl ? 'right' : 'left',
        },
        {
          label: labels.relation,
          width: 120,
          value: (member) => this.relationLabel(member.relationType, language),
          align: 'center',
        },
        {
          label: labels.gender,
          width: 70,
          value: (member) => this.genderLabel(member.gender, labels),
          align: 'center',
        },
        {
          label: labels.status,
          width: 75,
          value: (member) =>
            member.isAlive ? labels.alive : labels.deceasedMember,
          align: 'center',
        },
        {
          label: labels.linkedTo,
          width: 100,
          value: (member) => member.parent?.fullName ?? '-',
          align: rtl ? 'right' : 'left',
        },
      ],
      caseData.familyMembers,
      labels,
      rtl,
    );
  }

  private drawEligibleHeirs(
    doc: PDFKit.PDFDocument,
    caseData: ReportCaseData,
    labels: ReportLabels,
    language: Language,
  ) {
    const rtl = language === Language.AR;
    const eligible = caseData.heirs.filter((heir) => heir.isEligible);

    this.sectionTitle(doc, labels.eligibleHeirs, rtl);

    this.drawTable(
      doc,
      [
        {
          label: labels.name,
          width: 120,
          value: (heir) => heir.member.fullName,
          align: rtl ? 'right' : 'left',
        },
        {
          label: labels.relation,
          width: 105,
          value: (heir) =>
            this.relationLabel(heir.member.relationType, language),
          align: 'center',
        },
        {
          label: labels.share,
          width: 70,
          value: (heir) => heir.shareFraction ?? '0',
          align: 'center',
        },
        {
          label: labels.percentage,
          width: 82,
          value: (heir) => `${Number(heir.sharePercentage ?? 0).toFixed(4)}%`,
          align: 'center',
        },
        {
          label: labels.amount,
          width: 128,
          value: (heir) =>
            this.formatMoney(
              Number(heir.monetaryValue ?? 0),
              caseData.currency,
            ),
          align: rtl ? 'left' : 'right',
        },
      ],
      eligible,
      labels,
      rtl,
    );

    doc.moveDown(0.8);
    this.sectionTitle(doc, labels.legalBasisDetails, rtl, 12);
    for (const heir of eligible) {
      this.ensureSpace(doc, 52);
      this.bulletBlock(
        doc,
        `${heir.member.fullName}: ${heir.legalBasis ?? '-'}`,
        rtl,
      );
    }
  }

  private drawBlockedHeirs(
    doc: PDFKit.PDFDocument,
    caseData: ReportCaseData,
    labels: ReportLabels,
    language: Language,
  ) {
    const rtl = language === Language.AR;
    const blocked = caseData.heirs.filter((heir) => !heir.isEligible);

    this.sectionTitle(doc, labels.blockedHeirs, rtl);

    if (!blocked.length) {
      this.emptyBlock(doc, labels.noBlockedHeirs, rtl);
      return;
    }

    this.drawTable(
      doc,
      [
        {
          label: labels.name,
          width: 118,
          value: (heir) => heir.member.fullName,
          align: rtl ? 'right' : 'left',
        },
        {
          label: labels.relation,
          width: 105,
          value: (heir) =>
            this.relationLabel(heir.member.relationType, language),
          align: 'center',
        },
        {
          label: labels.blockedBy,
          width: 110,
          value: (heir) =>
            heir.blockedBy
              .map((block) => block.blockedBy.member.fullName)
              .join(', ') || '-',
          align: rtl ? 'right' : 'left',
        },
        {
          label: labels.reason,
          width: 172,
          value: (heir) =>
            heir.blockedBy.map((block) => block.blockReason).join('; ') ||
            heir.legalBasis ||
            '-',
          align: rtl ? 'right' : 'left',
        },
      ],
      blocked,
      labels,
      rtl,
    );
  }

  private drawLegalNotes(
    doc: PDFKit.PDFDocument,
    labels: ReportLabels,
    language: Language,
  ) {
    const rtl = language === Language.AR;

    this.sectionTitle(doc, labels.legalNotes, rtl);
    for (const note of labels.legalNotesList) {
      this.bulletBlock(doc, note, rtl);
    }
  }

  // ─── Primitives ───────────────────────────────────────────────────────────────

  private sectionTitle(
    doc: PDFKit.PDFDocument,
    title: string,
    rtl: boolean,
    size = 13,
  ) {
    this.ensureSpace(doc, 50);
    const contentX = doc.page.margins.left;
    const contentWidth = this.contentWidth(doc);
    const y = doc.y;

    // Full-width teal bar
    doc.rect(0, y, doc.page.width, 36).fill('#0f766e');
    doc
      .font('AppBold')
      .fontSize(size)
      .fillColor('#ffffff')
      .text(this.displayText(title, rtl), contentX, y + 10, {
        width: contentWidth,
        align: rtl ? 'right' : 'left',
        lineBreak: false,
      });

    doc.y = y + 36 + 12;
  }

  private keyValueGrid(
    doc: PDFKit.PDFDocument,
    rows: [string, string][],
    rtl: boolean,
  ) {
    const x = doc.page.margins.left;
    const width = this.contentWidth(doc);
    const colWidth = width / 2 - 6;
    const cardH = 60;
    const rowGap = 10;
    let currentY = doc.y;

    rows.forEach(([label, value], index) => {
      const isRightColumn = index % 2 === 0;
      const currentX = rtl
        ? isRightColumn
          ? x + colWidth + 12
          : x
        : isRightColumn
          ? x
          : x + colWidth + 12;

      if (index > 0 && index % 2 === 0) {
        currentY += cardH + rowGap;
      }

      // Card background
      doc.roundedRect(currentX, currentY, colWidth, cardH, 8).fill('#f8fafc');
      // Accent bar (left for LTR, right for RTL)
      const accentX = rtl ? currentX + colWidth - 3 : currentX;
      doc.rect(accentX, currentY, 3, cardH).fill('#0f766e');
      // Subtle border
      doc
        .roundedRect(currentX, currentY, colWidth, cardH, 8)
        .lineWidth(0.5)
        .strokeColor('#e2e8f0')
        .stroke();

      const textX = rtl ? currentX + 12 : currentX + 16;
      const textW = colWidth - 28;
      doc
        .font('AppRegular')
        .fontSize(7)
        .fillColor('#64748b')
        .text(this.displayText(label, rtl), textX, currentY + 12, {
          width: textW,
          align: rtl ? 'right' : 'left',
        });
      doc
        .font('AppBold')
        .fontSize(12)
        .fillColor('#0f172a')
        .text(this.displayText(value, rtl), textX, currentY + 31, {
          width: textW,
          align: rtl ? 'right' : 'left',
        });
    });

    doc.y = currentY + cardH + 14;
  }

  private metricRow(
    doc: PDFKit.PDFDocument,
    items: { label: string; value: string; accent?: boolean }[],
    rtl: boolean,
  ) {
    const x = doc.page.margins.left;
    const width = this.contentWidth(doc);
    const gap = 12;
    const cardH = 90;
    const itemWidth = (width - gap * (items.length - 1)) / items.length;
    const y = doc.y;

    items.forEach((item, index) => {
      const visualIndex = rtl ? items.length - 1 - index : index;
      const currentX = x + visualIndex * (itemWidth + gap);
      const bg = item.accent ? '#ecfdf5' : '#f8fafc';
      const border = item.accent ? '#0f766e' : '#e2e8f0';

      doc
        .roundedRect(currentX, y, itemWidth, cardH, 8)
        .fillAndStroke(bg, border);
      // Top accent stripe
      doc
        .rect(currentX, y, itemWidth, 4)
        .fill(item.accent ? '#0f766e' : '#cbd5e1');
      // Rounded corners mask for the stripe
      doc
        .roundedRect(currentX, y, itemWidth, 8, 8)
        .fill(item.accent ? '#0f766e' : '#cbd5e1');

      doc
        .font('AppRegular')
        .fontSize(8)
        .fillColor('#64748b')
        .text(this.displayText(item.label, rtl), currentX + 12, y + 18, {
          width: itemWidth - 24,
          align: rtl ? 'right' : 'left',
        });
      doc
        .font('AppBold')
        .fontSize(15)
        .fillColor(item.accent ? '#0f766e' : '#0f172a')
        .text(this.displayText(item.value, rtl), currentX + 12, y + 42, {
          width: itemWidth - 24,
          align: rtl ? 'right' : 'left',
        });
    });

    doc.y = y + cardH + 14;
  }

  private drawTable<T>(
    doc: PDFKit.PDFDocument,
    columns: TableColumn<T>[],
    rows: T[],
    labels: ReportLabels,
    rtl: boolean,
  ) {
    const orderedColumns = rtl ? [...columns].reverse() : columns;
    const startX = doc.page.margins.left;
    const tableWidth = orderedColumns.reduce((sum, col) => sum + col.width, 0);
    const firstColIndex = 0;

    const drawHeader = () => {
      this.ensureSpace(doc, 36);
      const y = doc.y;
      doc.rect(startX, y, tableWidth, 28).fill('#134e4a');
      let x = startX;
      for (const column of orderedColumns) {
        doc
          .font('AppBold')
          .fontSize(8)
          .fillColor('#ffffff')
          .text(this.displayText(column.label, rtl), x + 6, y + 9, {
            width: column.width - 12,
            align: column.align ?? (rtl ? 'right' : 'left'),
          });
        x += column.width;
      }
      doc.y = y + 28;
    };

    drawHeader();

    if (!rows.length) {
      this.emptyBlock(doc, labels.noData, rtl);
      return;
    }

    rows.forEach((row, index) => {
      const cells = orderedColumns.map((column) => ({
        column,
        text: column.value(row, index),
      }));
      const rowHeight =
        Math.max(
          28,
          ...cells.map(({ column, text }) =>
            doc.heightOfString(this.displayText(text || '-', rtl), {
              width: column.width - 12,
              lineGap: 1,
            }),
          ),
        ) + 14;

      if (doc.y + rowHeight > this.pageBottom(doc)) {
        doc.addPage();
        drawHeader();
      }

      const y = doc.y;
      doc
        .rect(startX, y, tableWidth, rowHeight)
        .fill(index % 2 === 0 ? '#ffffff' : '#f0fdf4');
      let x = startX;
      cells.forEach(({ column, text }, cellIndex) => {
        doc
          .rect(x, y, column.width, rowHeight)
          .lineWidth(0.3)
          .strokeColor('#e2e8f0')
          .stroke();
        const isFirst = cellIndex === firstColIndex;
        doc
          .font(isFirst ? 'AppBold' : 'AppRegular')
          .fontSize(8.5)
          .fillColor('#0f172a')
          .text(this.displayText(text || '-', rtl), x + 6, y + 8, {
            width: column.width - 12,
            align: column.align ?? (rtl ? 'right' : 'left'),
            lineGap: 1,
          });
        x += column.width;
      });
      // Bottom separator
      doc
        .moveTo(startX, y + rowHeight)
        .lineTo(startX + tableWidth, y + rowHeight)
        .lineWidth(0.4)
        .strokeColor('#cbd5e1')
        .stroke();
      doc.y = y + rowHeight;
    });

    doc.moveDown(0.8);
  }

  private bulletBlock(doc: PDFKit.PDFDocument, text: string, rtl: boolean) {
    this.ensureSpace(doc, 38);
    const x = doc.page.margins.left;
    const width = this.contentWidth(doc);
    doc
      .font('AppRegular')
      .fontSize(9)
      .fillColor('#334155')
      .text(this.displayText(`- ${text}`, rtl), x, doc.y, {
        width,
        align: rtl ? 'right' : 'left',
        lineGap: 2,
      });
    doc.moveDown(0.35);
  }

  private emptyBlock(doc: PDFKit.PDFDocument, text: string, rtl: boolean) {
    this.ensureSpace(doc, 48);
    const x = doc.page.margins.left;
    const width = this.contentWidth(doc);
    doc.roundedRect(x, doc.y, width, 42, 8).fillAndStroke('#f8fafc', '#e2e8f0');
    doc
      .font('AppRegular')
      .fontSize(10)
      .fillColor('#64748b')
      .text(this.displayText(text, rtl), x + 12, doc.y + 13, {
        width: width - 24,
        align: rtl ? 'right' : 'left',
      });
    doc.y += 54;
  }

  private addPageNumbers(
    doc: PDFKit.PDFDocument,
    labels: ReportLabels,
    rtl: boolean,
  ) {
    const range = doc.bufferedPageRange();
    const lastPage = range.start + range.count - 1;

    for (let index = range.start; index <= lastPage; index++) {
      doc.switchToPage(index);
      const pageNumber = index + 1;
      const footer = `${labels.page} ${pageNumber} / ${range.count}`;
      const contentX = doc.page.margins.left;
      const contentW = this.contentWidth(doc);
      const lineY = doc.page.height - doc.page.margins.bottom - 22;
      const textY = lineY + 6;

      // Separator line
      doc
        .moveTo(contentX, lineY)
        .lineTo(contentX + contentW, lineY)
        .lineWidth(0.5)
        .strokeColor('#d7dee8')
        .stroke();

      // Report name on left
      doc
        .font('AppRegular')
        .fontSize(8)
        .fillColor('#94a3b8')
        .text(this.displayText(labels.title, rtl), contentX, textY, {
          width: contentW,
          align: 'left',
          lineBreak: false,
        });

      // Page number on right
      doc
        .font('AppRegular')
        .fontSize(8)
        .fillColor('#94a3b8')
        .text(this.displayText(footer, rtl), contentX, textY, {
          width: contentW,
          align: 'right',
          lineBreak: false,
        });
    }

    doc.switchToPage(lastPage);
  }

  private ensureSpace(doc: PDFKit.PDFDocument, neededHeight: number) {
    if (doc.y + neededHeight > this.pageBottom(doc)) {
      doc.addPage();
      doc.y = doc.page.margins.top;
    }
  }

  private pageBottom(doc: PDFKit.PDFDocument) {
    return doc.page.height - doc.page.margins.bottom - 32;
  }

  private contentWidth(doc: PDFKit.PDFDocument) {
    return doc.page.width - doc.page.margins.left - doc.page.margins.right;
  }

  private registerFonts(doc: PDFKit.PDFDocument) {
    const regularFont = FONT_CANDIDATES.find((fontPath) =>
      existsSync(fontPath),
    );
    const boldFont = BOLD_FONT_CANDIDATES.find((fontPath) =>
      existsSync(fontPath),
    );

    if (regularFont) {
      doc.registerFont('AppRegular', regularFont);
    } else {
      doc.registerFont('AppRegular', 'Helvetica');
    }

    if (boldFont) {
      doc.registerFont('AppBold', boldFont);
    } else {
      doc.registerFont('AppBold', 'Helvetica-Bold');
    }
  }

  private useRegularFont(doc: PDFKit.PDFDocument) {
    doc.font('AppRegular');
  }

  private displayText(value: string | number | null | undefined, rtl: boolean) {
    const raw = value == null ? '' : String(value);

    if (!raw) {
      return raw;
    }

    const localized = rtl ? this.toArabicReportText(raw) : raw;
    return rtl ? prepareArabicForPdf(localized) : preparePdfText(localized);
  }

  private toArabicReportText(value: string) {
    let translated = value;

    for (const [source, target] of ARABIC_REPORT_TEXT_REPLACEMENTS) {
      translated = translated.replaceAll(source, target);
    }

    translated = translated
      .replace(/\bDRAFT\b/g, 'مسودة')
      .replace(/\bCALCULATED\b/g, 'محسوبة')
      .replace(/\bCLOSED\b/g, 'مغلقة')
      .replace(/final fraction\s+/g, 'الكسر النهائي ')
      .replace(/amount\s+/g, 'المبلغ ')
      .replace(/;/g, '؛');

    // Keep Western Arabic numerals (0-9) — do NOT convert to Eastern Arabic digits.
    return translated;
  }

  // Always use en-US locale for number formatting so digits remain 0-9 (Western Arabic).
  private formatMoney(value: number, currency: string) {
    return `${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)} ${currency}`;
  }

  private formatDate(
    value: Date | string,
    language: Language,
    withTime = false,
  ) {
    // Use ar-SY-u-nu-latn to get Arabic month names but keep Western digits.
    const locale = language === Language.AR ? 'ar-SY-u-nu-latn' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    }).format(new Date(value));
  }

  private relationLabel(relationType: RelationType, language: Language) {
    return this.labels(language).relations[relationType] ?? relationType;
  }

  private genderLabel(gender: Gender, labels: ReportLabels) {
    return gender === Gender.MALE ? labels.male : labels.female;
  }

  private labels(language: Language) {
    if (language === Language.AR) {
      return {
        title: 'تقرير توزيع الميراث',
        subtitle:
          'ملخص رسمي منسق للحالة، شجرة العائلة، الورثة، الأنصبة، وأسباب الحجب',
        caseSummary: 'بيانات الحالة',
        distributionSnapshot: 'ملخص التوزيع',
        estateBreakdown: 'تفصيل التركة والخصومات',
        familyTree: 'شجرة العائلة',
        deceased: 'المتوفى',
        deathDate: 'تاريخ الوفاة',
        generatedAt: 'تاريخ إصدار التقرير',
        totalEstate: 'إجمالي التركة',
        funeralCosts: 'مصاريف الدفن',
        debts: 'الديون',
        mandatoryWill: 'الوصية الواجبة',
        optionalWill: 'الوصية الاختيارية',
        deductions: 'إجمالي الخصومات',
        distributableEstate: 'صافي التركة القابل للتوزيع',
        status: 'الحالة',
        item: 'البند',
        amount: 'المبلغ',
        familyMembers: 'أفراد العائلة',
        eligibleHeirs: 'الورثة المستحقون',
        blockedHeirs: 'الورثة المحجوبون',
        legalBasisDetails: 'تفاصيل الأساس القانوني',
        legalNotes: 'ملاحظات قانونية وتشغيلية',
        name: 'الاسم',
        relation: 'صلة القرابة',
        gender: 'الجنس',
        linkedTo: 'مرتبط بـ',
        alive: 'حي',
        deceasedMember: 'متوفى',
        male: 'ذكر',
        female: 'أنثى',
        eligible: 'مستحق',
        blocked: 'محجوب',
        share: 'النصيب',
        percentage: 'النسبة',
        basis: 'الأساس',
        blockedBy: 'حجبه',
        reason: 'السبب',
        noData: 'لا توجد بيانات في هذا القسم.',
        noBlockedHeirs: 'لا يوجد ورثة محجوبون في هذه الحالة.',
        page: 'صفحة',
        reportDisclaimer:
          'هذا التقرير مولد آليًا من بيانات الحالة المدخلة في النظام. يجب مراجعة النتائج قانونيًا عند استخدامها في إجراءات رسمية.',
        legalNotesList: [
          'يعتمد الحساب على بيانات أفراد العائلة وحالات الأهلية المدخلة في النظام.',
          'يتم طرح مصاريف الدفن والديون والوصايا قبل توزيع صافي التركة.',
          'أسباب الحجب والأنصبة المعروضة ناتجة عن محرك الحساب في الباك، وليست نصًا قضائيًا نهائيًا.',
          'في الحالات الخاصة أو النزاعات أو نقص البيانات، يجب مراجعة مختص قانوني.',
        ],
        relations: {
          [RelationType.FATHER]: 'الأب',
          [RelationType.MOTHER]: 'الأم',
          [RelationType.HUSBAND]: 'الزوج',
          [RelationType.WIFE]: 'الزوجة',
          [RelationType.SON]: 'ابن',
          [RelationType.DAUGHTER]: 'بنت',
          [RelationType.SON_OF_SON]: 'ابن الابن',
          [RelationType.DAUGHTER_OF_SON]: 'بنت الابن',
          [RelationType.BROTHER]: 'أخ',
          [RelationType.SISTER]: 'أخت',
          [RelationType.FULL_BROTHER]: 'أخ شقيق',
          [RelationType.FULL_SISTER]: 'أخت شقيقة',
          [RelationType.PATERNAL_BROTHER]: 'أخ لأب',
          [RelationType.PATERNAL_SISTER]: 'أخت لأب',
          [RelationType.MATERNAL_BROTHER]: 'أخ لأم',
          [RelationType.MATERNAL_SISTER]: 'أخت لأم',
          [RelationType.PATERNAL_GRANDFATHER]: 'جد لأب',
          [RelationType.PATERNAL_GRANDMOTHER]: 'جدة لأب',
          [RelationType.MATERNAL_GRANDFATHER]: 'جد لأم',
          [RelationType.MATERNAL_GRANDMOTHER]: 'جدة لأم',
          [RelationType.PATERNAL_UNCLE]: 'عم',
          [RelationType.PATERNAL_UNCLE_FULL]: 'عم شقيق',
          [RelationType.PATERNAL_UNCLE_PATERNAL]: 'عم لأب',
          [RelationType.MATERNAL_UNCLE]: 'خال',
          [RelationType.PATERNAL_AUNT]: 'عمة',
          [RelationType.MATERNAL_AUNT]: 'خالة',
          [RelationType.OTHER]: 'قريب آخر',
        },
      };
    }

    return {
      title: 'Inheritance Distribution Report',
      subtitle:
        'Professional case summary with family members, eligible heirs, blocked heirs, shares, and legal reasoning',
      caseSummary: 'Case summary',
      distributionSnapshot: 'Distribution snapshot',
      estateBreakdown: 'Estate and deductions breakdown',
      familyTree: 'Family Tree',
      deceased: 'Deceased',
      deathDate: 'Death date',
      generatedAt: 'Generated at',
      totalEstate: 'Total estate',
      funeralCosts: 'Funeral costs',
      debts: 'Debts',
      mandatoryWill: 'Mandatory will',
      optionalWill: 'Optional will',
      deductions: 'Total deductions',
      distributableEstate: 'Net distributable estate',
      status: 'Status',
      item: 'Item',
      amount: 'Amount',
      familyMembers: 'Family members',
      eligibleHeirs: 'Eligible heirs',
      blockedHeirs: 'Blocked heirs',
      legalBasisDetails: 'Legal basis details',
      legalNotes: 'Legal and operational notes',
      name: 'Name',
      relation: 'Relation',
      gender: 'Gender',
      linkedTo: 'Linked to',
      alive: 'Alive',
      deceasedMember: 'Deceased',
      male: 'Male',
      female: 'Female',
      eligible: 'Eligible',
      blocked: 'Blocked',
      share: 'Share',
      percentage: 'Percentage',
      basis: 'Basis',
      blockedBy: 'Blocked by',
      reason: 'Reason',
      noData: 'No data is available in this section.',
      noBlockedHeirs: 'No blocked heirs were found for this case.',
      page: 'Page',
      reportDisclaimer:
        'This report is generated from case data entered into the system. Review the result legally before using it in official procedures.',
      legalNotesList: [
        'The calculation depends on the family members and eligibility flags entered in the case.',
        'Funeral costs, debts, and wills are deducted before distributing the net estate.',
        'Blocking reasons and shares are produced by the backend calculation engine and are not a final court ruling.',
        'Special cases, disputes, or incomplete data should be reviewed by a legal specialist.',
      ],
      relations: {
        [RelationType.FATHER]: 'Father',
        [RelationType.MOTHER]: 'Mother',
        [RelationType.HUSBAND]: 'Husband',
        [RelationType.WIFE]: 'Wife',
        [RelationType.SON]: 'Son',
        [RelationType.DAUGHTER]: 'Daughter',
        [RelationType.SON_OF_SON]: "Son's son",
        [RelationType.DAUGHTER_OF_SON]: "Son's daughter",
        [RelationType.BROTHER]: 'Brother',
        [RelationType.SISTER]: 'Sister',
        [RelationType.FULL_BROTHER]: 'Full brother',
        [RelationType.FULL_SISTER]: 'Full sister',
        [RelationType.PATERNAL_BROTHER]: 'Paternal brother',
        [RelationType.PATERNAL_SISTER]: 'Paternal sister',
        [RelationType.MATERNAL_BROTHER]: 'Maternal brother',
        [RelationType.MATERNAL_SISTER]: 'Maternal sister',
        [RelationType.PATERNAL_GRANDFATHER]: 'Paternal grandfather',
        [RelationType.PATERNAL_GRANDMOTHER]: 'Paternal grandmother',
        [RelationType.MATERNAL_GRANDFATHER]: 'Maternal grandfather',
        [RelationType.MATERNAL_GRANDMOTHER]: 'Maternal grandmother',
        [RelationType.PATERNAL_UNCLE]: 'Paternal uncle',
        [RelationType.PATERNAL_UNCLE_FULL]: 'Full paternal uncle',
        [RelationType.PATERNAL_UNCLE_PATERNAL]: 'Paternal uncle by father',
        [RelationType.MATERNAL_UNCLE]: 'Maternal uncle',
        [RelationType.PATERNAL_AUNT]: 'Paternal aunt',
        [RelationType.MATERNAL_AUNT]: 'Maternal aunt',
        [RelationType.OTHER]: 'Other relative',
      },
    };
  }

  private async assertCanAccessCase(caseId: string, user: AuthUser) {
    const existingCase = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true, ownerId: true },
    });

    if (!existingCase) {
      throw new NotFoundException('Case not found');
    }

    if (user.role !== Role.ADMIN && existingCase.ownerId !== user.id) {
      throw new ForbiddenException('You do not have access to this case');
    }

    return existingCase;
  }

  private deductions(caseData: ReportCaseData) {
    return (
      Number(caseData.funeralCosts ?? 0) +
      Number(caseData.debts ?? 0) +
      Number(caseData.mandatoryWill ?? 0) +
      Number(caseData.optionalWill ?? 0)
    );
  }

  private distributableEstate(caseData: ReportCaseData) {
    return Math.max(
      0,
      Number(caseData.totalEstate ?? 0) - this.deductions(caseData),
    );
  }
}
