import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCaseDto {
  @IsString()
  deceasedName!: string;

  @IsDateString()
  deathDate!: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  totalEstate!: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  funeralCosts?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  debts?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  mandatoryWill?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  optionalWill?: number;
}
