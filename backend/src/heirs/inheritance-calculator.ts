import { BlockType, FamilyMember, Gender, RelationType } from '@prisma/client';

type ShareResult = {
  member: FamilyMember;
  isEligible: boolean;
  share: number;
  shareFraction?: string;
  legalBasis: string;
  blockedByMemberId?: string;
  blockReason?: string;
  blockType?: BlockType;
};

type ResultMap = Map<string, ShareResult>;
type ResiduaryShare = {
  member: FamilyMember;
  units: number;
  reason: string;
};

class Fraction {
  static zero = new Fraction(0, 1);
  static one = new Fraction(1, 1);

  readonly numerator: number;
  readonly denominator: number;

  constructor(numerator: number, denominator = 1) {
    if (denominator === 0) {
      throw new Error('Fraction denominator cannot be zero');
    }

    const sign = denominator < 0 ? -1 : 1;
    const divisor = Fraction.gcd(Math.abs(numerator), Math.abs(denominator));
    this.numerator = (sign * numerator) / divisor;
    this.denominator = Math.abs(denominator) / divisor;
  }

  add(other: Fraction) {
    return new Fraction(
      this.numerator * other.denominator + other.numerator * this.denominator,
      this.denominator * other.denominator,
    );
  }

  subtract(other: Fraction) {
    return this.add(new Fraction(-other.numerator, other.denominator));
  }

  multiply(other: Fraction | number) {
    const value = typeof other === 'number' ? new Fraction(other, 1) : other;
    return new Fraction(
      this.numerator * value.numerator,
      this.denominator * value.denominator,
    );
  }

  divide(other: Fraction | number) {
    const value = typeof other === 'number' ? new Fraction(other, 1) : other;
    return new Fraction(
      this.numerator * value.denominator,
      this.denominator * value.numerator,
    );
  }

  gt(other: Fraction) {
    return (
      this.numerator * other.denominator > other.numerator * this.denominator
    );
  }

  gte(other: Fraction) {
    return (
      this.numerator * other.denominator >= other.numerator * this.denominator
    );
  }

  isZero() {
    return this.numerator === 0;
  }

  toNumber() {
    return this.numerator / this.denominator;
  }

  toString() {
    if (this.numerator === 0) return '0';
    if (this.denominator === 1) return `${this.numerator}`;
    return `${this.numerator}/${this.denominator}`;
  }

  private static gcd(left: number, right: number): number {
    while (right !== 0) {
      const remainder = left % right;
      left = right;
      right = remainder;
    }

    return left || 1;
  }
}

const LEGACY_FULL_BROTHERS = new Set<RelationType>([
  RelationType.BROTHER,
  RelationType.FULL_BROTHER,
]);

const LEGACY_FULL_SISTERS = new Set<RelationType>([
  RelationType.SISTER,
  RelationType.FULL_SISTER,
]);

const DHU_AL_ARHAM = new Set<RelationType>([
  RelationType.MATERNAL_GRANDFATHER,
  RelationType.PATERNAL_AUNT,
  RelationType.MATERNAL_UNCLE,
  RelationType.MATERNAL_AUNT,
  RelationType.OTHER,
]);

export class InheritanceCalculator {
  private readonly fractions = new Map<string, Fraction>();
  private readonly bases = new Map<string, string[]>();
  private readonly residuaryMemberIds = new Set<string>();

