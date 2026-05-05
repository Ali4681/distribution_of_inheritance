import { PartialType } from '@nestjs/mapped-types';
import { CreateHeirDto } from './create-heir.dto';

export class UpdateHeirDto extends PartialType(CreateHeirDto) {}
