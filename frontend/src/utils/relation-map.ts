import { Gender, RelationType } from "@/types";

export type Locale = "en" | "ar";

export const RELATION_LABELS: Record<
  Locale,
  Record<RelationType, string>
> = {
  en: {
    [RelationType.FATHER]: "Father",
    [RelationType.MOTHER]: "Mother",
    [RelationType.HUSBAND]: "Husband",
    [RelationType.WIFE]: "Wife",
    [RelationType.SON]: "Son",
    [RelationType.DAUGHTER]: "Daughter",
    [RelationType.SON_OF_SON]: "Son's son",
    [RelationType.DAUGHTER_OF_SON]: "Son's daughter",
    [RelationType.BROTHER]: "Brother",
    [RelationType.SISTER]: "Sister",
    [RelationType.FULL_BROTHER]: "Full brother",
    [RelationType.FULL_SISTER]: "Full sister",
    [RelationType.PATERNAL_BROTHER]: "Paternal brother",
    [RelationType.PATERNAL_SISTER]: "Paternal sister",
    [RelationType.MATERNAL_BROTHER]: "Maternal brother",
    [RelationType.MATERNAL_SISTER]: "Maternal sister",
    [RelationType.PATERNAL_GRANDFATHER]: "Paternal grandfather",
    [RelationType.PATERNAL_GRANDMOTHER]: "Paternal grandmother",
    [RelationType.MATERNAL_GRANDFATHER]: "Maternal grandfather",
    [RelationType.MATERNAL_GRANDMOTHER]: "Maternal grandmother",
    [RelationType.PATERNAL_UNCLE]: "Paternal uncle",
    [RelationType.PATERNAL_UNCLE_FULL]: "Full paternal uncle",
    [RelationType.PATERNAL_UNCLE_PATERNAL]: "Paternal uncle by father",
    [RelationType.MATERNAL_UNCLE]: "Maternal uncle",
    [RelationType.PATERNAL_AUNT]: "Paternal aunt",
    [RelationType.MATERNAL_AUNT]: "Maternal aunt",
    [RelationType.OTHER]: "Other relative",
  },
  ar: {
    [RelationType.FATHER]: "الأب",
    [RelationType.MOTHER]: "الأم",
    [RelationType.HUSBAND]: "الزوج",
    [RelationType.WIFE]: "الزوجة",
    [RelationType.SON]: "ابن",
    [RelationType.DAUGHTER]: "بنت",
    [RelationType.SON_OF_SON]: "ابن الابن",
    [RelationType.DAUGHTER_OF_SON]: "بنت الابن",
    [RelationType.BROTHER]: "أخ",
    [RelationType.SISTER]: "أخت",
    [RelationType.FULL_BROTHER]: "أخ شقيق",
    [RelationType.FULL_SISTER]: "أخت شقيقة",
    [RelationType.PATERNAL_BROTHER]: "أخ لأب",
    [RelationType.PATERNAL_SISTER]: "أخت لأب",
    [RelationType.MATERNAL_BROTHER]: "أخ لأم",
    [RelationType.MATERNAL_SISTER]: "أخت لأم",
    [RelationType.PATERNAL_GRANDFATHER]: "جد لأب",
    [RelationType.PATERNAL_GRANDMOTHER]: "جدة لأب",
    [RelationType.MATERNAL_GRANDFATHER]: "جد لأم",
    [RelationType.MATERNAL_GRANDMOTHER]: "جدة لأم",
    [RelationType.PATERNAL_UNCLE]: "عم",
    [RelationType.PATERNAL_UNCLE_FULL]: "عم شقيق",
    [RelationType.PATERNAL_UNCLE_PATERNAL]: "عم لأب",
    [RelationType.MATERNAL_UNCLE]: "خال",
    [RelationType.PATERNAL_AUNT]: "عمة",
    [RelationType.MATERNAL_AUNT]: "خالة",
    [RelationType.OTHER]: "قريب آخر",
  },
};

export const RELATION_GROUPS: Array<{
  title: Record<Locale, string>;
  relations: RelationType[];
}> = [
  {
    title: { en: "Core family", ar: "العائلة الأساسية" },
    relations: [
      RelationType.FATHER,
      RelationType.MOTHER,
      RelationType.HUSBAND,
      RelationType.WIFE,
      RelationType.SON,
      RelationType.DAUGHTER,
    ],
  },
  {
    title: { en: "Descendants", ar: "الفروع" },
    relations: [RelationType.SON_OF_SON, RelationType.DAUGHTER_OF_SON],
  },
  {
    title: { en: "Siblings", ar: "الإخوة والأخوات" },
    relations: [
      RelationType.FULL_BROTHER,
      RelationType.FULL_SISTER,
      RelationType.PATERNAL_BROTHER,
      RelationType.PATERNAL_SISTER,
      RelationType.MATERNAL_BROTHER,
      RelationType.MATERNAL_SISTER,
    ],
  },
  {
    title: { en: "Grandparents and wider relatives", ar: "الأصول والحواشي" },
    relations: [
      RelationType.PATERNAL_GRANDFATHER,
      RelationType.PATERNAL_GRANDMOTHER,
      RelationType.MATERNAL_GRANDFATHER,
      RelationType.MATERNAL_GRANDMOTHER,
      RelationType.PATERNAL_UNCLE_FULL,
      RelationType.PATERNAL_UNCLE_PATERNAL,
      RelationType.PATERNAL_AUNT,
      RelationType.MATERNAL_UNCLE,
      RelationType.MATERNAL_AUNT,
      RelationType.OTHER,
    ],
  },
];

export function relationLabel(relation: RelationType, locale: Locale) {
  return RELATION_LABELS[locale][relation] ?? relation;
}

export function getGenderFromRelation(relation: RelationType): Gender {
  const femaleRelations = new Set<RelationType>([
    RelationType.MOTHER,
    RelationType.WIFE,
    RelationType.DAUGHTER,
    RelationType.DAUGHTER_OF_SON,
    RelationType.SISTER,
    RelationType.FULL_SISTER,
    RelationType.PATERNAL_SISTER,
    RelationType.MATERNAL_SISTER,
    RelationType.PATERNAL_GRANDMOTHER,
    RelationType.MATERNAL_GRANDMOTHER,
    RelationType.PATERNAL_AUNT,
    RelationType.MATERNAL_AUNT,
  ]);

  return femaleRelations.has(relation) ? Gender.FEMALE : Gender.MALE;
}

export function isDirectChildRelation(relation: RelationType) {
  return relation === RelationType.SON || relation === RelationType.DAUGHTER;
}

export function isSpouseRelation(relation: RelationType) {
  return relation === RelationType.HUSBAND || relation === RelationType.WIFE;
}

export function isGrandchildRelation(relation: RelationType) {
  return (
    relation === RelationType.SON_OF_SON ||
    relation === RelationType.DAUGHTER_OF_SON
  );
}

export function relationTone(relation?: RelationType) {
  if (!relation) return "neutral";
  if (isSpouseRelation(relation)) return "amber";
  if (
    relation === RelationType.FATHER ||
    relation === RelationType.MOTHER ||
    relation.includes("GRAND")
  ) {
    return "emerald";
  }
  if (isDirectChildRelation(relation) || isGrandchildRelation(relation)) {
    return "blue";
  }
  if (relation.includes("BROTHER") || relation.includes("SISTER")) {
    return "violet";
  }
  if (relation.includes("UNCLE") || relation.includes("AUNT")) {
    return "orange";
  }
  return "neutral";
}