  calculate(members: FamilyMember[], totalEstate: number): ShareResult[] {
    this.fractions.clear();
    this.bases.clear();
    this.residuaryMemberIds.clear();

    const results = this.initializeResults(members);
    const candidates = members.filter(
      (member) => results.get(member.id)?.isEligible,
    );

    const group = (relationType: RelationType) =>
      candidates.filter((member) => member.relationType === relationType);
    const groups = {
      father: group(RelationType.FATHER)[0],
      mother: group(RelationType.MOTHER)[0],
      husbands: group(RelationType.HUSBAND),
      wives: group(RelationType.WIFE),
      sons: group(RelationType.SON),
      daughters: group(RelationType.DAUGHTER),
      sonsOfSon: group(RelationType.SON_OF_SON),
      daughtersOfSon: group(RelationType.DAUGHTER_OF_SON),
      fullBrothers: candidates.filter((member) =>
        LEGACY_FULL_BROTHERS.has(member.relationType),
      ),
      fullSisters: candidates.filter((member) =>
        LEGACY_FULL_SISTERS.has(member.relationType),
      ),
      paternalBrothers: group(RelationType.PATERNAL_BROTHER),
      paternalSisters: group(RelationType.PATERNAL_SISTER),
      maternalSiblings: [
        ...group(RelationType.MATERNAL_BROTHER),
        ...group(RelationType.MATERNAL_SISTER),
      ],
      paternalGrandfather: group(RelationType.PATERNAL_GRANDFATHER)[0],
      paternalGrandmothers: group(RelationType.PATERNAL_GRANDMOTHER),
      maternalGrandmothers: group(RelationType.MATERNAL_GRANDMOTHER),
      agnaticUncles: [
        ...group(RelationType.PATERNAL_UNCLE),
        ...group(RelationType.PATERNAL_UNCLE_FULL),
        ...group(RelationType.PATERNAL_UNCLE_PATERNAL),
      ],
      dhuAlArham: candidates.filter((member) =>
        DHU_AL_ARHAM.has(member.relationType),
      ),
    };

    const hasFarDescendant =
      groups.sons.length +
        groups.daughters.length +
        groups.sonsOfSon.length +
        groups.daughtersOfSon.length >
      0;
    const hasMaleDescendant = groups.sons.length + groups.sonsOfSon.length > 0;
    const siblingCount =
      groups.fullBrothers.length +
      groups.fullSisters.length +
      groups.paternalBrothers.length +
      groups.paternalSisters.length +
      groups.maternalSiblings.length;

    this.applyBlocking(results, groups, hasFarDescendant, hasMaleDescendant);
    this.applyFixedShares(results, groups, hasFarDescendant, siblingCount);
    this.applyResiduaries(results, groups, hasFarDescendant);
    this.applyAwlOrRadd(results, groups);
    this.applyDhuAlArhamIfNeeded(results, groups.dhuAlArham);
    this.finishResults(results, totalEstate);

    return [...results.values()];
  }

  toFraction(value: number) {
    if (value <= 0) {
      return '0';
    }

    return new Fraction(Math.round(value * 1_000_000), 1_000_000).toString();
  }

  private initializeResults(members: FamilyMember[]) {
    const results: ResultMap = new Map();

    for (const member of members) {
      const impediment = this.getImpediment(member);
      results.set(member.id, {
        member,
        isEligible: !impediment,
        share: 0,
        legalBasis:
          impediment ??
          'Qualified for inheritance analysis under Syrian Personal Status Law',
      });
    }

    return results;
  }

