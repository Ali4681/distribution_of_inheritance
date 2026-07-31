import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsNotEmpty,
  Min,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

export class CreatePropertyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  totalShares?: number;
}

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePropertyDto)
  @IsOptional()
  properties?: CreatePropertyDto[];
}
