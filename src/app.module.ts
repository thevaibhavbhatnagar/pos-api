import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './auth/auth.module';
import { RoleModule } from './role/role.module';
import { BranchModule } from './branch/branch.module';
import { DeletionGuardModule } from './common/deletion-guard/deletion-guard.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [PrismaModule, AuthModule, RoleModule, BranchModule,UserModule,DeletionGuardModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