  private applyBlocking(
    results: ResultMap,
    groups: ReturnType<InheritanceCalculator['buildGroupsForTyping']>,
    hasFarDescendant: boolean,
    hasMaleDescendant: boolean,
  ) {
    if (groups.father && groups.paternalGrandfather) {
      this.blockOne(
        results,
        groups.paternalGrandfather,
        groups.father,
        'Article 275/276: father is closer than paternal grandfather',
      );
    }

    if (groups.mother) {
      this.blockMany(
        results,
        [...groups.paternalGrandmothers, ...groups.maternalGrandmothers],
        groups.mother,
        'Article 283: grandmothers are blocked by the mother',
      );
    }
    if (groups.father) {
      this.blockMany(
        results,
        groups.paternalGrandmothers,
        groups.father,
        'Article 283: paternal grandmother is blocked by the father',
      );
    }

    const ascendantBlocker = groups.father ?? groups.paternalGrandfather;
    const descendantBlocker = groups.sons[0] ?? groups.sonsOfSon[0];
    const strongBlocker = ascendantBlocker ?? descendantBlocker;

    this.blockMany(
      results,
      groups.maternalSiblings,
      strongBlocker,
      'Article 284: maternal siblings are blocked by father, paternal grandfather, child, or son of son',
    );
    this.blockMany(
      results,
      groups.fullBrothers,
      groups.father ?? descendantBlocker,
      'Article 286 by analogy with Article 275: full brothers are blocked by father or male descendant',
    );
    this.blockMany(
      results,
      groups.fullSisters,
      groups.father ?? descendantBlocker,
      'Article 286: full sisters are blocked by father, son, or son of son',
    );
    this.blockMany(
      results,
      [...groups.paternalBrothers, ...groups.paternalSisters],
      groups.father ?? descendantBlocker ?? groups.fullBrothers[0],
      'Article 287 and Article 276: paternal siblings are blocked by father, male descendant, or stronger full brother',
    );

    const fullSistersAsResiduary =
      groups.fullSisters.some((sister) => this.isOpen(results, sister)) &&
      !groups.fullBrothers.some((brother) => this.isOpen(results, brother)) &&
      !groups.father &&
      !hasMaleDescendant &&
      hasFarDescendant;
    if (fullSistersAsResiduary) {
      this.blockMany(
        results,
        [...groups.paternalBrothers, ...groups.paternalSisters],
        groups.fullSisters[0],
        'Article 278/287: full sister as residuary with female descendants blocks paternal siblings',
      );
    }

    const paternalSistersWithoutBrother = groups.paternalSisters.filter(
      (member) => this.isOpen(results, member),
    );
    if (
      groups.fullSisters.filter((member) => this.isOpen(results, member))
        .length >= 2 &&
      !groups.paternalBrothers.some((member) => this.isOpen(results, member))
    ) {
      this.blockMany(
        results,
        paternalSistersWithoutBrother,
        groups.fullSisters[0],
        'Article 287: two full sisters block paternal sisters unless a paternal brother makes them residuary',
      );
    }

    if (groups.sons.length) {
      this.blockMany(
        results,
        [...groups.sonsOfSon, ...groups.daughtersOfSon],
        groups.sons[0],
        'Article 275/276: son blocks lower descendants through sons',
      );
    }
    if (
      groups.daughters.length >= 2 &&
      !groups.sonsOfSon.some((member) => this.isOpen(results, member))
    ) {
      this.blockMany(
        results,
        groups.daughtersOfSon,
        groups.daughters[0],
        'Article 285: two daughters block daughters of son unless a son of son makes them residuary',
      );
    }

    const closerAsaba =
      groups.sons[0] ??
      groups.sonsOfSon[0] ??
      groups.father ??
      groups.paternalGrandfather ??
      groups.fullBrothers[0] ??
      groups.paternalBrothers[0];
    this.blockMany(
      results,
      groups.agnaticUncles,
      closerAsaba,
      'Articles 275/276: nearer residuary heir blocks agnatic uncles',
    );
  }

  private applyFixedShares(
    results: ResultMap,
    groups: ReturnType<InheritanceCalculator['buildGroupsForTyping']>,
    hasFarDescendant: boolean,
    siblingCount: number,
  ) {
    this.addGroupFixed(
      results,
      groups.husbands,
      hasFarDescendant ? new Fraction(1, 4) : new Fraction(1, 2),
      'Article 268: husband fixed share',
    );
    this.addGroupFixed(
      results,
      groups.wives,
      hasFarDescendant ? new Fraction(1, 8) : new Fraction(1, 4),
      'Article 268: wife fixed share, shared equally if multiple wives',
    );

    const fatherOnlyWithSpouseAndMother =
      groups.mother &&
      groups.father &&
      !hasFarDescendant &&
      siblingCount === 0 &&
      groups.husbands.length + groups.wives.length === 1 &&
      this.openCount(results, [
        groups.father,
        groups.mother,
        ...groups.husbands,
        ...groups.wives,
      ]) === 3;

    if (groups.mother && this.isOpen(results, groups.mother)) {
      if (fatherOnlyWithSpouseAndMother) {
        this.addBasis(
          groups.mother,
          'Article 271: mother takes one third of what remains after spouse in the two Umariyyatayn cases',
        );
      } else {
        this.addFixed(
          groups.mother,
          hasFarDescendant || siblingCount >= 2
            ? new Fraction(1, 6)
            : new Fraction(1, 3),
          'Article 271: mother fixed share',
        );
      }
    }

    if (
      groups.father &&
      this.isOpen(results, groups.father) &&
      hasFarDescendant
    ) {
      this.addFixed(
        groups.father,
        new Fraction(1, 6),
        'Article 266: father receives one sixth with descendants',
      );
    }

    if (
      !groups.father &&
      groups.paternalGrandfather &&
      this.isOpen(results, groups.paternalGrandfather) &&
      hasFarDescendant
    ) {
      this.addFixed(
        groups.paternalGrandfather,
        new Fraction(1, 6),
        'Article 266: paternal grandfather receives one sixth when father is absent and descendants exist',
      );
    }

    const openGrandmothers = [
      ...groups.paternalGrandmothers,
      ...groups.maternalGrandmothers,
    ].filter((member) => this.isOpen(results, member));
    this.addGroupFixed(
      results,
      openGrandmothers,
      new Fraction(1, 6),
      'Article 272: fixed grandmothers share one sixth equally',
    );

    this.addDaughterFixedShares(results, groups);
    this.addSiblingFixedShares(results, groups, hasFarDescendant);
  }

