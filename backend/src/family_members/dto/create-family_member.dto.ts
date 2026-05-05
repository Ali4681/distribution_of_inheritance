import { Gender, RelationType } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateFamilyMemberDto {
  @IsUUID()
  caseId!: string;

  @IsUUID()
  @IsOptional()
  parentId?: string;

  @IsUUID()
  @IsOptional()
  spouseId?: string;

  @IsString()
  fullName!: string;

  @IsEnum(Gender)
  gender!: Gender;

  @IsEnum(RelationType)
  relationType!: RelationType;

  @IsBoolean()
  @IsOptional()
  isAlive?: boolean;

  @IsBoolean()
  @IsOptional()
  isMuslim?: boolean;

  @IsBoolean()
  @IsOptional()
  isMurderer?: boolean;

  @IsDateString()
  @IsOptional()
  birthDate?: string;
}
