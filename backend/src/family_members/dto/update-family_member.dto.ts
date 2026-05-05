import { PartialType } from '@nestjs/mapped-types';
import { CreateFamilyMemberDto } from './create-family_member.dto';

export class UpdateFamilyMemberDto extends PartialType(CreateFamilyMemberDto) {}