  private addDaughterFixedShares(
    results: ResultMap,
    groups: ReturnType<InheritanceCalculator['buildGroupsForTyping']>,
  ) {
    const openDaughters = groups.daughters.filter((member) =>
      this.isOpen(results, member),
    );
    const openSons = groups.sons.filter((member) =>
      this.isOpen(results, member),
    );
    if (!openSons.length) {
      if (openDaughters.length === 1) {
        this.addFixed(
          openDaughters[0],
          new Fraction(1, 2),
          'Article 269: one daughter receives one half',
        );
      } else if (openDaughters.length > 1) {
        this.addGroupFixed(
          results,
          openDaughters,
          new Fraction(2, 3),
          'Article 269: multiple daughters share two thirds',
        );
      }
    }

    const openSonsOfSon = groups.sonsOfSon.filter((member) =>
      this.isOpen(results, member),
    );
    const openDaughtersOfSon = groups.daughtersOfSon.filter((member) =>
      this.isOpen(results, member),
    );
    if (!openSons.length && !openSonsOfSon.length) {
      if (openDaughters.length === 0) {
        if (openDaughtersOfSon.length === 1) {
          this.addFixed(
            openDaughtersOfSon[0],
            new Fraction(1, 2),
            'Article 269: one daughter of son receives one half when no daughter exists',
          );
        } else if (openDaughtersOfSon.length > 1) {
          this.addGroupFixed(
            results,
            openDaughtersOfSon,
            new Fraction(2, 3),
            'Article 269: daughters of son share two thirds when no daughter exists',
          );
        }
      } else if (openDaughters.length === 1 && openDaughtersOfSon.length) {
        this.addGroupFixed(
          results,
          openDaughtersOfSon,
          new Fraction(1, 6),
          'Article 269: daughters of son share one sixth with one daughter',
        );
      }
    }
  }

  private addSiblingFixedShares(
    results: ResultMap,
    groups: ReturnType<InheritanceCalculator['buildGroupsForTyping']>,
    hasFarDescendant: boolean,
  ) {
    const openMaternalSiblings = groups.maternalSiblings.filter((member) =>
      this.isOpen(results, member),
    );
    if (openMaternalSiblings.length === 1) {
      this.addFixed(
        openMaternalSiblings[0],
        new Fraction(1, 6),
        'Article 267: one maternal sibling receives one sixth',
      );
    } else if (openMaternalSiblings.length > 1) {
      this.addGroupFixed(
        results,
        openMaternalSiblings,
        new Fraction(1, 3),
        'Article 267: multiple maternal siblings share one third equally',
      );
    }

    if (hasFarDescendant || groups.father || groups.paternalGrandfather) {
      return;
    }

    const openFullBrothers = groups.fullBrothers.filter((member) =>
      this.isOpen(results, member),
    );
    const openFullSisters = groups.fullSisters.filter((member) =>
      this.isOpen(results, member),
    );
    if (!openFullBrothers.length) {
      if (openFullSisters.length === 1) {
        this.addFixed(
          openFullSisters[0],
          new Fraction(1, 2),
          'Article 270: one full sister receives one half',
        );
      } else if (openFullSisters.length > 1) {
        this.addGroupFixed(
          results,
          openFullSisters,
          new Fraction(2, 3),
          'Article 270: multiple full sisters share two thirds',
        );
      }
    }

    const openPaternalBrothers = groups.paternalBrothers.filter((member) =>
      this.isOpen(results, member),
    );
    const openPaternalSisters = groups.paternalSisters.filter((member) =>
      this.isOpen(results, member),
    );
    if (!openPaternalBrothers.length) {
      if (!openFullSisters.length) {
        if (openPaternalSisters.length === 1) {
          this.addFixed(
            openPaternalSisters[0],
            new Fraction(1, 2),
            'Article 270: one paternal sister receives one half when no full sister exists',
          );
        } else if (openPaternalSisters.length > 1) {
          this.addGroupFixed(
            results,
            openPaternalSisters,
            new Fraction(2, 3),
            'Article 270: paternal sisters share two thirds when no full sister exists',
          );
        }
      } else if (openFullSisters.length === 1 && openPaternalSisters.length) {
        this.addGroupFixed(
          results,
          openPaternalSisters,
          new Fraction(1, 6),
          'Article 270: paternal sisters share one sixth with one full sister',
        );
      }
    }
  }

