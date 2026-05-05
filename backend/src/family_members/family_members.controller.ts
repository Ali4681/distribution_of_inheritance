import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthUser } from '../auth/auth-user';
import { JwtAuthGuard } from '../auth/guard/jwt.guard';
import { CreateFamilyMemberDto } from './dto/create-family_member.dto';
import { UpdateFamilyMemberDto } from './dto/update-family_member.dto';
import { FamilyMembersService } from './family_members.service';

@Controller('family-members')
@UseGuards(JwtAuthGuard)
export class FamilyMembersController {
  constructor(private readonly familyMembersService: FamilyMembersService) {}

  @Post()
  create(
    @Body() createFamilyMemberDto: CreateFamilyMemberDto,
    @Req() request: Request & { user: AuthUser },
  ) {
    return this.familyMembersService.create(
      createFamilyMemberDto,
      request.user,
    );
  }

  @Get()
  findAll(
    @Req() request: Request & { user: AuthUser },
    @Query('caseId') caseId?: string,
  ) {
    return this.familyMembersService.findAll(request.user, caseId);
  }

  @Get('tree/:caseId')
  getTree(
    @Param('caseId') caseId: string,
    @Req() request: Request & { user: AuthUser },
  ) {
    return this.familyMembersService.getTree(request.user, caseId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() request: Request & { user: AuthUser },
  ) {
    return this.familyMembersService.findOne(id, request.user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateFamilyMemberDto: UpdateFamilyMemberDto,
    @Req() request: Request & { user: AuthUser },
  ) {
    return this.familyMembersService.update(
      id,
      updateFamilyMemberDto,
      request.user,
    );
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() request: Request & { user: AuthUser },
  ) {
    return this.familyMembersService.remove(id, request.user);
  }
}
