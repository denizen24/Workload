import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query
} from "@nestjs/common";

import { AuthUser } from "../auth/types/auth-user.type";
import { CurrentUser } from "../common/decorators/current-user.decorator";

import { CreateSnapshotDto } from "./dto/create-snapshot.dto";
import { FindSnapshotsQueryDto } from "./dto/find-snapshots-query.dto";
import { UpdateSnapshotDto } from "./dto/update-snapshot.dto";
import { SnapshotsService } from "./snapshots.service";

@Controller("api/snapshots")
export class SnapshotsController {
  constructor(private readonly snapshotsService: SnapshotsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: FindSnapshotsQueryDto) {
    return this.snapshotsService.findAll(user.userId, query.sprintId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSnapshotDto) {
    return this.snapshotsService.create(user.userId, dto);
  }

  @Get(":id")
  findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.snapshotsService.findOne(user.userId, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateSnapshotDto
  ) {
    return this.snapshotsService.update(user.userId, id, dto);
  }

  @Patch(":id/activate")
  activate(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.snapshotsService.activate(user.userId, id);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.snapshotsService.remove(user.userId, id);
  }
}