  private applyResiduaries(
    results: ResultMap,
    groups: ReturnType<InheritanceCalculator['buildGroupsForTyping']>,
    hasFarDescendant: boolean,
  ) {
    const explicitResiduaries = this.chooseResiduaries(
      results,
      groups,
      hasFarDescendant,
    );
    const fixedTotal = this.totalFractions();
    let residue = Fraction.one.subtract(fixedTotal);

    if (!residue.gt(Fraction.zero)) {
      return;
    }

    if (
      groups.mother &&
      this.bases
        .get(groups.mother.id)
        ?.some((basis) => basis.includes('Umariyyatayn'))
    ) {
      const spouseShare = [...groups.husbands, ...groups.wives]
        .map((member) => this.getFraction(member))
        .reduce((sum, value) => sum.add(value), Fraction.zero);
      const motherShare = Fraction.one.subtract(spouseShare).divide(3);
      this.addFixed(
        groups.mother,
        motherShare,
        'Article 271: one third of remainder after spouse',
      );
      residue = Fraction.one.subtract(this.totalFractions());
    }

    if (!residue.gt(Fraction.zero)) {
      return;
    }

    if (!explicitResiduaries.length) {
      return;
    }

    const unitsTotal = explicitResiduaries.reduce(
      (sum, item) => sum + item.units,
      0,
    );
    for (const item of explicitResiduaries) {
      this.addFixed(
        item.member,
        residue.multiply(new Fraction(item.units, unitsTotal)),
        item.reason,
      );
      this.residuaryMemberIds.add(item.member.id);
    }
  }

  private chooseResiduaries(
    results: ResultMap,
    groups: ReturnType<InheritanceCalculator['buildGroupsForTyping']>,
    hasFarDescendant: boolean,
  ): ResiduaryShare[] {
    const asaba = (members: FamilyMember[], units: number, reason: string) =>
      members
        .filter((member) => this.isOpen(results, member))
        .map((member) => ({ member, units, reason }));

    const sons = groups.sons.filter((member) => this.isOpen(results, member));
    if (sons.length) {
      return [
        ...asaba(
          groups.sons,
          2,
          'Articles 274/277: sons inherit residue; male gets twice female',
        ),
        ...asaba(
          groups.daughters,
          1,
          'Articles 274/277: daughters inherit residue with sons',
        ),
      ];
    }

    const sonsOfSon = groups.sonsOfSon.filter((member) =>
      this.isOpen(results, member),
    );
    if (sonsOfSon.length) {
      return [
        ...asaba(
          groups.sonsOfSon,
          2,
          'Articles 274/277: sons of son inherit residue when no son exists',
        ),
        ...asaba(
          groups.daughtersOfSon,
          1,
          'Articles 274/277: daughters of son inherit residue with sons of son',
        ),
      ];
    }

    if (groups.father && this.isOpen(results, groups.father)) {
      return [
        {
          member: groups.father,
          units: 1,
          reason: hasFarDescendant
            ? 'Article 280: father receives one sixth plus residue with female descendants'
            : 'Articles 274/275: father inherits residue when no descendants exist',
        },
      ];
    }

    if (
      groups.paternalGrandfather &&
      this.isOpen(results, groups.paternalGrandfather)
    ) {
      return this.chooseGrandfatherResiduary(results, groups);
    }

    const femaleDescendants =
      groups.daughters.some((member) => this.isOpen(results, member)) ||
      groups.daughtersOfSon.some((member) => this.isOpen(results, member));

    const fullBrothers = groups.fullBrothers.filter((member) =>
      this.isOpen(results, member),
    );
    if (fullBrothers.length) {
      return [
        ...asaba(
          groups.fullBrothers,
          2,
          'Articles 274/277: full brothers inherit residue',
        ),
        ...asaba(
          groups.fullSisters,
          1,
          'Articles 274/277: full sisters inherit residue with full brothers',
        ),
      ];
    }
    const fullSisters = groups.fullSisters.filter((member) =>
      this.isOpen(results, member),
    );
    if (femaleDescendants && fullSisters.length) {
      return asaba(
        groups.fullSisters,
        1,
        'Article 278: full sisters inherit residue with female descendants',
      );
    }

    const paternalBrothers = groups.paternalBrothers.filter((member) =>
      this.isOpen(results, member),
    );
    if (paternalBrothers.length) {
      return [
        ...asaba(
          groups.paternalBrothers,
          2,
          'Articles 274/277: paternal brothers inherit residue',
        ),
        ...asaba(
          groups.paternalSisters,
          1,
          'Articles 274/277: paternal sisters inherit residue with paternal brothers',
        ),
      ];
    }
    const paternalSisters = groups.paternalSisters.filter((member) =>
      this.isOpen(results, member),
    );
    if (femaleDescendants && paternalSisters.length) {
      return asaba(
        groups.paternalSisters,
        1,
        'Article 278: paternal sisters inherit residue with female descendants',
      );
    }

    const fullUncles = groups.agnaticUncles.filter(
      (member) =>
        this.isOpen(results, member) &&
        member.relationType !== RelationType.PATERNAL_UNCLE_PATERNAL,
    );
    if (fullUncles.length) {
      return asaba(
        fullUncles,
        1,
        'Articles 274/275/276: full paternal uncles inherit residue after closer residuaries',
      );
    }

    const paternalUncles = groups.agnaticUncles.filter(
      (member) =>
        this.isOpen(results, member) &&
        member.relationType === RelationType.PATERNAL_UNCLE_PATERNAL,
    );
    return asaba(
      paternalUncles,
      1,
      'Articles 274/275/276: paternal uncles inherit residue after stronger uncles',
    );
  }

  private chooseGrandfatherResiduary(
    results: ResultMap,
    groups: ReturnType<InheritanceCalculator['buildGroupsForTyping']>,
  ): ResiduaryShare[] {
    const grandfather = groups.paternalGrandfather;
    if (!grandfather) {
      return [];
    }

    const siblings = [
      ...groups.fullBrothers,
      ...groups.fullSisters,
      ...groups.paternalBrothers,
      ...groups.paternalSisters,
    ].filter((member) => this.isOpen(results, member));

    if (!siblings.length) {
      return [
        {
          member: grandfather,
          units: 1,
          reason:
            'Articles 274/275: paternal grandfather inherits residue when father is absent',
        },
      ];
    }

    const currentFixedTotal = this.totalFractions();
    const residue = Fraction.one.subtract(currentFixedTotal);
    const siblingUnits = siblings.reduce((sum, member) => {
      return sum + (member.gender === Gender.MALE ? 2 : 1);
    }, 0);
    const muqasama = residue.multiply(new Fraction(2, siblingUnits + 2));
    const third = new Fraction(1, 3);

    if (third.gte(muqasama)) {
      this.addFixed(
        grandfather,
        third,
        'Article 279: paternal grandfather receives one third when sharing with siblings would reduce him below one third',
      );
      return this.chooseSiblingResiduariesWithGrandfather(results, groups);
    }

    return [
      {
        member: grandfather,
        units: 2,
        reason:
          'Article 279: paternal grandfather shares with siblings as a brother',
      },
      ...siblings.map((member) => ({
        member,
        units: member.gender === Gender.MALE ? 2 : 1,
        reason: 'Article 279: siblings share with paternal grandfather',
      })),
    ];
  }

  private chooseSiblingResiduariesWithGrandfather(
    results: ResultMap,
    groups: ReturnType<InheritanceCalculator['buildGroupsForTyping']>,
  ): ResiduaryShare[] {
    const siblings = [
      ...groups.fullBrothers,
      ...groups.fullSisters,
      ...groups.paternalBrothers,
      ...groups.paternalSisters,
    ].filter((member) => this.isOpen(results, member));

    return siblings.map((member) => ({
      member,
      units: member.gender === Gender.MALE ? 2 : 1,
      reason:
        'Article 279: siblings receive residue after paternal grandfather minimum share',
    }));
  }

  private applyAwlOrRadd(
    results: ResultMap,
    groups: ReturnType<InheritanceCalculator['buildGroupsForTyping']>,
  ) {
    const total = this.totalFractions();
    if (total.gt(Fraction.one)) {
      for (const [memberId, share] of this.fractions) {
        this.fractions.set(memberId, share.divide(total));
        const member = results.get(memberId)?.member;
        if (member)
          this.addBasis(
            member,
            'Article 273: shares reduced proportionally by awl because fixed shares exceed estate',
          );
      }
      return;
    }

    const residue = Fraction.one.subtract(total);
    if (residue.isZero() || this.residuaryMemberIds.size > 0) {
      return;
    }

    const nonSpouseFixed = [...this.fractions.keys()].filter((memberId) => {
      const relation = results.get(memberId)?.member.relationType;
      return (
        relation !== RelationType.HUSBAND && relation !== RelationType.WIFE
      );
    });

    if (nonSpouseFixed.length) {
      const baseTotal = nonSpouseFixed.reduce(
        (sum, memberId) =>
          sum.add(this.fractions.get(memberId) ?? Fraction.zero),
        Fraction.zero,
      );
      for (const memberId of nonSpouseFixed) {
        const current = this.fractions.get(memberId) ?? Fraction.zero;
        this.fractions.set(
          memberId,
          current.add(residue.multiply(current.divide(baseTotal))),
        );
        const member = results.get(memberId)?.member;
        if (member)
          this.addBasis(
            member,
            'Article 288: residue returned to non-spouse fixed heirs proportionally',
          );
      }
      return;
    }

    if (groups.dhuAlArham.some((member) => this.isOpen(results, member))) {
      return;
    }

    const spouseFixed = [...this.fractions.keys()].filter((memberId) => {
      const relation = results.get(memberId)?.member.relationType;
      return (
        relation === RelationType.HUSBAND || relation === RelationType.WIFE
      );
    });
    if (spouseFixed.length) {
      const baseTotal = spouseFixed.reduce(
        (sum, memberId) =>
          sum.add(this.fractions.get(memberId) ?? Fraction.zero),
        Fraction.zero,
      );
      for (const memberId of spouseFixed) {
        const current = this.fractions.get(memberId) ?? Fraction.zero;
        this.fractions.set(
          memberId,
          current.add(residue.multiply(current.divide(baseTotal))),
        );
        const member = results.get(memberId)?.member;
        if (member)
          this.addBasis(
            member,
            'Article 288: spouse receives residue when no residuary, fixed relative, or uterine relative exists',
          );
      }
    }
  }

  private applyDhuAlArhamIfNeeded(
    results: ResultMap,
    dhuAlArham: FamilyMember[],
  ) {
    const total = this.totalFractions();
    if (!Fraction.one.subtract(total).gt(Fraction.zero)) {
      return;
    }

    const open = dhuAlArham.filter((member) => this.isOpen(results, member));
    if (!open.length) {
      return;
    }

    const chosenClass = Math.min(
      ...open.map((member) => this.dhuAlArhamClass(member)),
    );
    const selected = open.filter(
      (member) => this.dhuAlArhamClass(member) === chosenClass,
    );
    const units = selected.reduce(
      (sum, member) => sum + (member.gender === Gender.MALE ? 2 : 1),
      0,
    );

    for (const member of selected) {
      this.addFixed(
        member,
        Fraction.one
          .subtract(total)
          .multiply(new Fraction(member.gender === Gender.MALE ? 2 : 1, units)),
        'Articles 289-297: uterine relatives receive remaining estate when no residuary or return-eligible fixed heir takes it; male receives twice female',
      );
    }

    this.blockMany(
      results,
      open.filter((member) => !selected.includes(member)),
      selected[0],
      'Articles 290-297: nearer class of uterine relatives blocks later classes',
    );
  }

  private finishResults(results: ResultMap, totalEstate: number) {
    for (const [memberId, fraction] of this.fractions) {
      const result = results.get(memberId);
      if (!result) continue;

      result.share = this.roundShare(fraction.toNumber());
      result.shareFraction = fraction.toString();
      result.isEligible = result.share > 0;
      result.legalBasis = [
        ...(this.bases.get(memberId) ?? []),
        `final fraction ${fraction.toString()}`,
        `amount ${this.money(result.share * totalEstate)}`,
      ].join('; ');
    }

    for (const result of results.values()) {
      if (result.isEligible && result.share === 0) {
        result.isEligible = false;
        result.legalBasis = `${result.legalBasis}; no distributable share after applying Syrian inheritance priority, awl, radd, and blocking rules`;
      }
    }
  }

  private getImpediment(member: FamilyMember) {
    if (!member.isAlive)
      return 'Article 260: heir must be alive at death of the deceased';
    if (!member.isMuslim)
      return 'Article 264: difference of religion prevents inheritance between Muslim and non-Muslim';
    if (member.isMurderer)
      return 'Articles 223/264: intentional killing prevents inheritance';
    return null;
  }

  private addFixed(member: FamilyMember, share: Fraction, basis: string) {
    if (share.isZero()) return;
    this.fractions.set(member.id, this.getFraction(member).add(share));
    this.addBasis(member, basis);
  }

  private addGroupFixed(
    results: ResultMap,
    members: FamilyMember[],
    share: Fraction,
    basis: string,
  ) {
    const open = members.filter((member) => this.isOpen(results, member));
    if (!open.length) return;

    const each = share.divide(open.length);
    for (const member of open) {
      this.addFixed(member, each, basis);
    }
  }

  private getFraction(member: FamilyMember) {
    return this.fractions.get(member.id) ?? Fraction.zero;
  }

  private totalFractions() {
    return [...this.fractions.values()].reduce(
      (sum, value) => sum.add(value),
      Fraction.zero,
    );
  }

  private addBasis(member: FamilyMember, basis: string) {
    const current = this.bases.get(member.id) ?? [];
    current.push(basis);
    this.bases.set(member.id, current);
  }

  private blockMany(
    results: ResultMap,
    members: FamilyMember[],
    blocker: FamilyMember | undefined,
    reason: string,
  ) {
    if (!blocker) return;
    for (const member of members) {
      if (member.id !== blocker.id) {
        this.blockOne(results, member, blocker, reason);
      }
    }
  }

  private blockOne(
    results: ResultMap,
    member: FamilyMember,
    blocker: FamilyMember,
    reason: string,
  ) {
    const result = results.get(member.id);
    if (!result || !result.isEligible) return;

    result.isEligible = false;
    result.share = 0;
    result.legalBasis = reason;
    result.blockedByMemberId = blocker.id;
    result.blockReason = reason;
    result.blockType = BlockType.FULL_BLOCK;
  }

  private isOpen(results: ResultMap, member: FamilyMember | undefined) {
    return !!member && !!results.get(member.id)?.isEligible;
  }

  private openCount(results: ResultMap, members: (FamilyMember | undefined)[]) {
    return members.filter((member) => this.isOpen(results, member)).length;
  }

  private hasOpenResiduary(
    results: ResultMap,
    groups: ReturnType<InheritanceCalculator['buildGroupsForTyping']>,
  ) {
    return [
      ...groups.sons,
      ...groups.sonsOfSon,
      groups.father,
      groups.paternalGrandfather,
      ...groups.fullBrothers,
      ...groups.fullSisters,
      ...groups.paternalBrothers,
      ...groups.paternalSisters,
      ...groups.agnaticUncles,
    ].some((member) => this.isOpen(results, member));
  }

  private dhuAlArhamClass(member: FamilyMember) {
    switch (member.relationType) {
      case RelationType.MATERNAL_GRANDFATHER:
        return 2;
      case RelationType.PATERNAL_AUNT:
      case RelationType.MATERNAL_UNCLE:
      case RelationType.MATERNAL_AUNT:
        return 4;
      default:
        return 9;
    }
  }

  private roundShare(value: number) {
    return Math.round(value * 1_000_000) / 1_000_000;
  }

  private money(value: number) {
    return Math.round(value * 100) / 100;
  }

  private buildGroupsForTyping() {
    return {
      father: undefined as FamilyMember | undefined,
      mother: undefined as FamilyMember | undefined,
      husbands: [] as FamilyMember[],
      wives: [] as FamilyMember[],
      sons: [] as FamilyMember[],
      daughters: [] as FamilyMember[],
      sonsOfSon: [] as FamilyMember[],
      daughtersOfSon: [] as FamilyMember[],
      fullBrothers: [] as FamilyMember[],
      fullSisters: [] as FamilyMember[],
      paternalBrothers: [] as FamilyMember[],
      paternalSisters: [] as FamilyMember[],
      maternalSiblings: [] as FamilyMember[],
      paternalGrandfather: undefined as FamilyMember | undefined,
      paternalGrandmothers: [] as FamilyMember[],
      maternalGrandmothers: [] as FamilyMember[],
      agnaticUncles: [] as FamilyMember[],
      dhuAlArham: [] as FamilyMember[],
    };
  }
}
